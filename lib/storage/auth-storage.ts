/**
 * Single-role auth storage for the Super Admin panel.
 * One access token (`auth_token`) + refresh token + persisted user data.
 */
export class AuthStorage {
  private static readonly TOKEN_KEY = "auth_token"
  private static readonly REFRESH_TOKEN_KEY = "refresh_token"
  private static readonly USER_DATA_KEY = "user_data"

  static getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static setToken(token: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  static getRefreshToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  static setRefreshToken(token: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token)
  }

  static setUserData(user: unknown): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(user))
  }

  static getUserData<T = any>(): T | null {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem(this.USER_DATA_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  static clearAuth(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.USER_DATA_KEY)
  }
}
