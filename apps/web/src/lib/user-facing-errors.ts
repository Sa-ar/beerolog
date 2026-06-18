export type BaselineLoadErrorReason = 'network' | 'unauthorized' | 'server' | 'unknown'

export function describeBaselineLoadError(reason: BaselineLoadErrorReason): {
  title: string
  message: string
} {
  switch (reason) {
    case 'network':
      return {
        title: "Can't reach Beerolog",
        message:
          "We couldn't connect right now. Check your connection and try again in a moment.",
      }
    case 'unauthorized':
      return {
        title: 'Session needs a refresh',
        message: "Your sign-in didn't carry through. Try again or sign out and back in.",
      }
    case 'server':
      return {
        title: 'Beerolog is temporarily unavailable',
        message: 'Something went wrong on our end. Give it a moment and try again.',
      }
    default:
      return {
        title: "Couldn't load your profile",
        message: 'Something unexpected happened while loading your taste profile.',
      }
  }
}

export function sessionStartErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message && !error.message.startsWith('HTTP ')) {
    return error.message
  }
  return "We couldn't start your session. Check your connection and try again."
}

export function loadMoreErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message && !error.message.startsWith('HTTP ')) {
    return error.message
  }
  return "We couldn't load more picks. Give it a moment and try again."
}

export function onboardingSaveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message && !error.message.startsWith('HTTP ')) {
    return error.message
  }
  return "We couldn't save your taste profile. Try again in a moment."
}

export function globalErrorMessage(): { title: string; message: string } {
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Try again or head back to home.',
  }
}
