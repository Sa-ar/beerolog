"""Orchestrates the rating -> baseline-embedding nudge over the repos.

Pure math lives in taste_feedback.py. `fine`, a missing baseline, or a missing
beer embedding are all no-ops. Re-rating honesty (PRD): the rating row upserts
exactly via the unique constraint, but the embedding contribution is best-effort
and bounded by the per-rating cap — exact dedup waits for the v1.1 recompute.
"""

from __future__ import annotations

from app.config import Settings
from app.services.baseline_taste_repo import BaselineTasteRepo, BaselineTasteSnapshot
from app.services.catalog_repo import BeerEmbeddingRepo
from app.services.ratings_repo import RatingsRepo, RatingValue
from app.services.taste_feedback import apply_batch, apply_rating, effective_lr, rating_signal


class TasteFeedbackService:
    def __init__(
        self,
        *,
        baseline_repo: BaselineTasteRepo,
        beer_embeddings: BeerEmbeddingRepo,
        ratings_repo: RatingsRepo,
        settings: Settings,
    ) -> None:
        self._baseline_repo = baseline_repo
        self._beer_embeddings = beer_embeddings
        self._ratings_repo = ratings_repo
        self._settings = settings

    async def apply(self, *, user_id: str, beer_id: str, rating: RatingValue) -> None:
        """Nudge the user's baseline embedding for one rating. No-op for `fine`."""
        signal = rating_signal(rating)
        if signal == 0:
            return
        snap = await self._baseline_repo.get(user_id)
        if snap is None:
            return  # no seeded baseline yet — nothing to nudge
        beer_embedding = await self._beer_embeddings.get_embedding(beer_id)
        if not beer_embedding:
            return
        count = await self._ratings_repo.count_for_user(user_id)
        s = self._settings
        lr = effective_lr(
            count,
            base_lr=s.nudge_base_lr,
            cold_start_factor=s.nudge_cold_start_factor,
            lr_after_20=s.nudge_lr_after_20,
            lr_after_50=s.nudge_lr_after_50,
        )
        new_embedding = apply_rating(
            snap.embedding,
            beer_embedding,
            signal=signal,
            lr=lr,
            per_rating_cap=s.nudge_per_rating_cap,
        )
        await self._persist(snap, new_embedding)

    async def apply_batch(self, *, user_id: str, ratings: list[tuple[str, RatingValue]]) -> None:
        """Deck path: combine a session's swipes into one nudge from the
        pre-session baseline. `fine` swipes and unknown embeddings are skipped.
        """
        snap = await self._baseline_repo.get(user_id)
        if snap is None:
            return
        targets: list[tuple[list[float], int]] = []
        for beer_id, rating in ratings:
            signal = rating_signal(rating)
            if signal == 0:
                continue
            embedding = await self._beer_embeddings.get_embedding(beer_id)
            if embedding:
                targets.append((embedding, signal))
        if not targets:
            return
        count = await self._ratings_repo.count_for_user(user_id)
        s = self._settings
        lr = effective_lr(
            count,
            base_lr=s.nudge_base_lr,
            cold_start_factor=s.nudge_cold_start_factor,
            lr_after_20=s.nudge_lr_after_20,
            lr_after_50=s.nudge_lr_after_50,
        )
        new_embedding = apply_batch(
            snap.embedding, targets, lr=lr, per_rating_cap=s.nudge_per_rating_cap
        )
        await self._persist(snap, new_embedding)

    async def _persist(self, snap: BaselineTasteSnapshot, embedding: list[float]) -> None:
        await self._baseline_repo.save(
            user_id=snap.user_id,
            bubbles=snap.bubbles,
            bitterness=snap.bitterness,
            sweetness=snap.sweetness,
            body=snap.body,
            abv_affinity=snap.abv_affinity,
            flavor_family=snap.flavor_family,
            novelty_affinity=snap.novelty_affinity,
            embedding=embedding,
            model_version=snap.model_version,
            persona_title_en=snap.persona_title_en,
            persona_blurb_en=snap.persona_blurb_en,
            persona_title_he=snap.persona_title_he,
            persona_blurb_he=snap.persona_blurb_he,
        )
