"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ENTITLEMENT_GROUPS, FEATURE_BY_KEY } from "@/lib/constants/entitlements"
import { bytesToGb, gbToBytes, type PackageDraft } from "@/lib/commerce/package"
import type { ModuleFlagKey } from "@/types/platform"
import { cn } from "@/lib/utils"

export function PackageBuilder({
  value,
  onChange,
  priceLabel = "Negotiated monthly",
}: {
  value: PackageDraft
  onChange: (next: PackageDraft) => void
  priceLabel?: string
}) {
  const set = (patch: Partial<PackageDraft>) => onChange({ ...value, ...patch })
  const toggle = (key: ModuleFlagKey, on: boolean) => {
    onChange({ ...value, features: { ...value.features, [key]: on } })
  }
  const storageGb = bytesToGb(value.maxStorageBytes)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Package name</Label>
          <Input value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Custom — Mantra Agri" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Internal notes</Label>
          <textarea
            value={value.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={2}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm"
            placeholder="What they asked for on the call, training, discounts…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{priceLabel} (₹)</Label>
          <Input
            type="number"
            min={0}
            value={value.priceMonthly}
            onChange={(e) => {
              const monthly = Number(e.target.value) || 0
              set({ priceMonthly: monthly, priceYearly: monthly * 10 })
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Yearly (₹)</Label>
          <Input
            type="number"
            min={0}
            value={value.priceYearly}
            onChange={(e) => set({ priceYearly: Number(e.target.value) || 0 })}
          />
          <p className="text-[11px] text-neutral-400">Default is 10× monthly. Edit after a yearly discount.</p>
        </div>
        <QuotaField
          label="Users"
          value={value.maxUsers}
          onChange={(maxUsers) => set({ maxUsers })}
        />
        <QuotaField
          label="Branches"
          value={value.maxBranches}
          onChange={(maxBranches) => set({ maxBranches })}
        />
        <div className="sm:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Storage (GB)</Label>
            <label className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={storageGb == null}
                onChange={(e) => set({ maxStorageBytes: e.target.checked ? null : gbToBytes(5) })}
              />
              Unlimited
            </label>
          </div>
          <Input
            type="number"
            min={1}
            disabled={storageGb == null}
            value={storageGb ?? ""}
            onChange={(e) => set({ maxStorageBytes: gbToBytes(Number(e.target.value) || 1) })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-neutral-800">Modules they can use</p>
        {ENTITLEMENT_GROUPS.filter((g) => g.id !== "commercial").map((group) => (
          <div key={group.id} className="rounded-2xl bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-500 mb-2">{group.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {group.flags.map((key) => {
                const meta = FEATURE_BY_KEY[key]
                const on = !!value.features[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key, !on)}
                    className={cn(
                      "text-left rounded-xl px-3 py-2 text-sm border transition-colors",
                      on ? "bg-white border-primary/30 text-neutral-950" : "bg-transparent border-transparent text-neutral-500 hover:bg-white",
                    )}
                  >
                    <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", on ? "bg-primary" : "bg-neutral-300")} />
                    {meta?.label ?? key}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuotaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (next: number | null) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <label className="text-[11px] text-neutral-500 flex items-center gap-1.5">
          <input type="checkbox" checked={value == null} onChange={(e) => onChange(e.target.checked ? null : 1)} />
          Unlimited
        </label>
      </div>
      <Input
        type="number"
        min={1}
        disabled={value == null}
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
      />
    </div>
  )
}
