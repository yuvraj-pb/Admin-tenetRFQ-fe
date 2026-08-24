import type { TenantHealthResult } from "@/lib/tenant/health"
import { cn } from "@/lib/utils"

export function HealthBadge({ health, showReason }: { health: TenantHealthResult; showReason?: boolean }) {
  const styles = {
    healthy: "bg-emerald-50 text-emerald-800 border-emerald-200",
    watch: "bg-amber-50 text-amber-900 border-amber-200",
    critical: "bg-red-50 text-red-800 border-red-200",
  } as const
  const dot = {
    healthy: "bg-emerald-500",
    watch: "bg-amber-500",
    critical: "bg-red-500",
  } as const

  return (
    <div className="min-w-0">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          styles[health.level],
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", dot[health.level], health.level === "healthy" && "animate-pulse")} />
        {health.label}
      </span>
      {showReason && health.reasons[0] && (
        <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[11rem]" title={health.reasons.join(" · ")}>
          {health.reasons[0]}
        </p>
      )}
    </div>
  )
}
