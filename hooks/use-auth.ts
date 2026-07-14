"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { toast } from "sonner"
import { useEffect, useMemo } from "react"
import { API_CONFIG } from "@/lib/constants/api"
import { AuthStorage } from "@/lib/storage/auth-storage"

/** Roles allowed into the platform admin panel. */
export const SUPER_ADMIN_ROLES = ["super-admin", "system-admin"]

/** Normalize hyphen/space/underscore variants to a single hyphenated form. */
export function normalizeRole(role?: string | null): string {
  return (role || "").toLowerCase().trim().replace(/[\s_]+/g, "-")
}

export function isSuperAdminRole(role?: string | null): boolean {
  return SUPER_ADMIN_ROLES.includes(normalizeRole(role))
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  roleSlug?: string
  permissions: string[]
  mobile?: string
  phone?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<{ user: User } | void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  clearError: () => void
  initialize: () => void
}

type AuthStore = AuthState & AuthActions

const createStorage = () => ({
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null
    try {
      return localStorage.getItem(name)
    } catch (error) {
      console.warn("Failed to read from localStorage:", error)
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(name, value)
    } catch (error) {
      console.warn("Failed to write to localStorage:", error)
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(name)
    } catch (error) {
      console.warn("Failed to remove from localStorage:", error)
    }
  },
})

const NOT_AUTHORIZED_MESSAGE = "You are not authorized for the admin panel."

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isInitialized: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.message || "Login failed")
          }

          if (!data.success || !data.data) {
            throw new Error(data.message || "Invalid response format")
          }

          const { token, user, refreshToken } = data.data

          if (!user.permissions || !Array.isArray(user.permissions)) {
            user.permissions = []
          }
          if (user.role) user.role = user.role.toLowerCase()
          if (user.roleSlug) user.roleSlug = user.roleSlug.toLowerCase()

          // Super-admin gate: reject any other role.
          const allowed = isSuperAdminRole(user.role) || isSuperAdminRole(user.roleSlug)
          if (!allowed) {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: NOT_AUTHORIZED_MESSAGE,
            })
            throw new Error(NOT_AUTHORIZED_MESSAGE)
          }

          if (typeof window !== "undefined") {
            AuthStorage.setToken(token)
            if (refreshToken) AuthStorage.setRefreshToken(refreshToken)
            AuthStorage.setUserData(user)
          }

          set({
            isAuthenticated: true,
            user,
            token,
            isLoading: false,
            error: null,
          })

          return { user }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: errorMessage,
          })
          throw error
        }
      },

      logout: () => {
        if (typeof window !== "undefined") {
          AuthStorage.clearAuth()
        }

        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        })

        if (typeof window !== "undefined") {
          toast.success("You have been logged out successfully")
        }
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => {
          if (!state.user) return state
          const updatedUser = { ...state.user, ...userData }
          if (typeof window !== "undefined") {
            AuthStorage.setUserData(updatedUser)
          }
          return { user: updatedUser }
        })
      },

      clearError: () => set({ error: null }),

      initialize: () => {
        if (typeof window === "undefined") {
          set({ isInitialized: true })
          return
        }

        try {
          const token = AuthStorage.getToken()
          const user = AuthStorage.getUserData<User>()

          if (token && user) {
            if (!user.permissions || !Array.isArray(user.permissions)) {
              user.permissions = []
            }
            if (user.role) user.role = user.role.toLowerCase()

            const allowed = isSuperAdminRole(user.role) || isSuperAdminRole(user.roleSlug)
            if (allowed && user.id && user.email) {
              set({
                isAuthenticated: true,
                user,
                token,
                isLoading: false,
                error: null,
                isInitialized: true,
              })
              return
            }
            AuthStorage.clearAuth()
          }

          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        } catch (error) {
          console.error("Error initializing auth:", error)
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        }
      },
    }),
    {
      name: "admin-auth-storage",
      storage: createJSONStorage(() => createStorage()),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== "undefined") {
          try {
            if (state.isAuthenticated && (!state.user || !state.token)) {
              state.isAuthenticated = false
              state.user = null
              state.token = null
            } else if (state.isAuthenticated && state.token && state.user) {
              AuthStorage.setToken(state.token)
              AuthStorage.setUserData(state.user)
            }
            state.isInitialized = true
            state.isLoading = false
            state.error = null
          } catch (error) {
            console.error("Error during auth state rehydration:", error)
            Object.assign(state, {
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: null,
              isInitialized: true,
            })
          }
        }
      },
    },
  ),
)

export function useAuth() {
  const store = useAuthStore()

  useEffect(() => {
    if (typeof window !== "undefined" && !store.isInitialized) {
      useAuthStore.persist.rehydrate()
      store.initialize()
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === "admin-auth-storage" ||
        event.key === "auth_token" ||
        event.key === "user_data"
      ) {
        store.initialize()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange)
      return () => window.removeEventListener("storage", handleStorageChange)
    }
  }, [store.isInitialized])

  const authState = useMemo(
    () => ({
      isAuthenticated: store.isAuthenticated,
      user: store.user,
      token: store.token,
      isLoading: store.isLoading,
      error: store.error,
      isInitialized: store.isInitialized,
    }),
    [
      store.isAuthenticated,
      store.user,
      store.token,
      store.isLoading,
      store.error,
      store.isInitialized,
    ],
  )

  return {
    authState,
    login: store.login,
    logout: store.logout,
    updateUser: store.updateUser,
    clearError: store.clearError,
    initialize: store.initialize,
  }
}

export const useAuthUser = () => useAuthStore((state) => state.user)
export const useAuthToken = () => useAuthStore((state) => state.token)
export const useAuthIsInitialized = () => useAuthStore((state) => state.isInitialized)
