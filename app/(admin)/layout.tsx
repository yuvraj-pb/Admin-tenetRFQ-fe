import type React from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { AdminShell } from "@/components/layout/admin-shell"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  )
}
