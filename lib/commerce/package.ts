import type { ModuleFlagKey, PlanFeatures } from "@/types/platform"
import { EMPTY_FEATURES } from "@/lib/constants/entitlements"

export const DEFAULT_TRIAL_DAYS = 30

export const LEAD_STATUSES = [
  { id: "new", label: "New inbound" },
  { id: "assigned", label: "Assigned" },
  { id: "contacted", label: "Called" },
  { id: "trial", label: "On trial" },
  { id: "negotiating", label: "Negotiating" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const

export const CALL_OUTCOMES = [
  { id: "connected", label: "Connected" },
  { id: "no_answer", label: "No answer" },
  { id: "callback", label: "Call back" },
  { id: "voicemail", label: "Voicemail" },
  { id: "wrong_number", label: "Wrong number" },
] as const

export interface PackageDraft {
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: PlanFeatures
  maxUsers: number | null
  maxBranches: number | null
  maxStorageBytes: number | null
}

export function emptyPackage(partial?: Partial<PackageDraft>): PackageDraft {
  return {
    name: "",
    description: "",
    priceMonthly: 0,
    priceYearly: 0,
    features: { ...EMPTY_FEATURES },
    maxUsers: 5,
    maxBranches: 1,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,
    ...partial,
  }
}

export function featuresFromKeys(keys: ModuleFlagKey[]): PlanFeatures {
  const next = { ...EMPTY_FEATURES }
  for (const key of keys) next[key] = true
  return next
}

export function enabledFeatureKeys(features: PlanFeatures): ModuleFlagKey[] {
  return (Object.keys(EMPTY_FEATURES) as ModuleFlagKey[]).filter((key) => !!features[key])
}

export function gbToBytes(gb: number | null): number | null {
  if (gb == null) return null
  return Math.round(gb * 1024 * 1024 * 1024)
}

export function bytesToGb(bytes: number | null): number | null {
  if (bytes == null) return null
  return Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10
}
