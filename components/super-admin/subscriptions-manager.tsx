"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { platformService } from "@/lib/api/services/platform-service"
import type {
  CommercialQuote,
  PlatformCompany,
  PlatformSubscription,
  QuoteStatus,
  SubscriptionStatus,
} from "@/types/platform"
import { SubscriptionStatusBadge } from "./status-badges"
import { PageHeader } from "./page-header"
import { TenantAvatar } from "./tenant-avatar"
import { UsageMeter } from "./usage-meter"
import { daysUntil, formatDate, usagePct } from "@/lib/tenant/health"
import { estimatedMrr, formatInr } from "@/lib/tenant/ops"
import { getApiErrorMessage } from "@/lib/api/api-error"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ArrowRight, AlertTriangle, CheckCircle2, Package } from "lucide-react"

type Tab = "packages" | "attention" | "trials" | "quotes"

type BillingAction = {
  code: "collect" | "renew" | "assign" | "upgrade"
  label: string
  detail: string
  href: string
  severity: "critical" | "watch"
}

function money(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return formatInr(amount, currency)
  }
}

function monthlyAmount(s: PlatformSubscription) {
  const amount = Number(s.amount) || 0
  return s.billingInterval === "yearly" ? amount / 12 : amount
}

function capacityPressure(s: PlatformSubscription) {
  const seatsPct = usagePct(s.usage?.usersUsed, s.limits?.maxUsers)
  const branchesPct = usagePct(s.usage?.branchesUsed, s.limits?.maxBranches)
  const hot = (seatsPct != null && seatsPct >= 80) || (branchesPct != null && branchesPct >= 80)
  const critical = (seatsPct != null && seatsPct >= 95) || (branchesPct != null && branchesPct >= 95)
  return { seatsPct, branchesPct, hot, critical }
}

function actionForSubscription(s: PlatformSubscription): BillingAction | null {
  if (s.status === "past_due" || s.status === "expired") {
    return {
      code: "collect",
      label: "Collect payment",
      detail: s.status === "expired" ? "Package lapsed — restore billing" : "Payment failed or past due",
      href: `/companies/${s.companyId}?action=collect`,
      severity: "critical",
    }
  }
  if (s.status === "incomplete") {
    return {
      code: "collect",
      label: "Activate package",
      detail: "Package assigned but unpaid",
      href: `/companies/${s.companyId}?action=collect`,
      severity: "watch",
    }
  }

  const days = daysUntil(s.trialEndsAt ?? s.currentPeriodEnd)
  if (days != null && days <= 30 && (s.status === "active" || s.status === "trialing")) {
    return {
      code: "renew",
      label: days < 0 ? "Renew now" : "Follow up renewal",
      detail: days < 0 ? "Renewal date passed" : `Renews in ${days} day${days === 1 ? "" : "s"}`,
      href: `/companies/${s.companyId}?action=renew`,
      severity: days <= 7 || days < 0 ? "critical" : "watch",
    }
  }

  const cap = capacityPressure(s)
  if (cap.hot && (s.status === "active" || s.status === "trialing")) {
    return {
      code: "upgrade",
      label: "Upgrade package",
      detail: cap.critical
        ? "Seat or branch limit nearly full — raise package capacity"
        : "Usage approaching package limits",
      href: `/companies/${s.companyId}?action=upgrade`,
      severity: cap.critical ? "critical" : "watch",
    }
  }

  return null
}

