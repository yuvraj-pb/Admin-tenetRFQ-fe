import type { ReactNode } from "react"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-medium text-neutral-400 mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-[2.1rem] font-medium tracking-tight text-neutral-300">{title}</h1>
        {description && (
          <p className="text-sm text-neutral-500 mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
