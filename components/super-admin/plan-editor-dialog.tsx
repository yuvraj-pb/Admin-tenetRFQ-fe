"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { platformService } from "@/lib/api/services/platform-service"
import { PackageBuilder } from "./package-builder"
import { emptyPackage, type PackageDraft } from "@/lib/commerce/package"
import type { PlanKind, SubscriptionPlan } from "@/types/platform"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/api/api-error"

export function PlanEditorDialog({
  open,
  plan,
  defaultKind = "custom",
  onOpenChange,
  onSaved,
}: {
  open: boolean
  plan?: SubscriptionPlan | null
  defaultKind?: PlanKind
  onOpenChange: (open: boolean) => void
  onSaved: (plan: SubscriptionPlan) => void
}) {
  const [draft, setDraft] = useState<PackageDraft>(() => fromPlan(plan))
  const [kind, setKind] = useState<PlanKind>(plan?.kind ?? defaultKind)
  const [saving, setSaving] = useState(false)

  const reset = (nextPlan?: SubscriptionPlan | null) => {
    setDraft(fromPlan(nextPlan))
    setKind(nextPlan?.kind ?? defaultKind)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset(plan)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "New custom plan"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-neutral-500">
          Catalog plans are starting prices. Custom plans are negotiated packages — features and price are decided after the trial.
        </p>
        <div className="flex gap-2">
          {(["catalog", "custom", "trial"] as PlanKind[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                kind === id ? "bg-ink text-white border-ink" : "bg-white text-neutral-600 border-neutral-200"
              }`}
            >
              {id === "catalog" ? "List price" : id === "trial" ? "Trial template" : "Custom / negotiated"}
            </button>
          ))}
        </div>
        <PackageBuilder value={draft} onChange={setDraft} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saving || !draft.name.trim()}
            onClick={async () => {
              setSaving(true)
              try {
                const payload = {
                  name: draft.name.trim(),
                  description: draft.description,
                  priceMonthly: draft.priceMonthly,
                  priceYearly: draft.priceYearly,
                  maxUsers: draft.maxUsers,
                  maxBranches: draft.maxBranches,
                  maxStorageBytes: draft.maxStorageBytes,
                  features: draft.features,
                  kind,
                  negotiable: kind !== "trial",
                  trialDays: kind === "trial" ? 30 : null,
                  isActive: true,
                }
                const res = plan
                  ? await platformService.updatePlan(plan.id, payload)
                  : await platformService.createPlan(payload)
                if (res.data) onSaved(res.data)
                toast.success(plan ? "Plan updated" : "Plan created")
                onOpenChange(false)
              } catch (err) {
                toast.error(getApiErrorMessage(err))
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? "Saving…" : plan ? "Save plan" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function fromPlan(plan?: SubscriptionPlan | null): PackageDraft {
  if (!plan) return emptyPackage()
  return {
    name: plan.name,
    description: plan.description ?? "",
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    features: plan.features ?? {},
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
    maxStorageBytes: plan.maxStorageBytes,
  }
}
