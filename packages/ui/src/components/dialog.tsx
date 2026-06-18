import { Dialog as BaseDialog } from '@base-ui-components/react/dialog'
import * as React from 'react'
import { cn } from '../lib/utils'

export interface DialogProps {
  open: boolean
  onOpenChange?: (open: boolean, eventDetails?: DialogRootChangeEventDetails) => void
  onOpenChangeComplete?: (open: boolean) => void
  children: React.ReactNode
  /** Prevent closing via backdrop click or Escape. */
  dismissible?: boolean
}

type DialogRootChangeEventDetails = {
  preventUnmountOnClose: () => void
}

export function Dialog({
  open,
  onOpenChange,
  onOpenChangeComplete,
  children,
  dismissible = false,
}: DialogProps) {
  function handleOpenChange(open: boolean, eventDetails: DialogRootChangeEventDetails) {
    if (!open && !dismissible) {
      eventDetails.preventUnmountOnClose()
      return
    }
    onOpenChange?.(open, eventDetails)
  }

  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={handleOpenChange}
      {...(onOpenChangeComplete ? { onOpenChangeComplete } : {})}
      modal
      disablePointerDismissal={!dismissible}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          {children}
        </div>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <BaseDialog.Popup
      className={cn(
        'pointer-events-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-lg outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className,
      )}
      {...props}
    >
      {children}
    </BaseDialog.Popup>
  )
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      className={cn('text-lg font-semibold text-neutral-900', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      className={cn('mt-2 text-sm text-neutral-600', className)}
      {...props}
    />
  )
}
