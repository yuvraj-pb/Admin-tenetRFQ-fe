"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description: string
  trend?: string
  trendPositive?: boolean
  icon: LucideIcon
  loading?: boolean
  accent?: "slate" | "emerald" | "amber" | "red" | "blue" | "orange"
  onClick?: () => void
}

const ACCENT = {
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
  orange: "bg-orange-50 text-orange-700",
} as const

export function StatCard({
  title,
  value,
  description,
  trend,
  trendPositive = true,
  icon: Icon,
  loading,
  accent = "slate",
  onClick,
}: StatCardProps) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "bg-white rounded-[22px] border border-neutral-100 shadow-[0_8px_24px_rgba(20,20,20,0.04)] p-5 flex flex-col min-h-[132px] text-left w-full",
        onClick && "hover:shadow-[0_12px_32px_rgba(20,20,20,0.08)] transition-all cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
        <div className={cn("p-2 rounded-lg shrink-0", ACCENT[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-[1.65rem] font-semibold text-slate-950 mt-3 tracking-tight tabular-nums">
        {loading ? "—" : value}
      </p>
      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
        <p className="text-xs text-slate-500">{description}</p>
        {trend && (
          <p
            className={cn(
              "text-xs font-medium whitespace-nowrap",
              trendPositive ? "text-emerald-600" : "text-amber-700",
            )}
          >
            {trend}
          </p>
        )}
      </div>
    </Comp>
  )
}