export function SubscriptionsManager() {
  const [tab, setTab] = useState<Tab>("packages")
  const [subs, setSubs] = useState<PlatformSubscription[]>([])
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [quotes, setQuotes] = useState<CommercialQuote[]>([])
  const [reportedMrr, setReportedMrr] = useState<number | null>(null)
  const [currency, setCurrency] = useState("INR")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashRes, subsRes, companiesRes, quotesRes] = await Promise.all([
        platformService.getDashboard().catch(() => ({ data: null })),
        platformService.getSubscriptions({ page: 1, limit: 100 }),
        platformService.getCompanies({ page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
        platformService.getQuotes({ page: 1, limit: 50 }).catch(() => ({ data: [] as CommercialQuote[] })),
      ])
      setSubs(subsRes.data ?? [])
      setCompanies(companiesRes.data ?? [])
      setQuotes(quotesRes.data ?? [])
      if (dashRes.data) {
        setReportedMrr(dashRes.data.monthlyRevenue)
        setCurrency(dashRes.data.currency || "INR")
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
      setSubs([])
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const companyById = useMemo(() => {
    const map = new Map<number, PlatformCompany>()
    for (const c of companies) map.set(c.id, c)
    return map
  }, [companies])

  const live = useMemo(
    () => subs.filter((s) => s.status === "active" || s.status === "trialing"),
    [subs],
  )
  const mrr = reportedMrr && reportedMrr > 0 ? reportedMrr : estimatedMrr(subs)
  const unpaid = subs.filter((s) => s.status === "incomplete" || s.status === "past_due" || s.status === "expired")
  const renewing = live.filter((s) => {
    const d = daysUntil(s.trialEndsAt ?? s.currentPeriodEnd)
    return d != null && d <= 30
  })
  const upgradeNeeded = live.filter((s) => capacityPressure(s).hot)
  const noPackage = companies.filter(
    (c) => c.status !== "deleted" && !c.plan && !c.subscriptionStatus,
  )

  const attention = useMemo(() => {
    const rows: { key: string; companyName: string; companyId: number; action: BillingAction }[] = []

    for (const c of noPackage) {
      rows.push({
        key: `assign-${c.id}`,
        companyName: c.companyName,
        companyId: c.id,
        action: {
          code: "assign",
          label: "Assign package",
          detail: "No commercial package yet — one package covers the whole company",
          href: `/companies/${c.id}?action=upgrade`,
          severity: "watch",
        },
      })
    }

    for (const s of subs) {
      const action = actionForSubscription(s)
      if (!action) continue
      rows.push({
        key: `${action.code}-${s.id}`,
        companyName: s.companyName,
        companyId: s.companyId,
        action,
      })
    }

    const rank = { critical: 0, watch: 1 }
    return rows.sort((a, b) => rank[a.action.severity] - rank[b.action.severity])
  }, [subs, noPackage])

  const tabs = [
    { id: "packages" as const, label: "Packages", count: live.length },
    { id: "attention" as const, label: "Needs you", count: attention.length },
    { id: "trials" as const, label: "Trials", count: subs.filter((s) => s.status === "trialing").length },
    { id: "quotes" as const, label: "Negotiations", count: quotes.filter((q) => q.status === "draft" || q.status === "sent").length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Commerce"
        title="Billing"
        description="One package per company, billed through the company admin. Track revenue, renewals, and when seat or branch usage means the package should grow."
        actions={
          <Button asChild variant="outline">
            <Link href="/plans">
              Manage plans
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric
          label="Monthly revenue"
          value={loading ? "—" : money(mrr, currency)}
          hint="Recurring from live packages"
        />
        <Metric
          label="Live packages"
          value={loading ? "—" : String(live.length)}
          hint={`${unpaid.length} unpaid`}
        />
        <Metric
          label="Renewing (30d)"
          value={loading ? "—" : String(renewing.length)}
          hint="Follow up before period end"
        />
        <Metric
          label="Upgrade pressure"
          value={loading ? "—" : String(upgradeNeeded.length)}
          hint="Seats or branches near limit"
        />
        <Metric
          label="No package"
          value={loading ? "—" : String(noPackage.length)}
          hint="Assign one commercial package"
        />
      </div>

      <div className="flex gap-1 rounded-full bg-neutral-50 p-1 w-fit flex-wrap">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm inline-flex items-center gap-2",
              tab === id ? "bg-white text-neutral-950 shadow-sm font-medium" : "text-neutral-500",
            )}
          >
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "min-w-5 h-5 px-1 rounded-md text-[11px] font-semibold inline-flex items-center justify-center",
                  id === "attention" && count > 0
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-600",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "quotes" ? (
        <QuotesTable items={quotes} loading={loading} onReload={load} />
      ) : tab === "attention" ? (
        <AttentionQueue items={attention} loading={loading} companyById={companyById} />
      ) : (
        <PackagesTable
          items={
            tab === "trials"
              ? subs.filter((s) => s.status === "trialing")
              : subs.filter((s) => s.status !== "trialing")
          }
          loading={loading}
          companyById={companyById}
          currency={currency}
          trialsOnly={tab === "trials"}
        />
      )}
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[20px] bg-neutral-50/80 px-4 py-3.5">
      <p className="text-[11px] text-neutral-400 font-medium">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-neutral-950 mt-1 tracking-tight">{value}</p>
      <p className="text-[11px] text-neutral-400 mt-1 truncate">{hint}</p>
    </div>
  )
}

