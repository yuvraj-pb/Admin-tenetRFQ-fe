"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { platformService } from "@/lib/api/services/platform-service"
import { getApiErrorMessage } from "@/lib/api/api-error"
import type {
  CompanyLifecycleStatus,
  PlatformCompany,
  PlatformDashboardStats,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/types/platform"
import { CompanyStatusBadge, SubscriptionStatusBadge } from "./status-badges"
import { TenantAvatar } from "./tenant-avatar"
import { UsageMeter } from "./usage-meter"
import { HealthBadge } from "./health-badge"
import { PageHeader } from "./page-header"
import { ConfirmActionDialog } from "./confirm-action-dialog"
import { StatCard } from "./stat-card"
import {
  formatDate,
  formatRelativeExpiry,
  getTenantHealth,
  planLimits,
  tenantCode,
  tenantSlug,
} from "@/lib/tenant/health"
import {
  MoreHorizontal,
  Plus,
  Search,
  Building2,
  Download,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  Clock,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type QuickFilter =
  | "all"
  | "active"
  | "watch"
  | "past_due"
  | "incomplete"
  | "expiring"
  | "suspended"
  | "archived"

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "All tenants" },
  { id: "active", label: "Live" },
  { id: "watch", label: "At risk" },
  { id: "past_due", label: "Past due" },
  { id: "incomplete", label: "Unpaid" },
  { id: "expiring", label: "Renewing 30d" },
  { id: "suspended", label: "Suspended" },
  { id: "archived", label: "Archived" },
]

