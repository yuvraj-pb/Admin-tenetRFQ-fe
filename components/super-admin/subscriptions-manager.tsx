"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { platformService } from "@/lib/api/services/platform-service"
import type { PlatformSubscription, SubscriptionStatus } from "@/types/platform"
import { formatLimit, formatStorageBytes } from "@/types/platform"
import { SubscriptionStatusBadge } from "./status-badges"
import { CreditCard } from "lucide-react"

export function SubscriptionsManager() {
  const [items, setItems] = useState<PlatformSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<SubscriptionStatus | "all" | "expiring">("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await platformService.getSubscriptions({
        page,
        limit: 20,
        status: status === "all" || status === "expiring" ? undefined : status,
        expiringWithinDays: status === "expiring" ? 30 : undefined,
      })
      setItems(res.data ?? [])
      setTotalPages(res.pagination?.totalPages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <Select
          className="w-full sm:w-52"
          value={status}
          onValueChange={(v) => {
            setPage(1)
            setStatus(v as typeof status)
          }}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "expiring", label: "Expiring (30 days)" },
            { value: "past_due", label: "Past due" },
            { value: "expired", label: "Expired" },
            { value: "cancelled", label: "Cancelled" },
            { value: "trialing", label: "Trialing" },
          ]}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Users</th>
                  <th className="px-5 py-3 font-medium">Branches</th>
                  <th className="px-5 py-3 font-medium">Storage</th>
                  <th className="px-5 py-3 font-medium">Period end</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  items.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-900">{s.companyName}</td>
                      <td className="px-5 py-3">{s.planName}</td>
                      <td className="px-5 py-3">
                        <SubscriptionStatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3">
                        {s.usage.usersUsed} / {formatLimit(s.limits.maxUsers)}
                      </td>
                      <td className="px-5 py-3">
                        {s.usage.branchesUsed} / {formatLimit(s.limits.maxBranches)}
                      </td>
                      <td className="px-5 py-3">
                        {formatStorageBytes(s.usage.storageUsedBytes)} /{" "}
                        {formatStorageBytes(s.limits.maxStorageBytes)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                        {new Date(s.currentPeriodEnd).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/companies/${s.companyId}`}>Manage</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
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
          )}
      </div>
    </div>
  )
}
