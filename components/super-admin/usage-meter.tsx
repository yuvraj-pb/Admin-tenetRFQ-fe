import { cn } from "@/lib/utils"
import { formatLimit, formatStorageBytes } from "@/types/platform"

export function UsageMeter({
  used,
  max,
  kind = "count",
  compact,
}: {
  used?: number | null
  max?: number | null
  kind?: "count" | "storage"
  compact?: boolean
}) {
  const safeUsed = used ?? 0
  const pct = max != null && max > 0 ? Math.min(100, Math.round((safeUsed / max) * 100)) : null
  const tone =
    pct == null ? "bg-slate-300" : pct >= 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
  const usedLabel = kind === "storage" ? formatStorageBytes(safeUsed) : safeUsed.toLocaleString("en-IN")
  const maxLabel = kind === "storage" ? formatStorageBytes(max) : formatLimit(max)

  return (
    <div className={cn("min-w-[7.5rem]", compact && "min-w-[6rem]")}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-slate-900 tabular-nums">{usedLabel}</span>
        <span className="text-[11px] text-slate-400 tabular-nums">/ {maxLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct ?? 8}%`, opacity: pct == null ? 0.35 : 1 }}
        />
      </div>
    </div>
  )
}
