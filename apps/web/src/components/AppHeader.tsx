import { Link } from '@tanstack/react-router'
import { AuthControls } from './AuthControls'

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-amber-100 bg-white/80 px-4 py-3 backdrop-blur">
      <Link to="/" className="text-lg font-bold text-amber-900">
        🍺 Beerolog
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          to="/session-intent"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900 [&.active]:text-amber-800"
        >
          Find a beer
        </Link>
        <AuthControls />
      </nav>
    </header>
  )
}