function AttentionQueue({
  items,
  loading,
  companyById,
}: {
  items: { key: string; companyName: string; companyId: number; action: BillingAction }[]
  loading: boolean
  companyById: Map<number, PlatformCompany>
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-neutral-50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] bg-neutral-50/80 min-h-[220px] flex flex-col items-center justify-center text-center px-6">
        <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-2" />
        <p className="text-sm font-medium text-neutral-800">Billing queue is clear</p>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm">
          No unpaid packages, renewals due, missing packages, or capacity upgrades needed.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map(({ key, companyName, companyId, action }) => {
        const admin = companyById.get(companyId)?.companyAdmin
        return (
          <li key={key}>
            <Link
              href={action.href}
              className="flex items-center gap-3 rounded-[20px] bg-neutral-50/80 px-4 py-3 hover:bg-white hover:shadow-sm transition-shadow"
            >
              <TenantAvatar name={companyName} id={companyId} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 truncate">{companyName}</p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {admin?.name ? `Company admin: ${admin.name}` : "Company admin package"}
                  {" · "}
                  {action.detail}
                </p>
              </div>
              {action.severity === "critical" && (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <span className="text-[11px] font-medium text-primary shrink-0">{action.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function PackagesTable({
  items,
  loading,
  companyById,
  currency,
  trialsOnly,
}: {
  items: PlatformSubscription[]
  loading: boolean
  companyById: Map<number, PlatformCompany>
  currency: string
  trialsOnly: boolean
}) {
  const [status, setStatus] = useState<SubscriptionStatus | "all" | "expiring" | "upgrade">(
    trialsOnly ? "trialing" : "all",
  )

  useEffect(() => {
    setStatus(trialsOnly ? "trialing" : "all")
  }, [trialsOnly])

  const filtered = useMemo(() => {
    if (trialsOnly) return items
    if (status === "all") return items
    if (status === "expiring") {
      return items.filter((s) => {
        const d = daysUntil(s.currentPeriodEnd)
        return d != null && d <= 30 && (s.status === "active" || s.status === "trialing")
      })
    }
    if (status === "upgrade") return items.filter((s) => capacityPressure(s).hot)
    return items.filter((s) => s.status === status)
  }, [items, status, trialsOnly])

  return (
    <div className="space-y-3">
      {!trialsOnly && (
        <Select
          className="w-full sm:w-56"
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
          options={[
            { value: "all", label: "All packages" },
            { value: "active", label: "Active" },
            { value: "expiring", label: "Renewing (30 days)" },
            { value: "upgrade", label: "Upgrade pressure" },
            { value: "past_due", label: "Past due" },
            { value: "expired", label: "Expired" },
            { value: "incomplete", label: "Incomplete (unpaid)" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      )}

      <div className="rounded-[24px] bg-neutral-50/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                <th className="px-5 py-3 font-semibold">Company</th>
                <th className="px-5 py-3 font-semibold">Package</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Seats in package</th>
                <th className="px-5 py-3 font-semibold">Branches</th>
                <th className="px-5 py-3 font-semibold">{trialsOnly ? "Trial ends" : "Renews"}</th>
                <th className="px-5 py-3 font-semibold">Next</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
                    <div className="inline-flex flex-col items-center gap-2">
                      <Package className="h-6 w-6 text-neutral-300" />
                      <span>
                        {trialsOnly ? "No active 30-day trials." : "No packages match this filter."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const admin = companyById.get(s.companyId)?.companyAdmin
                  const action = actionForSubscription(s)
                  const monthly = monthlyAmount(s)
                  return (
                    <tr key={s.id} className="border-t border-white hover:bg-white/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-[12rem]">
                          <TenantAvatar name={s.companyName} id={s.companyId} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-950 truncate">{s.companyName}</p>
                            <p className="text-[11px] text-neutral-400 truncate">
                              {admin?.name
                                ? `Admin: ${admin.name}`
                                : admin?.email
                                  ? admin.email
                                  : "Company admin package"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{s.planName}</p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {s.planCode}
                          {s.isCustom ? " · custom" : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium tabular-nums">{money(monthly, s.currency || currency)}</p>
                        <p className="text-[11px] text-neutral-400 capitalize">
                          {s.billingInterval}
                          {s.billingInterval === "yearly" ? " · /mo equiv." : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <SubscriptionStatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3">
                        <UsageMeter used={s.usage?.usersUsed} max={s.limits?.maxUsers} compact />
                      </td>
                      <td className="px-5 py-3">
                        <UsageMeter used={s.usage?.branchesUsed} max={s.limits?.maxBranches} compact />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-neutral-600">
                        {formatDate(s.trialEndsAt ?? s.currentPeriodEnd)}
                        {s.cancelAtPeriodEnd && (
                          <div className="text-[11px] text-amber-700">Cancels at end</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {action ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={action.href}>{action.label}</Link>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/companies/${s.companyId}?tab=billing`}>Manage</Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function QuotesTable({
  items,
  loading,
  onReload,
}: {
  items: CommercialQuote[]
  loading: boolean
  onReload: () => void
}) {
  const [status, setStatus] = useState<QuoteStatus | "all">("all")

  const filtered =
    status === "all" ? items : items.filter((q) => q.status === status)

  return (
    <>
      <Select
        className="w-full sm:w-52"
        value={status}
        onValueChange={(v) => setStatus(v as typeof status)}
        options={[
          { value: "all", label: "All quotes" },
          { value: "draft", label: "Draft" },
          { value: "sent", label: "Sent" },
          { value: "accepted", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
          { value: "expired", label: "Expired" },
        ]}
      />
      <div className="rounded-[24px] bg-neutral-50/70 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-neutral-400">
              <th className="px-5 py-3 font-semibold">Package</th>
              <th className="px-5 py-3 font-semibold">Company / lead</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-neutral-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-neutral-400">
                  No negotiated packages yet. Open a lead or company and build one after the trial.
                </td>
              </tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className="border-t border-white">
                  <td className="px-5 py-3 font-medium">{q.name}</td>
                  <td className="px-5 py-3 text-neutral-600">
                    {q.companyName ?? (q.companyId ? `#${q.companyId}` : `Lead ${q.leadId}`)}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    ₹{Number(q.amount).toLocaleString("en-IN")}
                    <span className="text-[11px] text-neutral-400 ml-1">{q.billingInterval}</span>
                  </td>
                  <td className="px-5 py-3 capitalize">{q.status}</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    {q.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await platformService.sendQuote(q.id)
                            toast.success("Quote marked sent")
                            onReload()
                          } catch (err) {
                            toast.error(getApiErrorMessage(err))
                          }
                        }}
                      >
                        Send
                      </Button>
                    )}
                    {(q.status === "draft" || q.status === "sent") && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await platformService.acceptQuote(q.id, { grantWithoutPayment: true })
                            toast.success("Package accepted — features unlocked")
                            onReload()
                          } catch (err) {
                            toast.error(getApiErrorMessage(err))
                          }
                        }}
                      >
                        Accept
                      </Button>
                    )}
                    {q.companyId && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/companies/${q.companyId}`}>Company</Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
