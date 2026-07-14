"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { platformService } from "@/lib/api/services/platform-service"
import type { PlatformDashboardStats, PlatformCompany } from "@/types/platform"
import {
  Building2,
  Users,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  Archive,
  Plus,
  ArrowRight,
} from "lucide-react"
import { StatCard } from "./stat-card"
import { CompanyStatusBadge, SubscriptionStatusBadge } from "./status-badges"

function formatCurrency(amount: number, currency = "INR") {
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

export function PlatformDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<PlatformDashboardStats | null>(null)
  const [expiring, setExpiring] = useState<PlatformCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashRes, companiesRes] = await Promise.all([
        platformService.getDashboard(),
        platformService.getCompanies({
          page: 1,
          limit: 8,
          expiringWithinDays: 30,
          sortBy: "subscriptionExpiresAt",
          sortOrder: "asc",
        }),
      ])
      setStats(dashRes.data ?? null)
      setExpiring(companiesRes.data ?? [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load platform dashboard. Backend APIs may not be ready yet."
      setError(message)
      setStats(null)
      setExpiring([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Button
          size="sm"
          className="bg-gray-900 hover:bg-gray-800 text-white w-fit"
          onClick={() => router.push("/companies/new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Onboard Company
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">API not ready:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total Companies"
          value={stats?.totalCompanies ?? 0}
          description="Onboarded tenants"
          trend="Platform-wide"
          icon={Building2}
          loading={loading}
        />
        <StatCard
          title="Active Companies"
          value={stats?.activeCompanies ?? 0}
          description="Currently active"
          trend={stats ? `${stats.activeCompanies} live` : undefined}
          icon={CheckCircle2}
          loading={loading}
        />
        <StatCard
          title="Suspended"
          value={stats?.suspendedCompanies ?? 0}
          description="Access blocked"
          trend={stats?.suspendedCompanies ? "Needs review" : "None"}
          trendPositive={!stats?.suspendedCompanies}
          icon={PauseCircle}
          loading={loading}
        />
        <StatCard
          title="Archived"
          value={stats?.archivedCompanies ?? 0}
          description="Historical tenants"
          icon={Archive}
          loading={loading}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers?.toLocaleString("en-IN") ?? 0}
          description="Across all companies"
          trend="Usage count only"
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Monthly Revenue"
          value={stats ? formatCurrency(stats.monthlyRevenue, stats.currency) : "—"}
          description="Subscription payments"
          trend="This month"
          icon={IndianRupee}
          loading={loading}
        />
        <StatCard
          title="Expiring Soon"
          value={stats?.subscriptionsExpiringSoon ?? 0}
          description={`Within ${stats?.expiringWithinDays ?? 30} days`}
          trend={stats?.subscriptionsExpiringSoon ? "Action needed" : "All clear"}
          trendPositive={!stats?.subscriptionsExpiringSoon}
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Subscriptions expiring (30 days)</h2>
          <Button variant="ghost" size="sm" asChild className="text-gray-600">
            <Link href="/subscriptions">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
          ) : expiring.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No expiring subscriptions{error ? " (waiting on API)" : ""}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Subscription</th>
                  <th className="px-5 py-3 font-medium">Expiry</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {expiring.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{c.companyName}</td>
                    <td className="px-5 py-3 text-gray-600">{c.plan?.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <CompanyStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3">
                      <SubscriptionStatusBadge status={c.subscriptionStatus} />
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {c.subscriptionExpiresAt
                        ? new Date(c.subscriptionExpiresAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/companies/${c.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
