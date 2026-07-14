// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

export interface ApiError {
  success: false
  message: string
  error?: Record<string, any>
}

// Pagination Types
export interface PaginationParams {
  page?: number
  limit?: number
  perPage?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    perPage?: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Authentication Types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: User
    refreshToken?: string
  }
}

// User Types
export interface User {
  id: number
  name: string
  email: string
  role: string
  /** Backend-provided machine slug, e.g. "super_admin". */
  roleSlug?: string
  permissions: string[]
}
