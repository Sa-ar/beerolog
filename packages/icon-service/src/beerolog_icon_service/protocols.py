from __future__ import annotations

from typing import Protocol

from beerolog_icon_service.models import IconRecord


class IconRepo(Protocol):
    async def find_by_purpose(self, purpose: str) -> IconRecord | None: ...

    async def insert_or_get(
        self, *, purpose: str, description: str, svg_content: str
    ) -> IconRecord: ...

    async def upsert(
        self, *, purpose: str, description: str, svg_content: str
    ) -> IconRecord: ...


class IconGenerator(Protocol):
    async def generate_svg(self, description: str) -> str: ...
