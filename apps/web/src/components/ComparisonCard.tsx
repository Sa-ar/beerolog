import type { ComparisonResult } from '../lib/api'
import { FLAVOR_VECTOR_DIMENSIONS } from '@beerolog/types'

const DIM_LABELS: Record<string, string> = {
  bitterness: 'Bitterness', sweetness: 'Sweetness', fruitiness: 'Fruitiness',
  roast: 'Roast', sourness: 'Sourness', body: 'Body', adventure: 'Adventure',
}

type Props = { result: ComparisonResult }

export function ComparisonCard({ result }: Props) {
  const pct = Math.round(result.similarity * 100)

  return (
    <div className="flex flex-col gap-5">

      {/* Similarity score */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-6 text-center text-white">
        <p className="text-5xl font-black">{pct}%</p>
        <p className="mt-1 text-sm font-semibold text-amber-100">taste match</p>
        <div className="mt-4 flex justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl">{result.challenger_persona.icon}</p>
            <p className="text-xs text-amber-100">You</p>
            <p className="text-sm font-semibold">{result.challenger_persona.name.replace('The ', '')}</p>
          </div>
          <div className="text-2xl self-center text-amber-200">vs</div>
          <div className="text-center">
            <p className="text-2xl">{result.friend_persona.icon}</p>
            <p className="text-xs text-amber-100">Friend</p>
            <p className="text-sm font-semibold">{result.friend_persona.name.replace('The ', '')}</p>
          </div>
        </div>
      </div>

      {/* Shared */}
      {result.shared.length > 0 && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">❤️ You both agree on</p>
          <div className="flex flex-wrap gap-2">
            {result.shared.map((d) => (
              <span key={d} className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-medium text-green-800">
                {DIM_LABELS[d] ?? d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Different */}
      {result.different.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">⚡ Where you differ</p>
          <div className="flex flex-wrap gap-2">
            {result.different.map((d) => (
              <span key={d} className="rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                {DIM_LABELS[d] ?? d}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
