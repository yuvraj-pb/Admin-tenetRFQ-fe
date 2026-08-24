"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { platformService } from "@/lib/api/services/platform-service"
import { getApiErrorMessage } from "@/lib/api/api-error"
import type { PlanKind, SubscriptionPlan } from "@/types/platform"
import { formatLimit, formatStorageBytes } from "@/types/platform"
import { FEATURE_CATALOG } from "@/lib/constants/features"
import { PlanEditorDialog } from "./plan-editor-dialog"
import { Check, Layers, Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const KINDS: { id: PlanKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "catalog", label: "List prices" },
  { id: "custom", label: "Custom" },
  { id: "trial", label: "Trial templates" },
]

export function PlansGrid() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<PlanKind | "all">("all")
  const [editor, setEditor] = useState<SubscriptionPlan | "new" | null>(null)

  const load = () => {
    setLoading(true)
    platformService
      .getPlans()
      .then((res) => setPlans(res.data ?? []))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const visible = plans.filter((p) => kind === "all" || (p.kind ?? "catalog") === kind)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-neutral-400 mb-2">Commerce</p>
          <h1 className="text-4xl font-medium tracking-tight text-neutral-300">Plans</h1>
          <p className="text-sm text-neutral-500 mt-2 max-w-2xl">
            List prices are a starting point. After the 30-day trial, build a custom package from the modules they used and the price you negotiated.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditor("new")}>
          <Plus className="h-4 w-4 mr-1.5" />
          New plan
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium border",
              kind === k.id ? "bg-primary text-white border-primary" : "bg-white text-neutral-600 border-neutral-200",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-neutral-400 py-12 text-center">Loading plans…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-[24px] bg-neutral-50 py-12 text-center text-neutral-500">
          <Layers className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
          No plans in this view. Create a catalog or custom package.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((plan) => (
              <Card key={plan.id} className="bg-neutral-50/80 border-0 shadow-none relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <p className="text-[11px] text-neutral-400 mt-1 capitalize">{plan.kind ?? "catalog"}{plan.negotiable ? " · negotiable" : ""}</p>
                    </div>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {plan.description && <p className="text-sm text-neutral-500 mt-1">{plan.description}</p>}
                  <div className="pt-3">
                    <span className="text-3xl font-semibold text-neutral-950">
                      ₹{plan.priceMonthly.toLocaleString("en-IN")}
                    </span>
                    <span className="text-neutral-400 text-sm">/mo</span>
                    <div className="text-xs text-neutral-400 mt-1">
                      or ₹{plan.priceYearly.toLocaleString("en-IN")}/yr
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <LimitRow label="Branches" value={formatLimit(plan.maxBranches)} />
                  <LimitRow label="Users" value={formatLimit(plan.maxUsers)} />
                  <LimitRow label="Storage" value={formatStorageBytes(plan.maxStorageBytes)} />
                  <div className="border-t pt-3 space-y-2">
                    {FEATURE_CATALOG.map((f) => (
                      <FeatureRow key={f.key} label={f.label} on={!!plan.features[f.key]} />
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditor(plan)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {plan.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await platformService.archivePlan(plan.id)
                            toast.success("Plan archived")
                            load()
                          } catch (err) {
                            toast.error(getApiErrorMessage(err))
                          }
                        }}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <PlanEditorDialog
        open={editor != null}
        plan={editor && editor !== "new" ? editor : null}
        defaultKind="custom"
        onOpenChange={(open) => !open && setEditor(null)}
        onSaved={() => load()}
      />
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  )
}

function FeatureRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-600">{label}</span>
      {on ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-neutral-300" />}
    </div>
  )
}
