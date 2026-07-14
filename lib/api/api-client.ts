import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from "axios"
import { API_CONFIG, API_ENDPOINTS } from "@/lib/constants/api"
import { AuthStorage } from "@/lib/storage/auth-storage"
import { ApiNotificationHandler } from "./api-notification-handler"

class ApiClient {
  private instance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (error?: any) => void
  }> = []

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    })

    this.setupInterceptors()
  }

  private logout(): void {
    if (typeof window === "undefined") return

    AuthStorage.clearAuth()

    ApiNotificationHandler.handleError(new Error("Session expired"), {
      errorTitle: "Session Expired",
      errorMessage: "Your session has expired. Please log in again.",
      persistent: true,
    })

    setTimeout(() => {
      window.location.href = "/login"
    }, 2000)
  }

  private setupInterceptors(): void {
    // Request interceptor — attach the single Bearer token to every request.
    this.instance.interceptors.request.use(
      (config) => {
        const token = AuthStorage.getToken()
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        } else if (config.headers) {
          delete config.headers.Authorization
        }
        return config
      },
      (error) => {
        ApiNotificationHandler.handleError(error, {
          errorTitle: "Request Error",
          errorMessage: "Failed to send request. Please check your connection.",
        })
        return Promise.reject(error)
      },
    )

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError | any) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (typeof window !== "undefined" && window.location.pathname.includes("login")) {
            ApiNotificationHandler.handleError(error, {
              errorTitle: "Login Failed",
              errorMessage: "Invalid Password or Email/Username",
            })
            return Promise.reject(error)
          }

          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`
                }
                return this.instance(originalRequest)
              })
              .catch((err) => {
                this.logout()
                return Promise.reject(err)
              })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const refreshToken = AuthStorage.getRefreshToken()
            if (refreshToken) {
              const response = await this.instance.post(API_ENDPOINTS.AUTH.REFRESH, {
                refreshToken,
              })

              const payload = (response.data as any)?.data ?? response.data
              const token = payload?.token
              const nextRefreshToken = payload?.refreshToken
              const user = payload?.user

              if (!token) {
                throw new Error("Refresh response missing access token")
              }

              AuthStorage.setToken(token)
              if (nextRefreshToken) {
                AuthStorage.setRefreshToken(nextRefreshToken)
              }
              if (user) {
                AuthStorage.setUserData(user)
              }

              this.processQueue(null, token)

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`
              }
              return this.instance(originalRequest)
            } else {
              this.logout()
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null)
            this.logout()
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        if (
          error.response?.status === 401 &&
          originalRequest._retry &&
          typeof window !== "undefined" &&
          !window.location.pathname.includes("login")
        ) {
          this.logout()
        }

        // Handle other HTTP errors
        if (error.response) {
          const status = error.response.status
          let errorTitle = "Error"
          let errorMessage = ""

          if (error.config?.responseType === "blob" && error.response.data instanceof Blob) {
            try {
              const text = await error.response.data.text()
              const maybeJson = JSON.parse(text)
              errorMessage = maybeJson?.message ?? text
            } catch (e) {
              console.warn("Blob parse failed, using default message:", e)
            }
          } else if (error.response.data?.error) {
            errorMessage = error.response.data.error
          } else if (error.response.data?.errors && typeof error.response.data.errors === "object") {
            const firstError = Object.values(error.response.data.errors)[0]
            errorMessage = Array.isArray(firstError)
              ? firstError[0]
              : typeof firstError === "string"
                ? firstError
                : JSON.stringify(firstError)
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message
          } else if (typeof error.response.data === "string") {
            errorMessage = error.response.data
          }

          switch (status) {
            case 400:
              errorTitle = "Invalid Request"
              errorMessage =
                errorMessage || "The information sent to the server isn't valid. Please review and try again."
              break
            case 403:
              errorTitle = "Permission Denied"
              errorMessage = errorMessage || "You don't have the required permissions to perform this action."
              break
            case 404:
              errorTitle = "Resource Not Found"
              errorMessage = errorMessage || "The page or data you are looking for could not be located."
              break
            case 422:
              errorTitle = "Validation Failed"
              errorMessage = errorMessage || "Some of the provided fields are incorrect. Please check and submit again."
              break
            case 500:
              errorTitle = "Server Problem"
              errorMessage = errorMessage || "Something went wrong on our end. Please try again later."
              break
            case 503:
              errorTitle = "Service Down"
              errorMessage = errorMessage || "The service is temporarily unavailable. Please retry after a few minutes."
              break
          }

          if (status !== 401 && !(error.config as any)?.skipErrorToast) {
            ApiNotificationHandler.handleError(error, {
              errorTitle,
              errorMessage: errorMessage || "An unexpected error occurred",
            })
          }
        } else if (error.request) {
          ApiNotificationHandler.handleError(error, {
            errorTitle: "Server Unavailable",
            errorMessage: "Unable to connect to the server.",
          })
        }

        return Promise.reject(error)
      },
    )
  }

  private processQueue(error: any, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else {
        resolve(token)
      }
    })

    this.failedQueue = []
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.get(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.post(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.put(url, data, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.patch(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.delete(url, config)
    return response.data
  }

  get axiosInstance() {
    return this.instance
  }
}

export const apiClient = new ApiClient()
export default apiClient
