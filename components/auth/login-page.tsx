"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      toast.success("Login successful!")
      setIsRedirecting(true)
      setIsLoading(false)
      setTimeout(() => {
        router.push("/")
      }, 400)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid credentials. Please try again."
      toast.error(message)
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Please wait...</h2>
          <p className="text-gray-600 text-lg">Redirecting to platform dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">RFQ Platform</p>
              <p className="text-xs text-gray-500">Super Admin Panel</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3 leading-tight">Admin Sign In</h2>
            <p className="text-gray-600 text-lg">Manage tenants, plans, subscriptions & billing.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your admin email"
                required
                className="h-14 px-4 bg-white/80 backdrop-blur-sm border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 shadow-sm text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-14 px-4 pr-12 bg-white/80 backdrop-blur-sm border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 shadow-sm text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-base shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-gray-500">
              Only <span className="font-semibold">super-admin</span> accounts can access this panel.
            </p>
          </form>
        </div>
      </div>

      {/* Right — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 items-center justify-center text-white p-16">
        <div className="max-w-lg">
          <h1 className="text-5xl font-bold mb-6 leading-tight">Platform Administration</h1>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Onboard tenant companies, control subscription plans, and keep billing healthy — all
            from one secure console.
          </p>
          <div className="space-y-4">
            {[
              "Tenant company lifecycle management",
              "Subscription plans & billing controls",
              "Usage insights across every tenant",
              "Secure, role-gated access",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-lg font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
