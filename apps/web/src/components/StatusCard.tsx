import { Card, cn, Heading } from '@beerolog/ui'
import type { ReactNode } from 'react'
import { StatusIllustration, type StatusVariant } from './status-illustrations'

type StatusCardProps = {
  variant: StatusVariant
  title: string
  description: string
  action: ReactNode
  illustration?: ReactNode
  className?: string
}

export function StatusCard({
  variant,
  title,
  description,
  action,
  illustration,
  className,
}: StatusCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center gap-6 overflow-hidden border-brand-200 bg-gradient-to-b from-brand-50/80 to-white p-8 text-center shadow-md',
        className,
      )}
    >
      <StatusIllustration variant={variant} illustration={illustration} />
      <div className="space-y-2">
        <Heading level={2} className="text-xl font-semibold text-neutral-900">{title}</Heading>
        <p className="mx-auto max-w-sm text-sm text-neutral-600">{description}</p>
      </div>
      {action}
    </Card>
  )
}
