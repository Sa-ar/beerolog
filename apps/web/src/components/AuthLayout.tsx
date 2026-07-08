import type { FormEvent, ReactNode } from 'react'
import { Button, Card, CardContent, Heading } from '@beerolog/ui'
import { useTranslation } from 'react-i18next'
import { PAGE_MAIN } from '../lib/page-shell'

// Clerk flags an instance as development when its publishable key is a test key.
// Same signal Clerk's prebuilt UI uses for its "Development mode" badge.
const isDevelopment = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '').startsWith('pk_test_')

export function clerkError(err: unknown, fallback: string): string {
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }> }
  return e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? fallback
}

export const INPUT_CLASS =
  'h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'

// Official Google "G" mark. Inline so we ship the unaltered four-color logo and
// stay within Google's branding guidelines for sign-in buttons.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

export function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="w-full border-neutral-300 text-neutral-700 hover:bg-neutral-50"
    >
      <GoogleIcon />
      {t('auth.google')}
    </Button>
  )
}

export function AuthDivider() {
  const { t } = useTranslation()
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-400">
      <span className="h-px flex-1 bg-neutral-200" />
      {t('auth.or')}
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  )
}

export function AuthField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      <input className={INPUT_CLASS} {...props} />
    </label>
  )
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
      {message}
    </p>
  )
}

// Centered card shell shared by sign-in and sign-up. Fixes the previous
// left-hugging layout (max-w-md children with no centering inside max-w-3xl).
export function AuthLayout({
  heading,
  subtitle,
  children,
  footer,
  onSubmit,
}: {
  heading: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  onSubmit?: (e: FormEvent) => void
}) {
  const { t } = useTranslation()
  return (
    <main className={`${PAGE_MAIN} items-center justify-center gap-6 py-10 sm:py-16`}>
      <div className="w-full max-w-md text-center">
        <Heading className="text-2xl sm:text-3xl">{heading}</Heading>
        <p className="mt-2 text-sm text-neutral-600 sm:text-base">{subtitle}</p>
      </div>

      <Card className="w-full max-w-md rounded-2xl border-neutral-200/70 shadow-xl">
        <CardContent className="p-6 sm:p-8">
          {onSubmit ? (
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              {children}
            </form>
          ) : (
            children
          )}
        </CardContent>
      </Card>

      {footer && <div className="text-sm text-neutral-600">{footer}</div>}

      {isDevelopment && (
        <p className="flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
          {t('auth.devMode')}
        </p>
      )}
    </main>
  )
}
