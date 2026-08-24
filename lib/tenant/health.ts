import type { PlatformCompany, SubscriptionPlan } from "@/types/platform"

export type TenantHealth = "healthy" | "watch" | "critical"

export interface TenantHealthResult {
  level: TenantHealth
  label: string
  reasons: string[]
}

export function tenantCode(id: number | string) {
  return `TEN-${String(id).padStart(5, "0")}`
}

export function tenantSlug(company: Pick<PlatformCompany, "id" | "companyName" | "slug">) {
  if (company.slug) return company.slug
  return company.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || `tenant-${company.id}`
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24))
}

export function usagePct(used?: number | null, max?: number | null): number | null {
  if (used == null || max == null || max <= 0) return null
  return Math.min(100, Math.round((used / max) * 100))
}

export function planLimits(company: PlatformCompany, plans: SubscriptionPlan[]) {
  const plan = plans.find((p) => p.id === company.plan?.id)
  return {
    maxUsers: plan?.maxUsers ?? null,
    maxBranches: plan?.maxBranches ?? null,
    maxStorageBytes: plan?.maxStorageBytes ?? null,
  }
}

export function getTenantHealth(
  company: PlatformCompany,
  plans: SubscriptionPlan[] = [],
): TenantHealthResult {
  const reasons: string[] = []
  const days = daysUntil(company.subscriptionExpiresAt)
  const limits = planLimits(company, plans)
  const usersPct = usagePct(company.usage?.usersUsed, limits.maxUsers)
  const storagePct = usagePct(company.usage?.storageUsedBytes, limits.maxStorageBytes)

  if (company.status === "deleted") {
    return { level: "critical", label: "Critical", reasons: ["Tenant is soft-deleted"] }
  }
  if (company.status === "suspended") reasons.push("Access is suspended")
  if (company.subscriptionStatus === "past_due") reasons.push("Payment past due")
  if (company.subscriptionStatus === "expired") reasons.push("Subscription expired")
  if (company.subscriptionStatus === "incomplete") reasons.push("Onboarding unpaid")
  if (days != null && days < 0) reasons.push("Renewal date has passed")
  else if (days != null && days <= 7) reasons.push(`Renews in ${days} day${days === 1 ? "" : "s"}`)
  if (usersPct != null && usersPct >= 95) reasons.push("Seat quota nearly full")
  if (storagePct != null && storagePct >= 95) reasons.push("Storage quota nearly full")
  if (company.status === "archived") reasons.push("Archived workspace")

  const isCritical =
    company.status === "suspended" ||
    company.subscriptionStatus === "past_due" ||
    company.subscriptionStatus === "expired" ||
    (days != null && days < 0)

  if (isCritical) {
    return { level: "critical", label: "Critical", reasons: reasons.length ? reasons : ["Needs immediate action"] }
  }

  const isWatch =
    reasons.length > 0 ||
    company.subscriptionStatus === "incomplete" ||
    company.subscriptionStatus === "trialing" ||
    (days != null && days <= 14) ||
    (usersPct != null && usersPct >= 80) ||
    (storagePct != null && storagePct >= 80)

  if (isWatch) {
    return { level: "watch", label: "Watch", reasons: reasons.length ? reasons : ["Needs review"] }
  }

  return { level: "healthy", label: "Healthy", reasons: ["Operating normally"] }
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatRelativeExpiry(iso?: string | null) {
  const days = daysUntil(iso)
  if (days == null) return { label: "No renewal", tone: "muted" as const }
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: "critical" as const }
  if (days === 0) return { label: "Expires today", tone: "critical" as const }
  if (days <= 7) return { label: `${days}d left`, tone: "critical" as const }
  if (days <= 30) return { label: `${days}d left`, tone: "watch" as const }
  return { label: formatDate(iso), tone: "ok" as const }
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "TN"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_TONES = [
  "from-orange-500 to-amber-600",
  "from-sky-500 to-blue-700",
  "from-violet-500 to-indigo-700",
  "from-emerald-500 to-teal-700",
  "from-rose-500 to-pink-700",
  "from-slate-500 to-slate-800",
]

export function avatarTone(id: number | string) {
  const n = typeof id === "number" ? id : Number(id) || 0
  return AVATAR_TONES[Math.abs(n) % AVATAR_TONES.length]
}
