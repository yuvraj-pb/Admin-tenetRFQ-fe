/**
 * Platform / Super Admin types.
 * Super Admin sees usage + billing only — never RFQs, suppliers, quotes, or prices.
 */

export type CompanyLifecycleStatus = "active" | "suspended" | "archived" | "deleted"

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "trialing"
  | "incomplete"

export type BillingInterval = "monthly" | "yearly" | "custom"

export type PlanKind = "catalog" | "custom" | "trial"

export type LeadStatus = "new" | "assigned" | "contacted" | "trial" | "negotiating" | "won" | "lost"

export type LeadSource = "landing" | "manual" | "referral" | "inbound_call" | "other"

export type CallOutcome = "connected" | "no_answer" | "callback" | "wrong_number" | "voicemail"

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired"

export type PaymentProvider = "razorpay" | "stripe" | "owner"

export type ModuleFlagKey =
  | "rfqCore"
  | "approvalWorkflow"
  | "quotes"
  | "negotiations"
  | "rfqDeletionApprovals"
  | "supplierPortal"
  | "supplierNetwork"
  | "orders"
  | "dispatch"
  | "deliveries"
  | "quality"
  | "slaDisputes"
  | "approvalsHub"
  | "users"
  | "roles"
  | "branches"
  | "analytics"
  | "advancedAnalytics"
  | "analyticsExport"
  | "qualityAnalytics"
  | "notifications"
  | "customIntegrations"
  | "prioritySupport"
  | "dedicatedSupport"

export type QuotaKey =
  | "maxUsers"
  | "maxBranches"
  | "maxStorageBytes"
  | "maxRfqsPerMonth"
  | "maxSuppliers"
  | "maxCustomRoles"

export type ModuleFlags = Record<ModuleFlagKey, boolean>
export type QuotaLimits = Record<QuotaKey, number | null>

/** Feature flags stored on a plan (JSONB — extra keys allowed). */
export type PlanFeatures = Partial<ModuleFlags> & Record<string, boolean | undefined>

export interface EntitlementMeta {
  reason?: string
  expiresAt?: string | null
  updatedAt?: string
}

export interface CompanyEntitlements {
  flags: PlanFeatures
  planFlags: PlanFeatures
  flagOverrides: Partial<ModuleFlags>
  quotas: QuotaLimits
  planQuotas: QuotaLimits
  quotaOverrides: Partial<QuotaLimits>
  meta: Record<string, EntitlementMeta>
}

export interface SubscriptionPlan {
  id: number
  code: string
  name: string
  description?: string
  priceMonthly: number
  priceYearly: number
  currency: string
  /** null = unlimited */
  maxBranches: number | null
  maxUsers: number | null
  /** bytes; null = unlimited */
  maxStorageBytes: number | null
  features: PlanFeatures
  isActive: boolean
  sortOrder: number
  /** catalog = list price, custom = negotiated, trial = 30-day template */
  kind?: PlanKind
  negotiable?: boolean
  trialDays?: number | null
  companyId?: number | null
}

export interface UpsertPlanRequest {
  code?: string
  name: string
  description?: string
  priceMonthly: number
  priceYearly: number
  currency?: string
  maxBranches: number | null
  maxUsers: number | null
  maxStorageBytes: number | null
  features: PlanFeatures
  isActive?: boolean
  kind?: PlanKind
  negotiable?: boolean
  trialDays?: number | null
  sortOrder?: number
}

