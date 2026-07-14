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
  PlatformSubscription,
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