function exportTenantsCsv(companies: PlatformCompany[]) {
  const rows = [
    ["id", "code", "name", "email", "status", "plan", "subscription", "users", "branches", "storageBytes", "expiry"],
    ...companies.map((c) => [
      String(c.id),
      tenantCode(c.id),
      c.companyName,
      c.email ?? "",
      c.status,
      c.plan?.name ?? "",
      c.subscriptionStatus ?? "",
      String(c.usage?.usersUsed ?? ""),
      String(c.usage?.branchesUsed ?? ""),
      String(c.usage?.storageUsedBytes ?? ""),
      c.subscriptionExpiresAt ?? "",
    ]),
  ]
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function CompaniesManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [stats, setStats] = useState<PlatformDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [quick, setQuick] = useState<QuickFilter>("all")
  const [planId, setPlanId] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState("companyName")
  const [pending, setPending] = useState<{
    type: "suspend" | "delete"
    company: PlatformCompany
  } | null>(null)

  useEffect(() => {
    const q = searchParams.get("q")
    if (q != null && q !== search) setSearch(q)
  }, [searchParams])

  const apiFilters = useMemo(() => {
    let status: CompanyLifecycleStatus | undefined
    let subscriptionStatus: SubscriptionStatus | undefined
    let expiringWithinDays: number | undefined

    if (quick === "active") status = "active"
    if (quick === "suspended") status = "suspended"
    if (quick === "archived") status = "archived"
    if (quick === "past_due") subscriptionStatus = "past_due"
    if (quick === "incomplete") subscriptionStatus = "incomplete"
    if (quick === "expiring" || quick === "watch") expiringWithinDays = 30

    return { status, subscriptionStatus, expiringWithinDays }
  }, [quick])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listRes, plansRes, dashRes] = await Promise.all([
        platformService.getCompanies({
          page,
          limit,
          search: search.trim() || undefined,
          status: apiFilters.status,
          subscriptionStatus: apiFilters.subscriptionStatus,
          expiringWithinDays: apiFilters.expiringWithinDays,
          planId: planId === "all" ? undefined : Number(planId),
          sortBy,
          sortOrder: sortBy === "createdAt" ? "desc" : "asc",
        }),
        platformService.getPlans({ skipErrorToast: true }).catch(() => ({ data: [] as SubscriptionPlan[] })),
        platformService.getDashboard().catch(() => ({ data: null })),
      ])
      setCompanies(listRes.data ?? [])
      setTotalPages(listRes.pagination?.totalPages || 1)
      setTotal(listRes.pagination?.total ?? listRes.data?.length ?? 0)
      setPlans(plansRes.data ?? [])
      setStats(dashRes.data ?? null)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, apiFilters, planId, sortBy])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action()
      toast.success(`${label} successful`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${label} failed`)
    }
  }

  const resetPassword = async (companyId: number, companyName: string) => {
    try {
      const res = await platformService.resetCompanyAdminPassword(companyId)
      if (res.data?.emailed) {
        toast.success(`Temporary password emailed for ${companyName}`)
      } else if (res.data?.temporaryPassword) {
        toast.success(`Password reset for ${companyName}`, {
          description: `Temp password: ${res.data.temporaryPassword}`,
          duration: 20000,
        })
      } else {
        toast.success(`Password reset for ${companyName}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password reset failed")
    }
  }

  const atRisk = stats?.atRiskCompanies ?? stats?.subscriptionsExpiringSoon ?? 0
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant control plane"
        title="Organizations"
        description="Every customer workspace on the platform — isolation, billing health, seat quotas, and lifecycle, without touching procurement data."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportTenantsCsv(companies)} disabled={!companies.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => router.push("/companies/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Onboard tenant
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard
          title="Tenants"
          value={stats?.totalCompanies ?? total}
          description="All organizations"
          icon={Building2}
          loading={loading && !stats}
          accent="slate"
          onClick={() => {
            setQuick("all")
            setPage(1)
          }}
        />
        <StatCard
          title="Live"
          value={stats?.activeCompanies ?? "—"}
          description="Access enabled"
          icon={CheckCircle2}
          loading={loading && !stats}
          accent="emerald"
          onClick={() => {
            setQuick("active")
            setPage(1)
          }}
        />
        <StatCard
          title="At risk"
          value={atRisk}
          description="Renewal or billing"
          trend={atRisk ? "Needs ops" : "Clear"}
          trendPositive={!atRisk}
          icon={AlertTriangle}
          loading={loading && !stats}
          accent="amber"
          onClick={() => {
            setQuick("watch")
            setPage(1)
          }}
        />
        <StatCard
          title="Suspended"
          value={stats?.suspendedCompanies ?? "—"}
          description="Access blocked"
          icon={PauseCircle}
          loading={loading && !stats}
          accent="red"
          onClick={() => {
            setQuick("suspended")
            setPage(1)
          }}
        />
        <StatCard
          title="Platform users"
          value={stats?.totalUsers?.toLocaleString("en-IN") ?? "—"}
          description="Seats across tenants"
          icon={Users}
          loading={loading && !stats}
          accent="blue"
        />
      </div>

      <div className="rounded-[24px] bg-neutral-50/70 overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setPage(1)
                  setQuick(f.id)
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                  quick === f.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9 bg-white border-neutral-200"
                placeholder="Search name, email, GST, or tenant ID…"
                value={search}
                onChange={(e) => {
                  setPage(1)
                  setSearch(e.target.value)
                }}
              />
            </div>
            <Select
              className="w-full lg:w-44"
              value={planId}
              onValueChange={(v) => {
                setPage(1)
                setPlanId(v)
              }}
              placeholder="Plan"
              options={[
                { value: "all", label: "All plans" },
                ...plans.map((p) => ({ value: String(p.id), label: p.name })),
              ]}
            />
            <Select
              className="w-full lg:w-44"
              value={sortBy}
              onValueChange={(v) => {
                setPage(1)
                setSortBy(v)
              }}
              placeholder="Sort"
              options={[
                { value: "companyName", label: "Sort: Name" },
                { value: "subscriptionExpiresAt", label: "Sort: Renewal" },
                { value: "createdAt", label: "Sort: Created" },
              ]}
            />
            <Select
              className="w-full lg:w-28"
              value={String(limit)}
              onValueChange={(v) => {
                setPage(1)
                setLimit(Number(v))
              }}
              options={[
                { value: "20", label: "20 / page" },
                { value: "50", label: "50 / page" },
                { value: "100", label: "100 / page" },
              ]}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Platform API is not running</p>
            <p className="mt-1 leading-relaxed">{error}</p>
            <p className="mt-2 text-xs text-amber-800 font-mono">
              cd ~/Downloads/Admin-tenetRFQ-be && npm run dev
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-slate-400 border-b border-slate-100">
                <th className="px-5 py-3 font-semibold">Tenant</th>
                <th className="px-5 py-3 font-semibold">Health</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Seats</th>
                <th className="px-5 py-3 font-semibold">Branches</th>
                <th className="px-5 py-3 font-semibold">Storage</th>
                <th className="px-5 py-3 font-semibold">Billing</th>
                <th className="px-5 py-3 font-semibold">Renewal</th>
                <th className="px-5 py-3 font-semibold w-12" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={9} className="px-5 py-4">
                      <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                    <Building2 className="h-9 w-9 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-700">No tenants match this view</p>
                    <p className="text-xs mt-1">Adjust filters or onboard a new organization.</p>
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const health = getTenantHealth(c, plans)
                  const limits = planLimits(c, plans)
                  const expiry = formatRelativeExpiry(c.subscriptionExpiresAt)
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-50 hover:bg-slate-50/70 cursor-pointer group"
                      onClick={() => router.push(`/companies/${c.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-[16rem]">
                          <TenantAvatar name={c.companyName} id={c.id} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/companies/${c.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold text-neutral-950 hover:text-primary truncate"
                              >
                                {c.companyName}
                              </Link>
                              <CompanyStatusBadge status={c.status} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span className="font-mono text-slate-400">{tenantCode(c.id)}</span>
                              <span>·</span>
                              <span className="truncate">{c.email || tenantSlug(c)}</span>
                              {c.city && (
                                <>
                                  <span>·</span>
                                  <span>{c.city}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <HealthBadge health={health} showReason />
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{c.plan?.name ?? "—"}</p>
                        {c.plan?.code && (
                          <p className="text-[11px] text-slate-400 font-mono">{c.plan.code}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <UsageMeter used={c.usage?.usersUsed} max={limits.maxUsers} compact />
                      </td>
                      <td className="px-5 py-3.5">
                        <UsageMeter used={c.usage?.branchesUsed} max={limits.maxBranches} compact />
                      </td>
                      <td className="px-5 py-3.5">
                        <UsageMeter
                          used={c.usage?.storageUsedBytes}
                          max={limits.maxStorageBytes}
                          kind="storage"
                          compact
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <SubscriptionStatusBadge status={c.subscriptionStatus} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            expiry.tone === "critical" && "text-red-700",
                            expiry.tone === "watch" && "text-amber-700",
                            expiry.tone === "ok" && "text-slate-700",
                            expiry.tone === "muted" && "text-slate-400",
                          )}
                        >
                          {expiry.label}
                        </p>
                        {c.subscriptionExpiresAt && (
                          <p className="text-[11px] text-slate-400">{formatDate(c.subscriptionExpiresAt)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/companies/${c.id}`)}>
                              Open workspace
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/companies/${c.id}?action=upgrade`)}>
                              Change plan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/companies/${c.id}?action=renew`)}>
                              Collect renewal
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {c.status === "active" ? (
                              <DropdownMenuItem onClick={() => setPending({ type: "suspend", company: c })}>
                                Suspend access
                              </DropdownMenuItem>
                            ) : c.status === "suspended" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  runAction("Activate", () => platformService.activateCompany(c.id))
                                }
                              >
                                Restore access
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => resetPassword(c.id, c.companyName)}>
                              Reset admin password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                runAction("Archive", () => platformService.archiveCompany(c.id))
                              }
                            >
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setPending({ type: "delete", company: c })}
                            >
                              Soft delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-white/80">
          <p className="text-xs text-slate-500">
            {loading ? "Loading…" : `Showing ${from}–${to} of ${total.toLocaleString("en-IN")} tenants`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-slate-600 tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        Super admin never loads RFQs, suppliers, quotations, or prices. Health is derived from billing, lifecycle, and quota usage.
      </p>

      <ConfirmActionDialog
        open={pending?.type === "suspend"}
        title={`Suspend ${pending?.company.companyName ?? "tenant"}?`}
        description="Users in this workspace lose access immediately. Billing is unchanged. Record a reason for the audit log."
        confirmLabel="Suspend access"
        destructive
        reasonLabel="Reason (optional)"
        onOpenChange={(open) => !open && setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return
          await runAction("Suspend", () => platformService.suspendCompany(pending.company.id, reason))
        }}
      />
      <ConfirmActionDialog
        open={pending?.type === "delete"}
        title={`Soft-delete ${pending?.company.companyName ?? "tenant"}?`}
        description="Status becomes deleted. Data is retained and can be recovered by backend ops. This is not a hard wipe."
        confirmLabel="Soft delete"
        destructive
        onOpenChange={(open) => !open && setPending(null)}
        onConfirm={async () => {
          if (!pending) return
          await runAction("Soft delete", () => platformService.softDeleteCompany(pending.company.id))
        }}
      />
    </div>
  )
}
