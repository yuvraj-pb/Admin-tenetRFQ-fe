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

export type BillingInterval = "monthly" | "yearly"

export type PaymentProvider = "razorpay" | "stripe"

/** Feature flags stored on a plan (seeded in DB, not hardcoded in FE). */
export interface PlanFeatures {
  analytics: boolean
  advancedAnalytics: boolean
  supplierPortal: boolean
  approvalWorkflow: boolean
  prioritySupport: boolean
  dedicatedSupport: boolean
  customIntegrations: boolean
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
  features: PlanFeatures
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
  planId: number
  billingInterval: BillingInterval
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
