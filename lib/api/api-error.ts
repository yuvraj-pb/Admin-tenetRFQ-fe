import axios from "axios"
import { API_CONFIG } from "@/lib/constants/api"

export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response && (error.code === "ERR_NETWORK" || error.message === "Network Error")
  }
  return error instanceof Error && /network error|failed to fetch|econnrefused/i.test(error.message)
}

export function getApiErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    const platform = API_CONFIG.PLATFORM_BASE_URL.replace(/\/$/, "")
    const login = API_CONFIG.BASE_URL.replace(/\/$/, "")
    const target =
      axios.isAxiosError(error) && String(error.config?.url || "").includes("/platform")
        ? platform
        : axios.isAxiosError(error) && error.config?.url?.startsWith("http")
          ? error.config.url
          : platform

    return (
      `Cannot reach ${target}. ` +
      `Start Admin-tenetRFQ-be on port 4005 (platform) and the main RFQ API on 3005 (login). ` +
      `Login API is ${login}.`
    )
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined
    if (data?.message) return data.message
    if (typeof data?.error === "string") return data.error
    if (error.message) return error.message
  }

  if (error instanceof Error && error.message) return error.message
  return "An unexpected error occurred"
}
