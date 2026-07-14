"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import type {
  CompanyLifecycleStatus,
  PlatformCompany,
  SubscriptionPlan,
} from "@/types/platform"
import { formatStorageBytes } from "@/types/platform"
import { CompanyStatusBadge, SubscriptionStatusBadge } from "./status-badges"
import { MoreHorizontal, Plus, Search, Building2 } from "lucide-react"
import { toast } from "sonner"

export function CompaniesManager() {
  const router = useRouter()
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<CompanyLifecycleStatus | "all">("all")
  const [planId, setPlanId] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listRes, plansRes] = await Promise.all([
        platformService.getCompanies({
          page,
          limit: 20,
          search: search.trim() || undefined,
          status: status === "all" ? undefined : status,
          planId: planId === "all" ? undefined : Number(planId),
        }),
        platformService.getPlans({ skipErrorToast: true }).catch(() => ({ data: [] as SubscriptionPlan[] })),
      ])
      setCompanies(listRes.data ?? [])
      setTotalPages(listRes.pagination?.totalPages || 1)
      setPlans(plansRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies")
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [page, search, status, planId])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const runAction = async (
    label: string,
    action: () => Promise<unknown>,
  ) => {
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

  const suspendCompany = async (companyId: number) => {
    const reason = window.prompt("Optional suspend reason (shown in audit logs):")
    if (reason === null) return
    await runAction("Suspend", () =>
      platformService.suspendCompany(companyId, reason.trim() || undefined),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <Button
          size="sm"
          className="bg-gray-900 hover:bg-gray-800 text-white w-fit"
          onClick={() => router.push("/companies/new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Company
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search company name, email…"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
            />
          </div>
          <Select
            className="w-full md:w-44"
            value={status}
            onValueChange={(v) => {
              setPage(1)
              setStatus(v as CompanyLifecycleStatus | "all")
            }}
            placeholder="Status"
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "archived", label: "Archived" },
              { value: "deleted", label: "Deleted" },
            ]}
          />
          <Select
            className="w-full md:w-48"
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
        </div>
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
                  <th className="px-5 py-3 font-medium">Users</th>
                  <th className="px-5 py-3 font-medium">Branches</th>
                  <th className="px-5 py-3 font-medium">Storage</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Expiry</th>
                  <th className="px-5 py-3 font-medium w-12" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      Loading companies…
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No companies found
                    </td>
                  </tr>
                ) : (
                  companies.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/companies/${c.id}`}
                          className="font-medium text-gray-900 hover:text-gray-700"
                        >
                          {c.companyName}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5">{c.email || "—"}</div>
                      </td>
                      <td className="px-5 py-3">{c.plan?.name ?? "—"}</td>
                      <td className="px-5 py-3">{c.usage?.usersUsed?.toLocaleString() ?? "—"}</td>
                      <td className="px-5 py-3">{c.usage?.branchesUsed ?? "—"}</td>
                      <td className="px-5 py-3">
                        {formatStorageBytes(c.usage?.storageUsedBytes)}
                      </td>
                      <td className="px-5 py-3 space-y-1">
                        <CompanyStatusBadge status={c.status} />
                        <div>
                          <SubscriptionStatusBadge status={c.subscriptionStatus} />
                        </div>
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
                      <td className="px-5 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/companies/${c.id}`)}>
                              View subscription
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/companies/${c.id}?action=upgrade`)}
                            >
                              Upgrade / change plan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/companies/${c.id}?action=renew`)}
                            >
                              Renew
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {c.status === "active" ? (
                              <DropdownMenuItem onClick={() => suspendCompany(c.id)}>
                                Suspend
                              </DropdownMenuItem>
                            ) : c.status === "suspended" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  runAction("Activate", () => platformService.activateCompany(c.id))
                                }
                              >
                                Activate
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
                              onClick={() => {
                                if (
                                  confirm(
                                    `Soft-delete ${c.companyName}? Data is retained; status becomes deleted.`,
                                  )
                                ) {
                                  runAction("Soft delete", () =>
                                    platformService.softDeleteCompany(c.id),
                                  )
                                }
                              }}
                            >
                              Soft delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
