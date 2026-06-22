import { AuthenticateWithRedirectCallback, useSignIn } from '@clerk/tanstack-react-start'
import { Button } from '@beerolog/ui'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthLayout,
  GoogleButton,
  clerkError,
} from '../components/AuthLayout'

// Splat route so Clerk's OAuth redirect can land on /signin/sso-callback.
export const Route = createFileRoute('/signin/$')({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search['next'] === 'string' ? { next: search['next'] } : {},
  component: SignInPage,
})

function SignInPage() {
  const { _splat } = Route.useParams()

  // OAuth round-trip lands here; let Clerk finish the handshake and redirect.
  if (_splat === 'sso-callback') {
    return <AuthenticateWithRedirectCallback />
  }

  return <SignInForm />
}

function SignInForm() {
  const next = Route.useSearch().next ?? '/'
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn } = useSignIn()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handlePasswordSignIn(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { error } = await signIn.password({ identifier: email, password })
      if (error) {
        setError(clerkError(error, t('auth.genericError')))
        return
      }
      if (signIn.status === 'complete') {
        await signIn.finalize()
        await navigate({ to: next })
      } else {
        // ponytail: second factors (MFA / email-code) not built here. Add a
        // verification screen if those strategies get enabled in Clerk.
        setError(t('signin.mfaUnsupported'))
      }
    } catch (err) {
      setError(clerkError(err, t('auth.genericError')))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    try {
      const { error } = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: next,
        redirectCallbackUrl: '/signin/sso-callback',
      })
      if (error) setError(clerkError(error, t('auth.genericError')))
    } catch (err) {
      setError(clerkError(err, t('auth.genericError')))
    }
  }

  return (
    <AuthLayout
      heading={t('signin.heading')}
      subtitle={t('signin.subtitle')}
      footer={
        <>
          {t('signin.noAccount')}{' '}
          <Link
            to="/signup/$"
            params={{ _splat: '' }}
            search={{ next }}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {t('signin.createAccount')}
          </Link>
        </>
      }
    >
      <GoogleButton onClick={handleGoogle} disabled={submitting} />
      <AuthDivider />
      <form className="flex flex-col gap-4" onSubmit={handlePasswordSignIn}>
        <AuthField
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthError message={error} />
        <Button type="submit" disabled={submitting}>
          {submitting ? t('signin.signingIn') : t('auth.signIn')}
        </Button>
      </form>
    </AuthLayout>
  )
}
