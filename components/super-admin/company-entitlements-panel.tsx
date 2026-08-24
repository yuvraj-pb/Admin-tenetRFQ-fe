"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { platformService } from "@/lib/api/services/platform-service"
import {
  ENTITLEMENT_GROUPS,
  EMPTY_FEATURES,
  FEATURE_BY_KEY,
  FEATURE_CATALOG,
  QUOTA_CATALOG,
} from "@/lib/constants/entitlements"
import type {
  ModuleFlagKey,
  PlatformSubscription,
  QuotaKey,
  QuotaLimits,
} from "@/types/platform"
import { formatLimit, formatStorageBytes } from "@/types/platform"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, Minus, Plus, RotateCcw, Search } from "lucide-react"

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

type Tab = "modules" | "quotas"
type Filter = "all" | "enabled" | "custom" | "inPlan"

export function CompanyEntitlementsPanel({
  companyId,
  subscription,
  onUpdated,
  onGivePlan,
}: {
  companyId: string
  subscription: PlatformSubscription | null
  onUpdated: (subscription?: PlatformSubscription) => void
  onGivePlan?: () => void
}) {
  const [tab, setTab] = useState<Tab>("modules")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [saving, setSaving] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    kind: "flag"
    key: ModuleFlagKey
    next: boolean
  } | null>(null)
  const [reason, setReason] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  if (!subscription) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-950">What this company can see</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-xl leading-relaxed">
          Feature switches live on a plan. Give this company a plan first, then you can turn off RFQs,
          quotes, suppliers, or anything else so it never appears in their login.
        </p>
        {onGivePlan && (
          <Button className="mt-4 bg-slate-950 hover:bg-slate-800 text-white" onClick={onGivePlan}>
            Give them a plan
          </Button>
        )}
      </div>
    )
  }

  const entitlements = subscription.entitlements
  const flags = { ...EMPTY_FEATURES, ...(entitlements?.flags || subscription.features || {}) }
  const planFlags = { ...EMPTY_FEATURES, ...(entitlements?.planFlags || subscription.planFeatures || {}) }
  const flagOverrides = entitlements?.flagOverrides || subscription.featureOverrides || {}
  const quotas: QuotaLimits = entitlements?.quotas || {
    maxUsers: subscription.limits.maxUsers,
    maxBranches: subscription.limits.maxBranches,
    maxStorageBytes: subscription.limits.maxStorageBytes,
    maxRfqsPerMonth: null,
    maxSuppliers: null,
    maxCustomRoles: null,
  }
  const planQuotas: QuotaLimits = entitlements?.planQuotas || {
    maxUsers: subscription.limits.maxUsers,
    maxBranches: subscription.limits.maxBranches,
    maxStorageBytes: subscription.limits.maxStorageBytes,
    maxRfqsPerMonth: null,
    maxSuppliers: null,
    maxCustomRoles: null,
  }
  const quotaOverrides = entitlements?.quotaOverrides || {}
  const meta = entitlements?.meta || {}
  const paid = subscription.featuresFromPlan === true
  const customFlagCount = Object.keys(flagOverrides).length
  const customQuotaCount = Object.keys(quotaOverrides).length
  const enabledCount = FEATURE_CATALOG.filter((f) => flags[f.key]).length

  const persist = async (data: Parameters<typeof platformService.updateCompanyFeatures>[1]) => {
    const res = await platformService.updateCompanyFeatures(companyId, data)
    onUpdated(res.data ?? undefined)
    return res.data
  }

  const requestFlagChange = (key: ModuleFlagKey, next: boolean) => {
    const inPlan = !!planFlags[key]
    const isCustomVsPlan = next !== inPlan || !paid
    if (isCustomVsPlan) {
      setReason(meta[key]?.reason || "")
      setExpiresAt(meta[key]?.expiresAt ? meta[key]!.expiresAt!.slice(0, 16) : "")
      setPending({ kind: "flag", key, next })
      return
    }
    void commitFlag(key, next)
  }

  const commitFlag = async (key: ModuleFlagKey, next: boolean, extra?: { reason?: string; expiresAt?: string }) => {
    setSaving(key)
    try {
      await persist({
        flags: { [key]: next },
        targetKey: key,
        reason: extra?.reason,
        expiresAt: extra?.expiresAt || null,
      })
      toast.success(`${FEATURE_BY_KEY[key].label} ${next ? "is now visible to them" : "is now hidden from them"}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update feature")
    } finally {
      setSaving(null)
    }
  }

  const commitQuota = async (key: QuotaKey, value: number | null) => {
    setSaving(key)
    try {
      await persist({ quotas: { [key]: value }, targetKey: key })
      toast.success(`${QUOTA_CATALOG.find((q) => q.key === key)?.label} updated`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update quota")
    } finally {
      setSaving(null)
    }
  }

  const handleReset = async () => {
    setSaving("reset")
    try {
      await persist({ resetToPlan: true })
      toast.success("Entitlements reset to plan defaults")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setSaving(null)
    }
  }

  const q = query.trim().toLowerCase()
  const grouped = ENTITLEMENT_GROUPS.map((group) => {
    const items = group.flags
      .map((key) => FEATURE_BY_KEY[key])
      .filter((item) => {
        if (q && !`${item.label} ${item.description} ${item.key}`.toLowerCase().includes(q)) {
          return false
        }
        const enabled = !!flags[item.key]
        const inPlan = !!planFlags[item.key]
        const isOverride = typeof flagOverrides[item.key] === "boolean"
        if (filter === "enabled") return enabled
        if (filter === "custom") return isOverride
        if (filter === "inPlan") return inPlan
        return true
      })
    return { ...group, items }
  }).filter((g) => g.items.length > 0)

  return (
    <Card className="bg-white border border-gray-200/80 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">What this company can see</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Off = hidden in their login. On = they can use it. Plan defaults are a starting point —
              your switches always win.
            </p>
          </div>
          {(customFlagCount > 0 || customQuotaCount > 0) && (
            <Button variant="outline" size="sm" disabled={saving !== null} onClick={handleReset}>
              {saving === "reset" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Reset to plan
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" size="sm">{enabledCount} modules on</Badge>
          <Badge variant="outline" size="sm" className="bg-sky-50 text-sky-800 border-sky-200">
            {customFlagCount} custom flags
          </Badge>
          <Badge variant="outline" size="sm" className="bg-violet-50 text-violet-800 border-violet-200">
            {customQuotaCount} quota overrides
          </Badge>
          {!paid && (
            <Badge variant="outline" size="sm" className="bg-amber-50 text-amber-900 border-amber-200">
              Unpaid — plan modules locked
            </Badge>
          )}
        </div>
        <div className="flex gap-1 border-b border-gray-200">
          {(["modules", "quotas"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2 text-sm font-medium capitalize border-b-2 -mb-px",
                tab === t
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!paid && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {subscription.planName} defaults stay locked until the plan is live. You can still hide
            or show modules below — Hidden means it will not appear in their login.
          </div>
        )}

        {tab === "modules" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8"
                  placeholder="Search modules…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {([
                  ["all", "All"],
                  ["enabled", "On"],
                  ["inPlan", "In plan"],
                  ["custom", "Custom"],
                ] as const).map(([id, label]) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={filter === id ? "default" : "outline"}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {grouped.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No modules match this filter.</p>
            ) : (
              grouped.map((group) => (
                <div key={group.id} className="rounded-lg border border-gray-100">
                  <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{group.label}</p>
                    <p className="text-xs text-gray-500">{group.description}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => {
                      const enabled = !!flags[item.key]
                      const inPlan = !!planFlags[item.key]
                      const isOverride = typeof flagOverrides[item.key] === "boolean"
                      const itemMeta = meta[item.key]
                      const expired =
                        !!itemMeta?.expiresAt && new Date(itemMeta.expiresAt).getTime() <= Date.now()
                      const busy = saving === item.key
                      return (
                        <div key={item.key} className="flex items-start justify-between gap-4 px-3 py-3">
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
                              {expired && (
                                <Badge variant="outline" size="sm" className="text-[10px] bg-red-50 text-red-700">
                                  Grant expired
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                            {item.requires.length > 0 && (
                              <p className="text-[11px] text-gray-400 mt-1">
                                Requires {item.requires.map((k) => FEATURE_BY_KEY[k].label).join(", ")}
                              </p>
                            )}
                            {itemMeta?.reason && (
                              <p className="text-[11px] text-sky-800 mt-1">Reason: {itemMeta.reason}</p>
                            )}
                            {itemMeta?.expiresAt && !expired && (
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Until {new Date(itemMeta.expiresAt).toLocaleString("en-IN")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "text-[11px] font-semibold uppercase tracking-wide",
                                enabled ? "text-emerald-700" : "text-slate-400",
                              )}
                            >
                              {enabled ? "Visible" : "Hidden"}
                            </span>
                            <FeatureSwitch
                              on={enabled}
                              disabled={busy || saving !== null}
                              onChange={(next) => requestFlagChange(item.key, next)}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "quotas" && (
          <div className="space-y-2">
            {QUOTA_CATALOG.map((item) => {
              const value = quotas[item.key]
              const planValue = planQuotas[item.key]
              const isOverride = item.key in quotaOverrides
              const used =
                item.key === "maxUsers"
                  ? subscription.usage.usersUsed
                  : item.key === "maxBranches"
                    ? subscription.usage.branchesUsed
                    : item.key === "maxStorageBytes"
                      ? subscription.usage.storageUsedBytes
                      : null
              const busy = saving === item.key
              const display =
                item.unit === "bytes" ? formatStorageBytes(value) : formatLimit(value)
              const planDisplay =
                item.unit === "bytes" ? formatStorageBytes(planValue) : formatLimit(planValue)
              return (
                <div
                  key={item.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      {isOverride && (
                        <Badge
                          variant="outline"
                          size="sm"
                          className="text-[10px] bg-violet-50 text-violet-800 border-violet-200"
                        >
                          Custom
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{item.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Plan default: {planDisplay}
                      {used != null &&
                        ` · Used: ${item.unit === "bytes" ? formatStorageBytes(used) : used.toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-gray-900 w-24 text-right">{display}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || saving !== null || value == null || value <= 0}
                      onClick={() =>
                        commitQuota(item.key, Math.max(0, (value ?? item.step) - item.step) || item.step)
                      }
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || saving !== null}
                      onClick={() => commitQuota(item.key, (value ?? 0) + item.step)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || saving !== null || value == null}
                      onClick={() => commitQuota(item.key, null)}
                    >
                      Unlimited
                    </Button>
                    {isOverride && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy || saving !== null}
                        onClick={() => commitQuota(item.key, planValue)}
                      >
                        Inherit
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.next ? "Grant" : "Revoke"}{" "}
              {pending ? FEATURE_BY_KEY[pending.key].label : "module"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-gray-600">
              This is a per-company override (payment + need). Add a reason so the next admin knows
              why this tenant differs from the plan.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="entitlement-reason">Reason</Label>
              <Input
                id="entitlement-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Pilot with logistics team until Q3"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entitlement-expires">Expires (optional)</Label>
              <Input
                id="entitlement-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 text-white"
              onClick={async () => {
                if (!pending) return
                const iso = expiresAt ? new Date(expiresAt).toISOString() : undefined
                await commitFlag(pending.key, pending.next, {
                  reason: reason.trim() || "Super Admin override",
                  expiresAt: iso,
                })
                setPending(null)
                setReason("")
                setExpiresAt("")
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
