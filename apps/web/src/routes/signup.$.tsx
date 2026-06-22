import { AuthenticateWithRedirectCallback, useSignUp } from '@clerk/tanstack-react-start'
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

// Splat route so Clerk's OAuth redirect can land on /signup/sso-callback.
export const Route = createFileRoute('/signup/$')({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search['next'] === 'string' ? { next: search['next'] } : {},
  component: SignUpPage,
})

function SignUpPage() {
  const { _splat } = Route.useParams()

  if (_splat === 'sso-callback') {
    return <AuthenticateWithRedirectCallback />
  }

  return <SignUpForm />
}

function SignUpForm() {
  const next = Route.useSearch().next ?? '/'
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoaded, signUp, setActive } = useSignUp()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    if (!isLoaded || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err) {
      setError(clerkError(err, t('auth.genericError')))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    if (!isLoaded || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        await navigate({ to: next })
      } else {
        setError(t('auth.genericError'))
      }
    } catch (err) {
      setError(clerkError(err, t('signup.invalidCode')))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    if (!isLoaded) return
    setError(null)
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/signup/sso-callback',
        redirectUrlComplete: next,
      })
    } catch (err) {
      setError(clerkError(err, t('auth.genericError')))
    }
  }

  if (pendingVerification) {
    return (
      <AuthLayout
        heading={t('signup.verifyHeading')}
        subtitle={t('signup.verifySubtitle', { email })}
        onSubmit={handleVerify}
      >
        <AuthField
          label={t('signup.code')}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <AuthError message={error} />
        <Button type="submit" disabled={!isLoaded || submitting}>
          {submitting ? t('signup.verifying') : t('signup.verify')}
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      heading={t('signup.heading')}
      subtitle={t('signup.subtitle')}
      footer={
        <>
          {t('signup.haveAccount')}{' '}
          <Link
            to="/signin/$"
            params={{ _splat: '' }}
            search={{ next }}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {t('signup.signInLink')}
          </Link>
        </>
      }
    >
      <GoogleButton onClick={handleGoogle} disabled={!isLoaded} />
      <AuthDivider />
      <form className="flex flex-col gap-4" onSubmit={handleSignUp}>
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthError message={error} />
        <Button type="submit" disabled={!isLoaded || submitting}>
          {submitting ? t('signup.creating') : t('auth.signUp')}
        </Button>
      </form>
      {/* Clerk Smart CAPTCHA / bot-protection mounts here; required by signUp.create.
          Kept outside the form's gap-4 flex so its empty box adds no extra spacing. */}
      <div id="clerk-captcha" />
    </AuthLayout>
  )
}
