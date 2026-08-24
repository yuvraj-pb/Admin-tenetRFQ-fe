"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type {
  BillingInterval,
  PaymentProvider,
  SubscriptionPlan,
} from "@/types/platform"
import { FEATURE_CATALOG } from "@/lib/constants/features"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type CheckoutDialogMode = "upgrade" | "renew" | "collect"
export type SettlementMode = "owner" | "tenant"

export function SubscriptionCheckoutDialog({
  open,
  mode,
  plans,
  selectedPlanId,
  billingInterval,
  paymentProvider,
  settlement,
  archived,
  loading,
  onOpenChange,
  onSelectedPlanId,
  onBillingInterval,
  onPaymentProvider,
  onSettlement,
  onConfirm,
}: {
  open: boolean
  mode: CheckoutDialogMode | null
  plans: SubscriptionPlan[]
  selectedPlanId: string
  billingInterval: BillingInterval
  paymentProvider: PaymentProvider
  settlement: SettlementMode
  archived?: boolean
  loading: boolean
  onOpenChange: (open: boolean) => void
  onSelectedPlanId: (id: string) => void
  onBillingInterval: (interval: BillingInterval) => void
  onPaymentProvider: (provider: PaymentProvider) => void
  onSettlement: (value: SettlementMode) => void
  onConfirm: () => void
}) {
  const selected = plans.find((p) => String(p.id) === selectedPlanId)
  const price = selected
    ? billingInterval === "yearly"
      ? selected.priceYearly
      : selected.priceMonthly
    : null

  useEffect(() => {
    if (open && !selectedPlanId && plans[0]) {
      onSelectedPlanId(String(plans[0].id))
    }
  }, [open, selectedPlanId, plans, onSelectedPlanId])

  const title =
    mode === "renew"
      ? "Extend this company’s plan"
      : mode === "collect"
        ? "Give this company a plan"
        : "Give this company a plan"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600 leading-relaxed">
            This is how you attach a product package to a company you manage. Pick Basic / Professional /
            Enterprise. After it is assigned, go to <span className="font-medium text-slate-900">Features they can see</span> and
            switch off anything that should stay hidden in their login.
          </p>

          {(mode === "upgrade" || mode === "collect") && (
            <div className="space-y-2">
              <Label>Package for this company</Label>
              <Select
                value={selectedPlanId}
                onValueChange={onSelectedPlanId}
                placeholder="Select plan"
                options={plans.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} — ₹${(billingInterval === "yearly" ? p.priceYearly : p.priceMonthly).toLocaleString("en-IN")}/${billingInterval === "yearly" ? "yr" : "mo"}`,
                }))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={billingInterval}
              onValueChange={(v) => onBillingInterval(v as BillingInterval)}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label>Who pays?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSettlement("owner")}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  settlement === "owner"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <p className="text-sm font-semibold">I cover it</p>
                <p className={cn("text-[11px] mt-1 leading-snug", settlement === "owner" ? "text-slate-300" : "text-slate-500")}>
                  Plan goes live now. Their company is not charged.
                </p>
              </button>
              <button
                type="button"
                onClick={() => onSettlement("tenant")}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  settlement === "tenant"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <p className="text-sm font-semibold">They pay</p>
                <p className={cn("text-[11px] mt-1 leading-snug", settlement === "tenant" ? "text-slate-300" : "text-slate-500")}>
                  Opens checkout for this company’s card / UPI.
                </p>
              </button>
            </div>
          </div>

          {archived && settlement === "owner" && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              This company is archived. Giving them a plan will also restore login access.
            </p>
          )}

          {settlement === "tenant" && (
            <div className="space-y-2">
              <Label>Payment gateway</Label>
              <Select
                value={paymentProvider}
                onValueChange={(v) => onPaymentProvider(v as PaymentProvider)}
                options={[
                  { value: "razorpay", label: "Razorpay (India)" },
                  { value: "stripe", label: "Stripe (cards / international)" },
                ]}
              />
            </div>
          )}
          {selected && price != null && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{selected.name} includes</span>
                <span className="font-semibold text-slate-900">
                  ₹{price.toLocaleString("en-IN")}
                  <span className="text-xs font-normal text-slate-500">
                    /{billingInterval === "yearly" ? "yr" : "mo"}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {FEATURE_CATALOG.map((f) => (
                  <div key={f.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                    {selected.features[f.key] ? (
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="h-3 w-3 text-slate-300 shrink-0" />
                    )}
                    {f.label}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                These are defaults. You can hide any of them from this company on the next screen.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading || ((mode === "upgrade" || mode === "collect") && !selectedPlanId)}
            className="bg-slate-950 hover:bg-slate-800 text-white"
          >
            {loading
              ? "Saving…"
              : settlement === "owner"
                ? "Give them this plan"
                : "Charge them for this plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
