import type { PersonaData } from '../lib/api'

type Props = {
  persona: PersonaData
  userName?: string
}

export function PersonaCard({ persona, userName }: Props) {
  return (
    <div
      id="persona-card"
      className="relative rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-6 text-white overflow-hidden"
    >
      {/* Background texture */}
      <div className="absolute inset-0 opacity-10 text-[120px] flex items-center justify-end pr-4 select-none pointer-events-none">
        {persona.icon}
      </div>

      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-4xl">{persona.icon}</span>
          <div>
            {userName && (
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">{userName}</p>
            )}
            <h2 className="text-2xl font-bold leading-tight">{persona.name}</h2>
          </div>
        </div>

        <p className="text-sm text-amber-50 leading-relaxed">{persona.description}</p>

        <p className="text-xs text-amber-200 font-semibold tracking-wide">beerolog.app</p>
      </div>
    </div>
  )
}
