import type { RecommendedBeer } from '../components/RecommendationBeerCard'
import type { AbvIntent } from './session-intent'

export type ScoreBreakdown = {
  baseline_cos?: number
  session_cos?: number
  baseline_score: number
  session_score: number
  abv_score: number
  abv_fits_intent?: boolean | null
  novelty_score: number
  total_score: number
  dominant_component: string
}

export type MatchContributor = {
  // Stable key; the UI resolves it via recommendations.contributors.<key>.
  key: 'taste' | 'mood' | 'abvFit' | 'noveltyBoost' | 'noveltyPenalty'
  percent: number
}

export type MatchCalibration = {
  cos_floor: number
  cos_ceiling: number
}

/** Default anchors — keep in sync with API settings and probe_cosine_calibration. */
export const DEFAULT_MATCH_CALIBRATION: MatchCalibration = {
  cos_floor: 0.2,
  cos_ceiling: 0.5,
}

/** Keep in sync with API settings.match_abv_weight */
export const DEFAULT_MATCH_ABV_WEIGHT = 0.15

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Affine rescale of raw cosine onto 0–100 using fixed population anchors.
 * Not result-set normalization: the same beer always maps to the same %.
 */
export function calibratedAlignmentPercent(
  cos: number,
  calibration: MatchCalibration = DEFAULT_MATCH_CALIBRATION,
): number {
  const { cos_floor, cos_ceiling } = calibration
  if (cos_ceiling <= cos_floor) {
    return Math.round(clamp01(cos) * 100)
  }
  const scaled = clamp01((cos - cos_floor) / (cos_ceiling - cos_floor))
  return Math.round(scaled * 100)
}

function resolveBaselineCos(
  breakdown: ScoreBreakdown,
  alpha: number,
  hasSession: boolean,
): number {
  if (breakdown.baseline_cos != null) return clamp01(breakdown.baseline_cos)
  const weight = hasSession ? alpha : 1
  if (weight <= 0) return 0
  return clamp01(breakdown.baseline_score / weight)
}

function resolveSessionCos(breakdown: ScoreBreakdown, alpha: number, hasSession: boolean): number {
  if (!hasSession) return 0
  if (breakdown.session_cos != null) return clamp01(breakdown.session_cos)
  const weight = 1 - alpha
  if (weight <= 0) return 0
  return clamp01(breakdown.session_score / weight)
}

/** Affine anchors for total_score (cosine + ABV + novelty), derived from cosine anchors. */
export function totalScoreBounds(
  calibration: MatchCalibration,
  options: {
    hasSession: boolean
    abvWeight?: number
    beta: number
  },
): MatchCalibration {
  const { cos_floor, cos_ceiling } = calibration
  const abvWeight = options.hasSession ? (options.abvWeight ?? DEFAULT_MATCH_ABV_WEIGHT) : 0
  const maxNovelty = options.beta * 0.5

  return {
    cos_floor: cos_floor - abvWeight - maxNovelty,
    cos_ceiling: cos_ceiling + abvWeight + maxNovelty,
  }
}

/** User-facing match % for tonight — calibrated total_score (taste + mood + ABV + novelty). */
export function tonightMatchPercent(
  breakdown: ScoreBreakdown,
  hasSession: boolean,
  calibration: MatchCalibration = DEFAULT_MATCH_CALIBRATION,
  beta = 0.3,
): number {
  const bounds = totalScoreBounds(calibration, { hasSession, beta })
  return calibratedAlignmentPercent(breakdown.total_score, bounds)
}

/** User-facing alignment breakdown with calibrated cosine rows. */
export function matchAlignmentPercents(
  breakdown: ScoreBreakdown,
  alpha: number,
  hasSession: boolean,
  abvIntent?: AbvIntent,
  calibration: MatchCalibration = DEFAULT_MATCH_CALIBRATION,
): MatchContributor[] {
  const items: MatchContributor[] = [
    {
      key: 'taste',
      percent: calibratedAlignmentPercent(
        resolveBaselineCos(breakdown, alpha, hasSession),
        calibration,
      ),
    },
  ]

  if (hasSession) {
    items.push({
      key: 'mood',
      percent: calibratedAlignmentPercent(
        resolveSessionCos(breakdown, alpha, hasSession),
        calibration,
      ),
    })
  }

  if (abvIntent && abvIntent !== 'any') {
    const fits =
      breakdown.abv_fits_intent != null ? breakdown.abv_fits_intent : breakdown.abv_score > 0
    items.push({
      key: 'abvFit',
      percent: fits ? 100 : 0,
    })
  }

  const noveltyBoost = Math.round((breakdown.novelty_score / 0.15) * 100)
  if (Math.abs(noveltyBoost) >= 1) {
    items.push({
      key: noveltyBoost >= 0 ? 'noveltyBoost' : 'noveltyPenalty',
      percent: Math.abs(noveltyBoost),
    })
  }

  return items
}

export function normalizeRecommendedBeer(beer: RecommendedBeer): RecommendedBeer {
  const breakdown = beer.breakdown ?? {
    baseline_cos: 0,
    session_cos: 0,
    baseline_score: 0,
    session_score: 0,
    abv_score: 0,
    abv_fits_intent: null,
    novelty_score: 0,
    total_score: 0,
    dominant_component: 'baseline' as const,
  }

  return {
    ...beer,
    breakdown: {
      baseline_cos: breakdown.baseline_cos ?? 0,
      session_cos: breakdown.session_cos ?? 0,
      baseline_score: breakdown.baseline_score ?? 0,
      session_score: breakdown.session_score ?? 0,
      abv_score: breakdown.abv_score ?? 0,
      abv_fits_intent: breakdown.abv_fits_intent ?? null,
      novelty_score: breakdown.novelty_score ?? 0,
      total_score: breakdown.total_score ?? 0,
      dominant_component: breakdown.dominant_component ?? 'baseline',
    },
  }
}
