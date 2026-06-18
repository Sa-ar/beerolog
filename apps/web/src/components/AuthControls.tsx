import {
  Show,
  SignInButton,
  UserButton,
} from '@clerk/tanstack-react-start'

export function AuthControls() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  )
}
