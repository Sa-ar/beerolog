import { useAuth, useUser } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TasteProfileSummary } from '../components/TasteProfileSummary'
import { TasteProfileEmptyState } from '../components/TasteProfileEmptyState'
import { TasteProfileErrorState } from '../components/TasteProfileErrorState'
import { TasteProfileLoadingState } from '../components/TasteProfileLoadingState'
import type { BaselineLoadErrorReason } from '../lib/load-baseline-taste'
import { loadBaselineTaste } from '../lib/load-baseline-taste'
import { clearBaselineCache, readBaselineCache, writeBaselineCache } from '../lib/baseline-cache'
import type { BaselineTaste } from '../lib/baseline-taste'
import { timeAwareGreeting, isStaleProfile } from '../lib/baseline-taste'

// The Profile (taste) tab is the default Account tab and the single home for the
// taste profile — moved here from the signed-in Home during the page reduction.
export const Route = createFileRoute('/account/profile')({
  component: ProfileTastePage,
})

// Carries the typed failure reason through react-query's error channel.
class BaselineError extends Error {
  constructor(readonly reason: BaselineLoadErrorReason) {
    super(reason)
  }
}

type BaselineResult = { ready: BaselineTaste } | { empty: true }

function ProfileTastePage() {
  const { getToken, isLoaded: authLoaded, userId } = useAuth()
  const { user } = useUser()
  const { t } = useTranslation()
  const greeting = timeAwareGreeting(t, user?.firstName)

  const profile = useQuery<BaselineResult, BaselineError>({
    queryKey: ['baseline', userId],
    enabled: authLoaded,
    staleTime: 0,
    retry: false,
    initialData: () => {
      const cached = readBaselineCache(userId)
      return cached && !isStaleProfile(cached) ? { ready: cached } : undefined
    },
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const result = await loadBaselineTaste(() => getToken())
      if (result.status === 'error') throw new BaselineError(result.reason)
      if (result.status === 'empty' || isStaleProfile(result.baseline)) {
        clearBaselineCache(userId)
        return { empty: true }
      }
      writeBaselineCache(userId, result.baseline)
      return { ready: result.baseline }
    },
  })

  if (!authLoaded || profile.isPending) {
    return <TasteProfileLoadingState greeting={greeting} />
  }

  if (profile.isError && !profile.data) {
    return (
      <TasteProfileErrorState
        greeting={greeting}
        reason={profile.error.reason}
        onRetry={() => void profile.refetch()}
      />
    )
  }

  if (profile.data && 'empty' in profile.data) {
    return <TasteProfileEmptyState greeting={greeting} />
  }

  if (!profile.data || !('ready' in profile.data)) {
    return <TasteProfileLoadingState greeting={greeting} />
  }

  return <TasteProfileSummary greeting={greeting} baseline={profile.data.ready} />
}
