"use client"

import { Badge } from "@/components/ui/badge"
import type { CompanyLifecycleStatus, SubscriptionStatus } from "@/types/platform"
import { cn } from "@/lib/utils"

const COMPANY_STATUS_STYLES: Record<CompanyLifecycleStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  suspended: "bg-amber-100 text-amber-800 border-amber-200",
  archived: "bg-slate-100 text-slate-700 border-slate-200",
  deleted: "bg-red-100 text-red-800 border-red-200",
}

const SUB_STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  trialing: "bg-sky-100 text-sky-800 border-sky-200",
  past_due: "bg-orange-100 text-orange-800 border-orange-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  incomplete: "bg-yellow-100 text-yellow-800 border-yellow-200",
}

export function CompanyStatusBadge({ status }: { status: CompanyLifecycleStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", COMPANY_STATUS_STYLES[status])}>
      {status}
    </Badge>
  )
}

export function SubscriptionStatusBadge({ status }: { status?: SubscriptionStatus | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
        None
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", SUB_STATUS_STYLES[status])}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}