export interface PlatformLead {
  id: number
  companyName: string
  contactName: string
  email: string
  phone?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
  requestedFeatures: ModuleFlagKey[]
  requestedUsers?: number | null
  requestedBranches?: number | null
  source: LeadSource
  status: LeadStatus
  assignedToId?: number | null
  assignedToName?: string | null
  companyId?: number | null
  trialEndsAt?: string | null
  lastContactedAt?: string | null
  nextFollowUpAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface CreateLeadRequest {
  companyName: string
  contactName: string
  email: string
  phone?: string
  city?: string
  state?: string
  notes?: string
  requestedFeatures?: ModuleFlagKey[]
  requestedUsers?: number | null
  requestedBranches?: number | null
  source?: LeadSource
}

export interface UpdateLeadRequest {
  status?: LeadStatus
  assignedToId?: number | null
  assignedToName?: string | null
  notes?: string
  requestedFeatures?: ModuleFlagKey[]
  requestedUsers?: number | null
  requestedBranches?: number | null
  nextFollowUpAt?: string | null
}

export interface LeadCall {
  id: number
  leadId: number
  companyId?: number | null
  outcome: CallOutcome
  notes?: string | null
  nextFollowUpAt?: string | null
  createdByName?: string | null
  createdAt: string
}

export interface CommercialQuote {
  id: number
  leadId?: number | null
  companyId?: number | null
  companyName?: string
  name: string
  status: QuoteStatus
  billingInterval: BillingInterval
  amount: number
  currency: string
  features: PlanFeatures
  maxUsers: number | null
  maxBranches: number | null
  maxStorageBytes: number | null
  notes?: string | null
  validUntil?: string | null
  createdAt: string
  updatedAt?: string
}

export interface UpsertQuoteRequest {
  leadId?: number | null
  companyId?: number | null
  name: string
  billingInterval: BillingInterval
  amount: number
  currency?: string
  features: PlanFeatures
  maxUsers: number | null
  maxBranches: number | null
  maxStorageBytes: number | null
  notes?: string
  validUntil?: string | null
}

export interface StartTrialRequest {
  trialDays?: number
  trainingIncluded?: boolean
  notes?: string
  features?: PlanFeatures
  maxUsers?: number | null
  maxBranches?: number | null
  maxStorageBytes?: number | null
}

export interface ConvertLeadRequest {
  quoteId?: number
  planId?: number
  billingInterval?: BillingInterval
  collectPayment?: boolean
  paymentProvider?: PaymentProvider
  grantWithoutPayment?: boolean
  reason?: string
}

export interface PlatformUsage {
  branchesUsed: number
  usersUsed: number
  /** bytes used by company-owned uploads */
  storageUsedBytes: number
}

export interface PlatformCompanyAdmin {
  id: number
  name: string
  email: string
  mobile?: string
}

export interface PlatformCompany {
  id: number
  companyName: string
  legalName?: string
  email?: string
  phone?: string
  gstNumber?: string
  addressLine?: string
  city?: string
  state?: string
  country?: string
  status: CompanyLifecycleStatus
  plan?: Pick<SubscriptionPlan, "id" | "code" | "name"> | null
  subscriptionStatus?: SubscriptionStatus | null
  subscriptionExpiresAt?: string | null
  usage?: PlatformUsage
  companyAdmin?: PlatformCompanyAdmin | null
  createdAt: string
  updatedAt?: string
  /** URL-safe tenant handle. Frontend derives one if the API omits it. */
  slug?: string
  /** ISO region, e.g. ap-south-1. */
  region?: string
  /** Internal ops tags. */
  tags?: string[]
  /** Last tenant-admin activity (ISO). */
  lastActiveAt?: string | null
}

export interface PlatformSubscription {
  id: number
  companyId: number
  companyName: string
  planId: number
  planName: string
  planCode: string
  status: SubscriptionStatus
  billingInterval: BillingInterval
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  autoRenew: boolean
  amount: number
  currency: string
  paymentProvider?: PaymentProvider | null
  usage: PlatformUsage
  limits: {
    maxBranches: number | null
    maxUsers: number | null
    maxStorageBytes: number | null
  }
  trialEndsAt?: string | null
  trialDays?: number | null
  isCustom?: boolean
  quoteId?: number | null
  /** Effective entitlements (plan + payment status + Super Admin overrides). */
  features: PlanFeatures
  /** Features included on the assigned plan (before overrides / unpaid lock). */
  planFeatures?: PlanFeatures
  /** Only keys that differ from the current base. */
  featureOverrides?: Partial<PlanFeatures>
  /** True when plan-included features are unlocked by a paid status. */
  featuresFromPlan?: boolean
  entitlements?: CompanyEntitlements
}

export type PaymentStatus = "pending" | "paid" | "failed"

export type PaymentPurpose = "new" | "renew" | "upgrade" | "downgrade" | "grant"

export interface PlatformPayment {
  id: number
  companyId: number
  subscriptionId?: number | null
  provider: PaymentProvider | string
  providerOrderId?: string | null
  providerPaymentId?: string | null
  amount: number
  currency: string
  status: PaymentStatus | string
  purpose?: PaymentPurpose | string | null
  createdAt: string
}

export interface PlatformDashboardStats {
  totalCompanies: number
  activeCompanies: number
  suspendedCompanies: number
  archivedCompanies: number
  totalUsers: number
  monthlyRevenue: number
  currency: string
  subscriptionsExpiringSoon: number
  /** companies whose subscription ends within N days (default 30) */
  expiringWithinDays: number
  pastDueCompanies?: number
  incompleteCompanies?: number
  trialingCompanies?: number
  atRiskCompanies?: number
  newCompaniesThisMonth?: number
}

export interface CreatePlatformCompanyRequest {
  companyName: string
  legalName?: string
  email: string
  phone?: string
  gstNumber?: string
  addressLine?: string
  city?: string
  state?: string
  country?: string
  planId?: number
  billingInterval?: BillingInterval
  startTrial?: boolean
  trialDays?: number
  companyAdmin: {
    name: string
    email: string
    mobile?: string
    /** If omitted, backend generates a temp password and emails it */
    password?: string
  }
  /** Start checkout immediately after create */
  collectPayment?: boolean
  paymentProvider?: PaymentProvider
}

export interface UpdatePlatformCompanyRequest {
  companyName?: string
  legalName?: string
  email?: string
  phone?: string
  gstNumber?: string
  addressLine?: string
  city?: string
  state?: string
  country?: string
}

export interface ChangePlanRequest {
  planId: number
  billingInterval: BillingInterval
  paymentProvider: PaymentProvider
}

export interface RenewSubscriptionRequest {
  billingInterval: BillingInterval
  paymentProvider: PaymentProvider
}

export interface CheckoutSessionResponse {
  provider: PaymentProvider
  /** Stripe Checkout URL or Razorpay checkout payload */
  checkoutUrl?: string
  /** Razorpay order id / Stripe session id */
  sessionId: string
  companyId?: number
  /**
   * Provider keys missing — FE auto-verifies instead of opening the live gateway.
   */
  stub?: boolean
  razorpay?: {
    keyId: string
    orderId: string
    amount: number
    currency: string
    name: string
    description: string
    prefill?: { name?: string; email?: string; contact?: string }
  }
}

export interface PlatformCompaniesFilters {
  page?: number
  limit?: number
  search?: string
  status?: CompanyLifecycleStatus | "all"
  planId?: number
  subscriptionStatus?: SubscriptionStatus | "all"
  expiringWithinDays?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export function formatStorageBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "Unlimited"
  if (bytes < 1024) return `${bytes} B`
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB`
}

export function formatLimit(value: number | null | undefined): string {
  if (value == null) return "Unlimited"
  return value.toLocaleString()
}
