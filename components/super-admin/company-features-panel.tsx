"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { platformService } from "@/lib/api/services/platform-service"
import type { PlanFeatures, PlatformSubscription } from "@/types/platform"
import { EMPTY_FEATURES, FEATURE_CATALOG } from "@/lib/constants/features"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, RotateCcw } from "lucide-react"

function FeatureSwitch({
  on,
  disabled,
  onChange,
}: {
  on: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400",
        on ? "bg-emerald-600" : "bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition",
          on ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  )
}

export function CompanyFeaturesPanel({
  companyId,
  subscription,
  onUpdated,
}: {
  companyId: string
  subscription: PlatformSubscription | null
  onUpdated: (subscription?: PlatformSubscription) => void
}) {
  const [savingKey, setSavingKey] = useState<keyof PlanFeatures | "reset" | null>(null)

  if (!subscription) {
    return (
      <Card className="bg-white border border-gray-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Company features</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Assign a plan first, then enable or disable features for this tenant.
          </p>
        </CardContent>
      </Card>
    )
  }

  const features = subscription.features ?? EMPTY_FEATURES
  const planFeatures = subscription.planFeatures ?? features
  const overrides = subscription.featureOverrides ?? {}
  const paid = subscription.featuresFromPlan === true
  const hasOverrides = Object.keys(overrides).length > 0

  const persist = async (next: PlanFeatures) => {
    const res = await platformService.updateCompanyFeatures(companyId, { features: next })
    return res.data
  }

  const handleToggle = async (key: keyof PlanFeatures, next: boolean) => {
    setSavingKey(key)
    try {
      const updated = await persist({ ...features, [key]: next })
      toast.success(next ? `${labelFor(key)} enabled` : `${labelFor(key)} disabled`)
      onUpdated(updated ?? undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update feature")
    } finally {
      setSavingKey(null)
    }
  }

  const handleReset = async () => {
    setSavingKey("reset")
    try {
      const res = await platformService.updateCompanyFeatures(companyId, { resetToPlan: true })
      toast.success("Features reset to plan defaults")
      onUpdated(res.data ?? undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <Card className="bg-white border border-gray-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Company features</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {paid
              ? "Plan features are on. Toggle extras on or off for this tenant’s needs."
              : "Payment is not active — plan features stay off until checkout succeeds. You can still grant access manually."}
          </p>
        </div>
        {hasOverrides && (
          <Button
            variant="outline"
            size="sm"
            disabled={savingKey !== null}
            onClick={handleReset}
          >
            {savingKey === "reset" ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1" />
            )}
            Reset to plan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {!paid && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Collect payment to unlock {subscription.planName} features automatically.
          </div>
        )}
        {FEATURE_CATALOG.map((item) => {
          const enabled = features[item.key]
          const inPlan = planFeatures[item.key]
          const isOverride = typeof overrides[item.key] === "boolean"
          const busy = savingKey === item.key
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  {inPlan && (
                    <Badge variant="outline" size="sm" className="text-[10px] text-gray-500">
                      In plan
                    </Badge>
                  )}
                  {isOverride && (
                    <Badge
                      variant="outline"
                      size="sm"
                      className="text-[10px] bg-sky-50 text-sky-800 border-sky-200"
                    >
                      Custom
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
              <FeatureSwitch
                on={enabled}
                disabled={busy || savingKey !== null}
                onChange={(next) => handleToggle(item.key, next)}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function labelFor(key: keyof PlanFeatures): string {
  return FEATURE_CATALOG.find((f) => f.key === key)?.label ?? key
}
