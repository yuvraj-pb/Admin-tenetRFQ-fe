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
  const { login, authState } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (authState.isInitialized && authState.isAuthenticated) {
      router.replace("/")
    }
  }, [authState.isAuthenticated, authState.isInitialized, router])

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
      toast.error("Sign in failed", { description: message, duration: 8000 })
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-medium text-neutral-900 mb-2">Please wait…</h2>
          <p className="text-neutral-500">Opening the control plane</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-canvas p-3">
      <div className="w-full lg:w-[48%] min-h-[calc(100vh-1.5rem)] bg-white rounded-[28px] flex flex-col justify-center px-8 lg:px-16 py-12 shadow-[0_8px_40px_rgba(20,20,20,0.04)]">
        <div className="w-full max-w-md mx-auto">
          <a href="/" className="mb-10 flex items-center gap-3 w-fit">
            <div className="w-11 h-11 rounded-full bg-ink flex items-center justify-center">
              <span className="text-white font-semibold text-sm">R</span>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 leading-tight">RFQ Cloud</p>
              <p className="text-xs text-neutral-400">Operator access</p>
            </div>
          </a>

          <div className="mb-8">
            <p className="text-sm text-primary font-medium mb-2">Operator access</p>
            <h2 className="text-4xl font-semibold text-neutral-950 mb-2 tracking-tight leading-tight">Sign in</h2>
            <p className="text-neutral-500">Manage tenants, entitlements, and billing for the platform.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-700 font-medium text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your admin email"
                required
                className="h-12 px-4 bg-neutral-50 border-neutral-200 text-base text-neutral-950"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-700 font-medium text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-12 px-4 pr-12 bg-neutral-50 border-neutral-200 text-base text-neutral-950"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-neutral-400">
              Only <span className="font-semibold text-neutral-600">super-admin</span> accounts can access this panel.
            </p>
            <p className="text-center text-sm">
              <a href="/" className="text-neutral-500 hover:text-neutral-800">
                Back to RFQ Cloud
              </a>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-16">
        <div className="max-w-lg">
          <p className="text-sm text-primary font-medium mb-3">RFQ Cloud</p>
          <h1 className="text-5xl font-semibold text-neutral-900 mb-6 tracking-tight leading-tight">
            Operator control plane
          </h1>
          <p className="text-lg text-neutral-500 mb-10 leading-relaxed">
            Onboard organizations, gate modules by plan, and keep billing healthy — without ever touching a tenant’s RFQs.
          </p>
          <div className="space-y-3">
            {[
              "Isolated tenant workspaces",
              "Health, quotas, and billing ops",
              "Plan entitlements per organization",
              "Role-gated super-admin access",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <span className="text-neutral-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
