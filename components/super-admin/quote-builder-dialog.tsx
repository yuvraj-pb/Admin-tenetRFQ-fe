"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { platformService } from "@/lib/api/services/platform-service"
import { PackageBuilder } from "./package-builder"
import { emptyPackage, featuresFromKeys, type PackageDraft } from "@/lib/commerce/package"
import type { BillingInterval, CommercialQuote, ModuleFlagKey } from "@/types/platform"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/api/api-error"

export function QuoteBuilderDialog({
  open,
  leadId,
  companyId,
  companyName,
  requestedFeatures,
  quote,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  leadId?: number | null
  companyId?: number | null
  companyName?: string
  requestedFeatures?: ModuleFlagKey[]
  quote?: CommercialQuote | null
  onOpenChange: (open: boolean) => void
  onSaved: (quote: CommercialQuote) => void
}) {
  const [draft, setDraft] = useState<PackageDraft>(() => fromQuote(quote, companyName, requestedFeatures))
  const [interval, setInterval] = useState<BillingInterval>(quote?.billingInterval ?? "monthly")
  const [saving, setSaving] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft(fromQuote(quote, companyName, requestedFeatures))
          setInterval(quote?.billingInterval ?? "monthly")
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{quote ? "Edit negotiated package" : "Build a negotiated package"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-neutral-500">
          Price and modules are decided after the trial, based on what they actually need. This does not charge them until you accept the quote.
        </p>
        <Select
          className="w-44"
          value={interval}
          onValueChange={(v) => setInterval(v as BillingInterval)}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
            { value: "custom", label: "Custom term" },
          ]}
        />
        <PackageBuilder value={draft} onChange={setDraft} priceLabel={interval === "yearly" ? "Yearly amount" : "Monthly amount"} />
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
                  leadId: leadId ?? null,
                  companyId: companyId ?? null,
                  name: draft.name.trim(),
                  billingInterval: interval,
                  amount: interval === "yearly" ? draft.priceYearly : draft.priceMonthly,
                  features: draft.features,
                  maxUsers: draft.maxUsers,
                  maxBranches: draft.maxBranches,
                  maxStorageBytes: draft.maxStorageBytes,
                  notes: draft.description,
                }
                const res = quote
                  ? await platformService.updateQuote(quote.id, payload)
                  : await platformService.createQuote(payload)
                if (res.data) onSaved(res.data)
                toast.success(quote ? "Quote updated" : "Quote saved as draft")
                onOpenChange(false)
              } catch (err) {
                toast.error(getApiErrorMessage(err))
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? "Saving…" : "Save quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function fromQuote(
  quote?: CommercialQuote | null,
  companyName?: string,
  requested?: ModuleFlagKey[],
): PackageDraft {
  if (quote) {
    return {
      name: quote.name,
      description: quote.notes ?? "",
      priceMonthly: quote.billingInterval === "yearly" ? Math.round(quote.amount / 10) : quote.amount,
      priceYearly: quote.billingInterval === "yearly" ? quote.amount : quote.amount * 10,
      features: quote.features ?? {},
      maxUsers: quote.maxUsers,
      maxBranches: quote.maxBranches,
      maxStorageBytes: quote.maxStorageBytes,
    }
  }
  return emptyPackage({
    name: companyName ? `Custom — ${companyName}` : "Custom package",
    ...(requested?.length ? { features: featuresFromKeys(requested) } : {}),
  })
}
