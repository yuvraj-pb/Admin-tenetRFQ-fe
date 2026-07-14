"use client"

import type React from "react"

import { useAuth, isSuperAdminRole } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authState, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to initialize
    if (!authState.isInitialized) {
      return
    }

    // If not authenticated, redirect to login
    if (!authState.isAuthenticated) {
      router.push("/login")
      return
    }

    // Enforce the super-admin gate on every protected route.
    if (authState.user) {
      const allowed =
        isSuperAdminRole(authState.user.role) || isSuperAdminRole(authState.user.roleSlug)
      if (!allowed) {
        toast.error("You are not authorized for the admin panel.")
        logout()
        router.push("/login")
      }
    }
  }, [authState.isAuthenticated, authState.isInitialized, authState.user, router, logout])

  // Show loading while auth is initializing or while redirecting
  if (!authState.isInitialized || !authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
