"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { platformService } from "@/lib/api/services/platform-service"
import type { PlatformPayment } from "@/types/platform"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  failed: "bg-red-100 text-red-800 border-red-200",
}

export function CompanyPaymentsPanel({ companyId }: { companyId: string }) {
  const [items, setItems] = useState<PlatformPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    platformService
      .getCompanyPayments(companyId)
      .then((res) => {
        if (!cancelled) setItems(res.data ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load payments")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

  return (
    <Card className="bg-white border border-gray-200/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Payment history</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 mb-3">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-gray-500 py-4">Loading payments…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No checkout attempts yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Provider</th>
                  <th className="px-2 py-2 font-medium">Purpose</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-2 py-2 whitespace-nowrap text-gray-700">
                      {new Date(p.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-2 py-2 capitalize">
                      {p.provider === "owner" ? "Covered by you" : p.provider}
                    </td>
                    <td className="px-2 py-2 capitalize">
                      {p.purpose === "grant" ? "Owner covered" : p.purpose || "—"}
                    </td>
                    <td className="px-2 py-2 font-medium">
                      {p.currency} {Number(p.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-2 py-2">
                      <Badge
                        variant="outline"
                        size="sm"
                        className={cn("capitalize", STATUS_STYLES[p.status] || "bg-slate-50")}
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
