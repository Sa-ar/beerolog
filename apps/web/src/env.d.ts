interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  readonly VITE_FEATURE_FIND_NEARBY_SEARCH?: string
  readonly VITE_WEB_URL?: string
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly DEV: boolean
  readonly MODE: string
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
