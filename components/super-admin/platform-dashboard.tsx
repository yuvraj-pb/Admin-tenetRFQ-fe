"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { platformService } from "@/lib/api/services/platform-service"
import { getApiErrorMessage } from "@/lib/api/api-error"
import type { PlatformCompany, PlatformSubscription, SubscriptionPlan } from "@/types/platform"
import { ArrowRight, CheckCircle2, Plus, Clock } from "lucide-react"
import { TenantAvatar } from "./tenant-avatar"
import { HealthBadge } from "./health-badge"
import { SubscriptionStatusBadge } from "./status-badges"
import {
  formatDate,
  getTenantHealth,
  planLimits,
  tenantCode,
  usagePct,
} from "@/lib/tenant/health"
import {
  estimatedMrr,
  formatInr,
  getOpsItem,
  groupOps,
  isCommerciallyLive,
  planMix,
  type OpsItem,
} from "@/lib/tenant/ops"
import { cn } from "@/lib/utils"

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function money(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function PlatformDashboard() {
  const router = useRouter()
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subs, setSubs] = useState<PlatformSubscription[]>([])
  const [currency, setCurrency] = useState("INR")
  const [reportedMrr, setReportedMrr] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<"live" | "all">("live")

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashRes, companiesRes, plansRes, subsRes] = await Promise.all([
        platformService.getDashboard().catch(() => ({ data: null })),
        platformService.getCompanies({ page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
        platformService.getPlans({ skipErrorToast: true }).catch(() => ({ data: [] as SubscriptionPlan[] })),
        platformService.getSubscriptions({ page: 1, limit: 100 }).catch(() => ({ data: [] as PlatformSubscription[] })),
      ])
      setCompanies(companiesRes.data ?? [])
      setPlans(plansRes.data ?? [])
      setSubs(subsRes.data ?? [])
      if (dashRes.data) {
        setReportedMrr(dashRes.data.monthlyRevenue)
        setCurrency(dashRes.data.currency || "INR")
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const fleet = useMemo(() => companies.filter((c) => c.status !== "deleted"), [companies])
  const live = fleet.filter(isCommerciallyLive)
  const work = useMemo(
    () =>
      fleet
        .map((company) => {
          const ops = getOpsItem(company, plans)
          return ops ? { company, ops } : null
        })
        .filter((row): row is { company: PlatformCompany; ops: OpsItem } => !!row)
        .sort((a, b) => {
          const rank = { critical: 0, watch: 1, ok: 2 }
          return rank[a.ops.severity] - rank[b.ops.severity]
        }),
    [fleet, plans],
  )
  const groups = useMemo(() => groupOps(work), [work])
  const mix = useMemo(() => planMix(fleet), [fleet])
  const mrr = reportedMrr && reportedMrr > 0 ? reportedMrr : estimatedMrr(subs)
  const unpaid = fleet.filter((c) => c.subscriptionStatus === "incomplete" || c.subscriptionStatus === "past_due")
  const noPlan = fleet.filter((c) => !c.plan && !c.subscriptionStatus)
  const seatsUsed = fleet.reduce((n, c) => n + (c.usage?.usersUsed ?? 0), 0)
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
  const livePct = fleet.length ? (live.length / fleet.length) * 100 : 0
  const visible = scope === "live" ? live : fleet

  const ranked = useMemo(() => {
    return [...visible]
      .map((c) => {
        const sub = subs.find((s) => s.companyId === c.id)
        const amount = sub ? (sub.billingInterval === "yearly" ? Number(sub.amount) / 12 : Number(sub.amount)) : 0
        return { company: c, amount, seats: c.usage?.usersUsed ?? 0 }
      })
      .sort((a, b) => b.amount - a.amount || b.seats - a.seats)
  }, [visible, subs])

  const shareTotal = ranked.reduce((n, r) => n + (r.amount || r.seats), 0) || 1
  const topShare = ranked.slice(0, 4)
  const topSeats = [...fleet].sort((a, b) => (b.usage?.usersUsed ?? 0) - (a.usage?.usersUsed ?? 0))[0]
  const bestDeal = ranked[0]
  const maxMix = Math.max(...mix.map((m) => m.count), 1)
  const mixColors = ["bg-rose-400", "bg-pink-200", "bg-neutral-200", "bg-sky-300", "bg-violet-300"]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => router.push("/companies/new")}
            className="h-9 w-9 rounded-full border border-dashed border-neutral-300 text-neutral-400 hover:text-neutral-900 hover:border-neutral-400 flex items-center justify-center"
            aria-label="Onboard tenant"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex -space-x-2 ml-2">
            {fleet.slice(0, 5).map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="relative" title={c.companyName}>
                <TenantAvatar name={c.companyName} id={c.id} size="sm" />
              </Link>
            ))}
            {fleet.length > 5 && (
              <div className="h-8 w-8 rounded-full bg-ink text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-white">
                +{fleet.length - 5}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-neutral-50 p-1">
          {(["live", "all"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setScope(id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium capitalize",
                scope === id ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500",
              )}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-neutral-400">{greeting()} · {today}</p>
        <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-neutral-300 mt-1">Fleet report</h1>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Platform API is not reachable</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-end gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-500">Revenue</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <p className="text-4xl sm:text-[2.75rem] font-semibold tracking-tight text-neutral-950 tabular-nums leading-none">
              {loading ? "—" : money(mrr, currency)}
            </p>
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold">
              {loading ? "—" : `${livePct.toFixed(1)}%`} live
            </span>
            {work.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary text-white px-2.5 py-1 text-xs font-semibold">
                {work.length} need you
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-400 mt-2">
            Monthly recurring · {live.length} commercially live of {fleet.length || 0} tenants
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          <InsightCard
            label="Top seats"
            value={loading ? "—" : String(topSeats?.usage?.usersUsed ?? 0)}
            title={topSeats?.companyName ?? "—"}
            onClick={() => topSeats && router.push(`/companies/${topSeats.id}`)}
            avatar={topSeats ? { name: topSeats.companyName, id: topSeats.id } : undefined}
          />
          <InsightCard
            label="Best deal"
            value={loading ? "—" : formatInr(bestDeal?.amount ?? 0, currency)}
            title={bestDeal?.company.companyName ?? "No billed tenant"}
            dark
            onClick={() => bestDeal && router.push(`/companies/${bestDeal.company.id}`)}
          />
          <InsightCard
            label="Live"
            value={loading ? "—" : String(live.length)}
            title={`${unpaid.length} unpaid`}
            onClick={() => router.push("/companies")}
          />
        </div>
      </div>

      <div className="rounded-full bg-neutral-50 p-1.5 overflow-x-auto">
        <div className="flex min-w-[36rem] h-10 rounded-full overflow-hidden">
          {loading || topShare.length === 0 ? (
            <div className="flex-1 bg-neutral-100" />
          ) : (
            topShare.map((row) => {
              const weight = (row.amount || row.seats) / shareTotal
              return (
                <Link
                  key={row.company.id}
                  href={`/companies/${row.company.id}`}
                  className="relative flex items-center gap-2 px-3 min-w-[7rem] bg-white border-r border-neutral-100 last:border-0 hover:bg-neutral-50"
                  style={{ flexGrow: Math.max(weight * 100, 12) }}
                >
                  <TenantAvatar name={row.company.companyName} id={row.company.id} size="sm" />
                  <span className="text-xs font-medium text-neutral-800 tabular-nums truncate">
                    {row.amount ? formatInr(row.amount, currency) : `${row.seats} seats`}
                  </span>
                  <span className="ml-auto text-[11px] text-neutral-400 tabular-nums">
                    {(weight * 100).toFixed(1)}%
                  </span>
                </Link>
              )
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <section className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[24px] bg-neutral-50/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-neutral-700">Work queue</p>
              <span className="text-[11px] text-neutral-400">{work.length}</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-2xl bg-white animate-pulse" />
                ))}
              </div>
            ) : work.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-neutral-800">Fleet is clean</p>
                <p className="text-xs text-neutral-500 mt-1">No unpaid checkouts or blocked access.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {groups.flatMap((g) => g.items).slice(0, 6).map(({ company, ops }) => (
                  <li key={company.id}>
                    <Link
                      href={ops.href}
                      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 hover:shadow-sm"
                    >
                      <TenantAvatar name={company.companyName} id={company.id} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 truncate">{company.companyName}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{ops.detail}</p>
                      </div>
                      <span className="text-[11px] font-medium text-primary shrink-0">{ops.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[24px] bg-neutral-50/80 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-neutral-700">Plan mix</p>
              <span className="text-[11px] text-neutral-400">by tenant</span>
            </div>
            <div className="flex items-end gap-2 h-40 px-1">
              {loading ? (
                <div className="flex-1 h-24 rounded-2xl bg-white animate-pulse" />
              ) : mix.length === 0 ? (
                <p className="text-sm text-neutral-400">No tenants yet.</p>
              ) : (
                mix.map((row, i) => (
                  <div key={row.name} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={cn("w-full rounded-2xl", mixColors[i % mixColors.length])}
                        style={{ height: `${Math.max(18, (row.count / maxMix) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-neutral-500 truncate w-full text-center">{row.name}</p>
                    <p className="text-xs font-semibold tabular-nums text-neutral-800">{row.count}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 rounded-[24px] overflow-hidden bg-primary text-white p-5 flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <p className="text-sm text-white/70">Average monthly</p>
              <p className="text-3xl font-semibold tabular-nums mt-1">
                {loading ? "—" : money(fleet.length ? mrr / fleet.length : 0, currency)}
              </p>
              <p className="text-sm text-white/70 mt-2">
                {unpaid.length} unpaid · {noPlan.length} with no plan · {seatsUsed.toLocaleString("en-IN")} seats in use
              </p>
            </div>
            <Button asChild className="bg-white text-neutral-950 hover:bg-neutral-100">
              <Link href="/companies/new">
                Onboard tenant
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="xl:col-span-2 rounded-[24px] bg-neutral-50/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-neutral-700">Tenants</p>
            <Link href="/companies" className="text-[12px] text-neutral-400 hover:text-neutral-700">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-2 pb-2 text-[11px] text-neutral-400">
            <span>Org</span>
            <span className="text-right">Seats</span>
            <span className="text-right">Plan</span>
          </div>
          <ul className="space-y-1">
            {(loading ? [] : ranked.slice(0, 8)).map((row) => (
              <li key={row.company.id}>
                <Link
                  href={`/companies/${row.company.id}`}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center rounded-2xl px-2 py-2 hover:bg-white"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <TenantAvatar name={row.company.companyName} id={row.company.id} size="sm" />
                    <span className="text-sm font-medium text-neutral-900 truncate">{row.company.companyName}</span>
                  </span>
                  <span className="text-sm tabular-nums text-neutral-700">{row.seats}</span>
                  <span className="text-[12px] text-neutral-400 truncate max-w-[5.5rem] text-right">
                    {row.company.plan?.name ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
            {!loading && ranked.length === 0 && (
              <li className="text-sm text-neutral-400 px-2 py-8 text-center">No organizations yet.</li>
            )}
          </ul>
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-neutral-700">Fleet</p>
          <Button variant="ghost" size="sm" asChild className="text-neutral-500">
            <Link href="/companies">
              Open tenants <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto rounded-[24px] bg-neutral-50/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-neutral-400">
                <th className="px-5 py-3 font-medium">Tenant</th>
                <th className="px-5 py-3 font-medium">Health</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Seats</th>
                <th className="px-5 py-3 font-medium">Onboarded</th>
                <th className="px-5 py-3 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-neutral-400">
                    Loading fleet…
                  </td>
                </tr>
              ) : fleet.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-neutral-400">
                    No organizations yet. Onboard the first tenant to stand the platform up.
                  </td>
                </tr>
              ) : (
                fleet.map((c) => {
                  const ops = getOpsItem(c, plans)
                  const limits = planLimits(c, plans)
                  const pct = usagePct(c.usage?.usersUsed, limits.maxUsers)
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-white/80 hover:bg-white/70 cursor-pointer"
                      onClick={() => router.push(`/companies/${c.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-[14rem]">
                          <TenantAvatar name={c.companyName} id={c.id} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-950 truncate">{c.companyName}</p>
                            <p className="text-[11px] font-mono text-neutral-400">{tenantCode(c.id)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <HealthBadge health={getTenantHealth(c, plans)} />
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-neutral-800">{c.plan?.name ?? "—"}</p>
                        <SubscriptionStatusBadge status={c.subscriptionStatus} />
                      </td>
                      <td className="px-5 py-3 tabular-nums text-neutral-700">
                        {(c.usage?.usersUsed ?? 0).toLocaleString("en-IN")}
                        {pct != null && <span className="text-neutral-400 text-[11px] ml-1">{pct}%</span>}
                      </td>
                      <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        {ops ? (
                          <Link href={ops.href} className="text-sm font-medium text-primary hover:text-primary-700">
                            {ops.label} →
                          </Link>
                        ) : (
                          <span className="text-neutral-400">Healthy</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        Super admin sees usage and billing only. RFQs, suppliers, and prices stay inside each tenant workspace.
      </p>
    </div>
  )
}

function InsightCard({
  label,
  value,
  title,
  dark,
  avatar,
  onClick,
}: {
  label: string
  value: string
  title: string
  dark?: boolean
  avatar?: { name: string; id: number | string }
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 w-[168px] rounded-[22px] p-4 text-left shadow-[0_8px_24px_rgba(20,20,20,0.05)]",
        dark ? "bg-ink text-white" : "bg-white border border-neutral-100",
      )}
    >
      <p className={cn("text-[11px]", dark ? "text-white/60" : "text-neutral-400")}>{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight">{value}</p>
      <div className="mt-3 flex items-center gap-2 min-w-0">
        {avatar && <TenantAvatar name={avatar.name} id={avatar.id} size="sm" />}
        <p className={cn("text-xs truncate", dark ? "text-white/80" : "text-neutral-500")}>{title}</p>
      </div>
    </button>
  )
}
