// API Configuration
// Login stays on the main RFQ backend (BASE_URL). Platform Super Admin routes
// live on a separate service locally (PORT 4005) unless a reverse proxy unifies them.
const MAIN_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://arfq-api.potatobazaar.com/api"
const PLATFORM_API_BASE =
  process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL || MAIN_API_BASE

export const API_CONFIG = {
  BASE_URL: MAIN_API_BASE,
  /** Base for `/platform/*` — defaults to BASE_URL when unset (prod reverse-proxy). */
  PLATFORM_BASE_URL: PLATFORM_API_BASE,
  // Upload host. Falls back to the main API base when a dedicated upload host isn't set.
  S3_UPLOAD_HOST:
    process.env.NEXT_PUBLIC_S3_UPLOAD_HOST ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://arfq-api.potatobazaar.com/api",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const

/** Resolve a platform path against PLATFORM_BASE_URL (absolute URL when it differs from login base). */
export function platformPath(path: string): string {
  const base = API_CONFIG.PLATFORM_BASE_URL.replace(/\/$/, "")
  if (base === API_CONFIG.BASE_URL.replace(/\/$/, "")) return path
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

// API Endpoints — Super Admin only touches AUTH + PLATFORM.
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: "/users/login",
    REFRESH: "/users/refresh-token",
  },

  /**
   * Platform Super Admin APIs.
   * All routes require role=super-admin. Must NEVER return RFQ/supplier/quote/price data.
   */
  PLATFORM: {
    DASHBOARD: "/platform/dashboard",
    COMPANIES: {
      LIST: "/platform/companies",
      CREATE: "/platform/companies",
      GET: (id: string | number) => `/platform/companies/${id}`,
      UPDATE: (id: string | number) => `/platform/companies/${id}`,
      SUSPEND: (id: string | number) => `/platform/companies/${id}/suspend`,
      ACTIVATE: (id: string | number) => `/platform/companies/${id}/activate`,
      ARCHIVE: (id: string | number) => `/platform/companies/${id}/archive`,
      /** Soft delete only */
      DELETE: (id: string | number) => `/platform/companies/${id}`,
      RESET_ADMIN_PASSWORD: (id: string | number) =>
        `/platform/companies/${id}/reset-admin-password`,
    },
    PLANS: {
      LIST: "/platform/plans",
      GET: (id: string | number) => `/platform/plans/${id}`,
    },
    SUBSCRIPTIONS: {
      LIST: "/platform/subscriptions",
      GET_BY_COMPANY: (companyId: string | number) =>
        `/platform/companies/${companyId}/subscription`,
      CHANGE_PLAN: (companyId: string | number) =>
        `/platform/companies/${companyId}/subscription/change-plan`,
      RENEW: (companyId: string | number) =>
        `/platform/companies/${companyId}/subscription/renew`,
      CANCEL: (companyId: string | number) =>
        `/platform/companies/${companyId}/subscription/cancel`,
    },
    BILLING: {
      CREATE_CHECKOUT: "/platform/billing/checkout",
      VERIFY_PAYMENT: "/platform/billing/verify",
    },
  },
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

// Query Keys for TanStack Query
export const QUERY_KEYS = {
  PLATFORM: {
    DASHBOARD: ["platform", "dashboard"] as const,
    COMPANIES: {
      ALL: ["platform", "companies"] as const,
      LIST: (filters?: unknown) => ["platform", "companies", "list", filters] as const,
      DETAIL: (id: string | number) => ["platform", "companies", "detail", id] as const,
    },
    PLANS: {
      ALL: ["platform", "plans"] as const,
      LIST: ["platform", "plans", "list"] as const,
      DETAIL: (id: string | number) => ["platform", "plans", "detail", id] as const,
    },
    SUBSCRIPTIONS: {
      ALL: ["platform", "subscriptions"] as const,
      LIST: (filters?: unknown) => ["platform", "subscriptions", "list", filters] as const,
      BY_COMPANY: (companyId: string | number) =>
        ["platform", "subscriptions", "company", companyId] as const,
    },
  },
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  FORBIDDEN: "Access denied. You don't have permission to access this resource.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: "Successfully logged in!",
  LOGOUT: "Successfully logged out!",
  UPDATE: "Updated successfully!",
  CREATE: "Created successfully!",
  DELETE: "Deleted successfully!",
  SAVE: "Saved successfully!",
} as const
