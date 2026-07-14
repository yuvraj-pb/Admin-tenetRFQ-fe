"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { platformService } from "@/lib/api/services/platform-service"
import type { SubscriptionPlan } from "@/types/platform"
import { formatLimit, formatStorageBytes } from "@/types/platform"
import { Check, X, Layers } from "lucide-react"

export function PlansGrid() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    platformService
      .getPlans()
      .then((res) => setPlans(res.data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load plans"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catalog is read-only here. Create or edit plans via backend seed / admin API.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 py-12 text-center">Loading plans…</p>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm py-12 text-center text-gray-500">
            <Layers className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            No plans returned. Seed Basic / Professional / Enterprise on the backend.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((plan) => (
              <Card key={plan.id} className="bg-white border border-gray-200/80 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-300" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  )}
                  <div className="pt-3">
                    <span className="text-3xl font-bold text-gray-900">
                      ₹{plan.priceMonthly.toLocaleString("en-IN")}
                    </span>
                    <span className="text-gray-500 text-sm">/mo</span>
                    <div className="text-xs text-gray-500 mt-1">
                      or ₹{plan.priceYearly.toLocaleString("en-IN")}/yr
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <LimitRow label="Branches" value={formatLimit(plan.maxBranches)} />
                  <LimitRow label="Users" value={formatLimit(plan.maxUsers)} />
                  <LimitRow label="Storage" value={formatStorageBytes(plan.maxStorageBytes)} />
                  <div className="border-t pt-3 space-y-2">
                    <FeatureRow label="Analytics" on={plan.features.analytics} />
                    <FeatureRow label="Advanced analytics" on={plan.features.advancedAnalytics} />
                    <FeatureRow label="Supplier portal" on={plan.features.supplierPortal} />
                    <FeatureRow label="Approval workflow" on={plan.features.approvalWorkflow} />
                    <FeatureRow label="Priority support" on={plan.features.prioritySupport} />
                    <FeatureRow label="Dedicated support" on={plan.features.dedicatedSupport} />
                    <FeatureRow label="Custom integrations" on={plan.features.customIntegrations} />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function FeatureRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      {on ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <X className="h-4 w-4 text-gray-300" />
      )}
    </div>
  )
}
