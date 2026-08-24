import type { PlatformCompany, PlatformSubscription, SubscriptionPlan } from "@/types/platform"
import { daysUntil, getTenantHealth } from "./health"

export type OpsSeverity = "critical" | "watch" | "ok"

export type OpsCode = "collect_overdue" | "collect" | "assign_plan" | "renew" | "restore" | "quota"

export interface OpsItem {
  code: OpsCode
  label: string
  detail: string
  href: string
  severity: OpsSeverity
  group: string
}

export function isCommerciallyLive(c: PlatformCompany) {
  return (
    c.status === "active" &&
    (c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing")
  )
}

export function getOpsItem(c: PlatformCompany, plans: SubscriptionPlan[] = []): OpsItem | null {
  if (c.status === "deleted") return null

  if (c.status === "suspended") {
    return {
      code: "restore",
      label: "Review access",
      detail: "Workspace is blocked for every user",
      href: `/companies/${c.id}?tab=control`,
      severity: "critical",
      group: "Access blocked",
    }
  }

  if (c.subscriptionStatus === "past_due" || c.subscriptionStatus === "expired") {
    return {
      code: "collect_overdue",
      label: "Collect from tenant",
      detail: c.subscriptionStatus === "expired" ? "Subscription has lapsed" : "Payment failed or is past due",
      href: `/companies/${c.id}?action=collect`,
      severity: "critical",
      group: "Billing failed",
    }
  }

  if (c.subscriptionStatus === "incomplete") {
    return {
      code: "collect",
      label: "Activate access",
      detail: "Plan assigned but not live — cover it from your account or charge this player",
      href: `/companies/${c.id}?action=collect`,
      severity: "watch",
      group: "Not commercially live",
    }
  }

  if (!c.plan && !c.subscriptionStatus) {
    return {
      code: "assign_plan",
      label: "Assign a plan",
      detail: "No plan yet — cover from your account or charge this player",
      href: `/companies/${c.id}?action=upgrade`,
      severity: "watch",
      group: "No plan",
    }
  }

  const days = daysUntil(c.subscriptionExpiresAt)
  if (days != null && days <= 30) {
    return {
      code: "renew",
      label: days < 0 ? "Renew now" : "Follow up renewal",
      detail: days < 0 ? "Renewal date has passed" : `Renews in ${days} day${days === 1 ? "" : "s"}`,
      href: `/companies/${c.id}?action=renew`,
      severity: days <= 7 || days < 0 ? "critical" : "watch",
      group: "Renewals",
    }
  }

  const health = getTenantHealth(c, plans)
  if (health.level !== "healthy" && health.reasons[0]?.includes("quota")) {
    return {
      code: "quota",
      label: "Quota pressure",
      detail: health.reasons[0],
      href: `/companies/${c.id}?tab=entitlements`,
      severity: "watch",
      group: "Capacity",
    }
  }

  return null
}

export function groupOps(items: { company: PlatformCompany; ops: OpsItem }[]) {
  const order = ["Billing failed", "Access blocked", "Not commercially live", "No plan", "Renewals", "Capacity"]
  const map = new Map<string, { company: PlatformCompany; ops: OpsItem }[]>()
  for (const item of items) {
    const list = map.get(item.ops.group) ?? []
    list.push(item)
    map.set(item.ops.group, list)
  }
  return order.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }))
}

export function estimatedMrr(subs: PlatformSubscription[]) {
  return subs
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((sum, s) => {
      const amount = Number(s.amount) || 0
      return sum + (s.billingInterval === "yearly" ? amount / 12 : amount)
    }, 0)
}

export function planMix(companies: PlatformCompany[]) {
  const counts = new Map<string, number>()
  for (const c of companies) {
    const key = c.plan?.name ?? "No plan"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function formatInr(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`
  }
}
