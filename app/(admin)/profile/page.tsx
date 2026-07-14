"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { LogOut, Mail, User as UserIcon, ShieldCheck } from "lucide-react"

export default function ProfilePage() {
  const { authState, logout } = useAuth()
  const router = useRouter()
  const user = authState.user

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Profile</h1>
      <p className="text-gray-500 mb-6">Your platform admin account.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {user?.name ?? "Admin"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Mail className="h-4 w-4 text-gray-400" />
            <span>{user?.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <ShieldCheck className="h-4 w-4 text-gray-400" />
            <span className="capitalize">{user?.role ?? user?.roleSlug ?? "super-admin"}</span>
          </div>

          <div className="pt-2">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
