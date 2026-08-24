import { BaseService } from "./base-service"
import { API_ENDPOINTS, platformPath } from "@/lib/constants/api"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type {
  ChangePlanRequest,
  CheckoutSessionResponse,
  CreatePlatformCompanyRequest,
  PlatformCompaniesFilters,
  PlatformCompany,
  PlatformDashboardStats,
  PlatformPayment,
  PlatformSubscription,
  PlanFeatures,
  PlatformLead,
  LeadCall,
  CommercialQuote,
  CreateLeadRequest,
  UpdateLeadRequest,
  UpsertPlanRequest,
  UpsertQuoteRequest,
  StartTrialRequest,
  ConvertLeadRequest,
  QuotaLimits,
  RenewSubscriptionRequest,
  SubscriptionPlan,
  UpdatePlatformCompanyRequest,
} from "@/types/platform"

/**
 * Platform Super Admin API client.
 * These endpoints must never return procurement/business data.
 * Locally they hit PLATFORM_BASE_URL (port 4005); login stays on the main API.
 */
export const platformService = {
  getDashboard: (): Promise<ApiResponse<PlatformDashboardStats>> =>
    BaseService.get(platformPath(API_ENDPOINTS.PLATFORM.DASHBOARD)),

  getCompanies: (
    filters?: PlatformCompaniesFilters,
  ): Promise<PaginatedResponse<PlatformCompany>> =>
    BaseService.getList(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.LIST), filters),

  getCompany: (id: string | number): Promise<ApiResponse<PlatformCompany>> =>
    BaseService.get(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.GET(id))),

  createCompany: (
    data: CreatePlatformCompanyRequest,
  ): Promise<ApiResponse<PlatformCompany & { checkout?: CheckoutSessionResponse }>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.CREATE), data),

  updateCompany: (
    id: string | number,
    data: UpdatePlatformCompanyRequest,
  ): Promise<ApiResponse<PlatformCompany>> =>
    BaseService.put(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.UPDATE(id)), data),

  suspendCompany: (id: string | number, reason?: string): Promise<ApiResponse<PlatformCompany>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.SUSPEND(id)), { reason }),

  activateCompany: (id: string | number): Promise<ApiResponse<PlatformCompany>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.ACTIVATE(id))),

  archiveCompany: (id: string | number): Promise<ApiResponse<PlatformCompany>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.ARCHIVE(id))),

  softDeleteCompany: (id: string | number): Promise<ApiResponse<void>> =>
    BaseService.delete(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.DELETE(id))),

  resetCompanyAdminPassword: (
    id: string | number,
  ): Promise<ApiResponse<{ temporaryPassword?: string; emailed: boolean }>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.COMPANIES.RESET_ADMIN_PASSWORD(id))),

  getPlans: (opts?: { skipErrorToast?: boolean }): Promise<ApiResponse<SubscriptionPlan[]>> =>
    BaseService.get(platformPath(API_ENDPOINTS.PLATFORM.PLANS.LIST), undefined, {
      skipErrorToast: opts?.skipErrorToast,
    }),

  getPlan: (id: string | number): Promise<ApiResponse<SubscriptionPlan>> =>
    BaseService.get(platformPath(API_ENDPOINTS.PLATFORM.PLANS.GET(id))),

  createPlan: (data: UpsertPlanRequest): Promise<ApiResponse<SubscriptionPlan>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.PLANS.CREATE), data),

  updatePlan: (id: string | number, data: UpsertPlanRequest): Promise<ApiResponse<SubscriptionPlan>> =>
    BaseService.put(platformPath(API_ENDPOINTS.PLATFORM.PLANS.UPDATE(id)), data),

  archivePlan: (id: string | number): Promise<ApiResponse<SubscriptionPlan>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.PLANS.ARCHIVE(id))),

  getSubscriptions: (filters?: {
    page?: number
    limit?: number
    status?: string
    expiringWithinDays?: number
  }): Promise<PaginatedResponse<PlatformSubscription>> =>
    BaseService.getList(platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.LIST), filters),

  getCompanySubscription: (
    companyId: string | number,
  ): Promise<ApiResponse<PlatformSubscription | null>> =>
    BaseService.get(
      platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.GET_BY_COMPANY(companyId)),
      undefined,
      // Missing subscription is a valid empty state — don't toast 404s.
      { skipErrorToast: true },
    ),

  changePlan: (
    companyId: string | number,
    data: ChangePlanRequest,
  ): Promise<ApiResponse<CheckoutSessionResponse>> =>
    BaseService.post(
      platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.CHANGE_PLAN(companyId)),
      data,
    ),

  renewSubscription: (
    companyId: string | number,
    data: RenewSubscriptionRequest,
  ): Promise<ApiResponse<CheckoutSessionResponse>> =>
    BaseService.post(
      platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.RENEW(companyId)),
      data,
    ),

  cancelSubscription: (
    companyId: string | number,
    atPeriodEnd = true,
  ): Promise<ApiResponse<PlatformSubscription>> =>
    BaseService.post(
      platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.CANCEL(companyId)),
      { atPeriodEnd },
    ),

  resumeSubscription: (
    companyId: string | number,
  ): Promise<ApiResponse<PlatformSubscription>> =>
    BaseService.post(
      platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.RESUME(companyId)),
    ),

  grantSubscription: (
    companyId: string | number,
    data: {
      planId?: number
      billingInterval: "monthly" | "yearly"
      reason?: string
      restoreAccess?: boolean
    },
  ): Promise<ApiResponse<PlatformSubscription>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.GRANT(companyId)), data),

  startCompanyTrial: (
    companyId: string | number,
    data: StartTrialRequest,
  ): Promise<ApiResponse<PlatformSubscription>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.SUBSCRIPTIONS.START_TRIAL(companyId)), data),

  getLeads: (filters?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    assignedToId?: number
  }): Promise<PaginatedResponse<PlatformLead>> =>
    BaseService.getList(platformPath(API_ENDPOINTS.PLATFORM.LEADS.LIST), filters, { skipErrorToast: true }),

  getLead: (id: string | number): Promise<ApiResponse<PlatformLead>> =>
    BaseService.get(platformPath(API_ENDPOINTS.PLATFORM.LEADS.GET(id))),

  createLead: (data: CreateLeadRequest): Promise<ApiResponse<PlatformLead>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.LEADS.CREATE), data),

  updateLead: (id: string | number, data: UpdateLeadRequest): Promise<ApiResponse<PlatformLead>> =>
    BaseService.patch(platformPath(API_ENDPOINTS.PLATFORM.LEADS.UPDATE(id)), data),

  assignLead: (
    id: string | number,
    data: { assignedToId?: number | null; assignedToName?: string | null },
  ): Promise<ApiResponse<PlatformLead>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.LEADS.ASSIGN(id)), data),

  getLeadCalls: (id: string | number): Promise<ApiResponse<LeadCall[]>> =>
    BaseService.get(platformPath(API_ENDPOINTS.PLATFORM.LEADS.CALLS(id)), undefined, { skipErrorToast: true }),

  logLeadCall: (
    id: string | number,
    data: { outcome: LeadCall["outcome"]; notes?: string; nextFollowUpAt?: string | null },
  ): Promise<ApiResponse<LeadCall>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.LEADS.CALLS(id)), data),

  startLeadTrial: (
    id: string | number,
    data: StartTrialRequest,
  ): Promise<ApiResponse<PlatformLead & { company?: PlatformCompany; subscription?: PlatformSubscription }>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.LEADS.START_TRIAL(id)), data),

  convertLead: (
    id: string | number,
    data: ConvertLeadRequest,
  ): Promise<ApiResponse<PlatformLead & { company?: PlatformCompany }>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.LEADS.CONVERT(id)), data),

  getQuotes: (filters?: {
    page?: number
    limit?: number
    status?: string
    leadId?: number
    companyId?: number
  }): Promise<PaginatedResponse<CommercialQuote>> =>
    BaseService.getList(platformPath(API_ENDPOINTS.PLATFORM.QUOTES.LIST), filters, { skipErrorToast: true }),

  createQuote: (data: UpsertQuoteRequest): Promise<ApiResponse<CommercialQuote>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.QUOTES.CREATE), data),

  updateQuote: (id: string | number, data: UpsertQuoteRequest): Promise<ApiResponse<CommercialQuote>> =>
    BaseService.put(platformPath(API_ENDPOINTS.PLATFORM.QUOTES.UPDATE(id)), data),

  sendQuote: (id: string | number): Promise<ApiResponse<CommercialQuote>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.QUOTES.SEND(id))),

  acceptQuote: (
    id: string | number,
    data?: { collectPayment?: boolean; paymentProvider?: "razorpay" | "stripe" | "owner"; grantWithoutPayment?: boolean },
  ): Promise<ApiResponse<CommercialQuote & { subscription?: PlatformSubscription }>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.QUOTES.ACCEPT(id)), data),

  rejectQuote: (id: string | number, reason?: string): Promise<ApiResponse<CommercialQuote>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.QUOTES.REJECT(id)), { reason }),

  updateCompanyFeatures: (
    companyId: string | number,
    data: {
      features?: Partial<PlanFeatures>
      flags?: Partial<PlanFeatures>
      quotas?: Partial<QuotaLimits>
      resetToPlan?: boolean
      reason?: string
      expiresAt?: string | null
      targetKey?: string
    },
  ): Promise<ApiResponse<PlatformSubscription>> =>
    BaseService.put(platformPath(API_ENDPOINTS.PLATFORM.FEATURES.UPDATE(companyId)), data),

  getCompanyPayments: (
    companyId: string | number,
  ): Promise<ApiResponse<PlatformPayment[]>> =>
    BaseService.get(platformPath(API_ENDPOINTS.PLATFORM.PAYMENTS.BY_COMPANY(companyId))),

  createCheckout: (data: {
    companyId: number
    planId: number
    billingInterval: "monthly" | "yearly"
    paymentProvider: "razorpay" | "stripe"
    purpose: "new" | "renew" | "upgrade" | "downgrade"
  }): Promise<ApiResponse<CheckoutSessionResponse>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.BILLING.CREATE_CHECKOUT), data),

  verifyPayment: (data: {
    provider: "razorpay" | "stripe"
    sessionId?: string
    razorpayOrderId?: string
    razorpayPaymentId?: string
    razorpaySignature?: string
  }): Promise<ApiResponse<{ subscriptionStatus: string }>> =>
    BaseService.post(platformPath(API_ENDPOINTS.PLATFORM.BILLING.VERIFY_PAYMENT), data),
}
