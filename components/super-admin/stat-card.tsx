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
}

export function StatCard({
  title,
  value,
  description,
  trend,
  trendPositive = true,
  icon: Icon,
  loading,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-5 flex flex-col min-h-[140px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="p-2 rounded-lg bg-gray-50 text-gray-500 shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-3 tracking-tight">
        {loading ? "…" : value}
      </p>
      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
        <p className="text-xs text-gray-500">{description}</p>
        {trend && (
          <p
            className={cn(
              "text-xs font-medium whitespace-nowrap",
              trendPositive ? "text-emerald-600" : "text-gray-500",
            )}
          >
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}
