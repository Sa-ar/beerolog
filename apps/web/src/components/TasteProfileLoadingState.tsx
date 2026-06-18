type TasteProfileLoadingStateProps = {
  greeting: string
}

export function TasteProfileLoadingState({ greeting }: TasteProfileLoadingStateProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {greeting}
        </p>
        <div className="h-9 w-48 animate-pulse rounded-lg bg-neutral-200" />
      </section>

      <div className="animate-pulse overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-100 to-white p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-neutral-200" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-24 rounded bg-neutral-200" />
            <div className="h-6 w-40 rounded bg-neutral-200" />
            <div className="h-4 w-28 rounded bg-neutral-100" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-16 rounded-full bg-neutral-100" />
          <div className="h-7 w-20 rounded-full bg-neutral-100" />
          <div className="h-7 w-14 rounded-full bg-neutral-100" />
        </div>
      </div>

      <div className="animate-pulse space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-neutral-200" />
        <div className="grid grid-cols-4 gap-2">
          <div className="h-16 rounded-lg bg-neutral-100" />
          <div className="h-16 rounded-lg bg-neutral-100" />
          <div className="h-16 rounded-lg bg-neutral-100" />
          <div className="h-16 rounded-lg bg-neutral-100" />
        </div>
        <div className="h-12 rounded-lg bg-neutral-200" />
      </div>
    </div>
  )
}
