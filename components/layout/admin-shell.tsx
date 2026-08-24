"use client"

import type React from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  Layers,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  ChevronDown,
  Star,
  Clock,
  Phone,
} from "lucide-react"

const RAIL = [
  { path: "/subscriptions", label: "Billing", icon: CreditCard },
  { path: "/companies", label: "Tenants", icon: Building2 },
  { path: "/plans", label: "Plans", icon: Layers },
  { path: "/leads", label: "Inbound", icon: Phone },
  { path: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
]

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, authState } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [opsOpen, setOpsOpen] = useState(true)
  const [commerceOpen, setCommerceOpen] = useState(true)
  const user = authState.user

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(path + "/")
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const companyMatch = pathname.match(/^\/companies\/([^/]+)/)
  const companyId = companyMatch && companyMatch[1] !== "new" ? companyMatch[1] : null
  const onboarding = pathname.startsWith("/companies/new")

  const searchHint = useMemo(() => {
    if (pathname === "/") return "Try searching tenants, plans, billing…"
    if (pathname.startsWith("/companies")) return "Search tenants by name or ID…"
    if (pathname.startsWith("/leads")) return "Search inbound leads…"
    if (pathname.startsWith("/plans")) return "Search the plan catalog…"
    if (pathname.startsWith("/subscriptions")) return "Search packages, renewals, unpaid…"
    return "Search the control plane…"
  }, [pathname])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      router.push("/companies")
      return
    }
    router.push(`/companies?q=${encodeURIComponent(q)}`)
    setMobileOpen(false)
  }

  const railButton = (item: (typeof RAIL)[number], compact = false) => {
    const active = isActive(item.path, item.exact)
    return (
      <Link
        key={item.path}
        href={item.path}
        title={item.label}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          compact ? "h-10 w-10" : "h-11 w-11",
          active ? "bg-primary text-white shadow-sm" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
        )}
      >
        <item.icon className="h-[18px] w-[18px]" />
      </Link>
    )
  }

  const treeLink = (
    href: string,
    label: string,
    opts?: { exact?: boolean; count?: number; accent?: boolean; match?: boolean },
  ) => {
    const active = opts?.match === false ? false : isActive(href.split("?")[0], opts?.exact)
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] transition-colors",
          active ? "text-primary font-medium" : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50",
          opts?.accent && "text-primary font-medium",
        )}
      >
        <span className="truncate">{label}</span>
        {opts?.count != null && opts.count > 0 && (
          <span className="ml-2 min-w-5 h-5 px-1 rounded-md bg-primary text-[11px] font-semibold text-white inline-flex items-center justify-center">
            {opts.count}
          </span>
        )}
      </Link>
    )
  }

  const sidebar = (
    <div className="flex h-full min-h-0">
      <div className="w-[72px] shrink-0 flex flex-col items-center py-4 gap-3">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="h-11 w-11 rounded-full bg-ink text-white flex items-center justify-center font-semibold text-sm shadow-sm"
          title="TenetRFQ"
        >
          T
        </Link>
        <div className="flex-1 flex flex-col items-center gap-1.5 pt-2">
          {RAIL.map((item) => railButton(item))}
        </div>
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          title={user?.name || "Profile"}
          className={cn(
            "h-11 w-11 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold ring-2 ring-white shadow-sm",
            isActive("/profile") ? "ring-primary" : "bg-gradient-to-br from-rose-400 to-pink-600 text-white",
          )}
        >
          {user?.name?.slice(0, 1).toUpperCase() || <User className="h-4 w-4" />}
        </Link>
      </div>

      <div className="w-[232px] shrink-0 border-l border-neutral-100 flex flex-col min-h-0">
        <div className="px-4 pt-5 pb-3">
          <button type="button" className="flex items-center gap-1.5 text-[15px] font-semibold text-neutral-900">
            TenetRFQ
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
          </button>
          <p className="text-[11px] text-neutral-400 mt-0.5">Control plane</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4 hide-scrollbar">
          <div>
            <p className="px-2 mb-1 text-[12px] text-neutral-400 flex items-center gap-1.5">
              <Star className="h-3 w-3" /> Starred
            </p>
            {treeLink("/subscriptions", "Billing")}
            {treeLink("/leads", "Call queue")}
            {treeLink("/companies/new", "Onboard tenant")}
            {treeLink("/", "Command center", { exact: true })}
          </div>

          <div>
            <p className="px-2 mb-1 text-[12px] text-neutral-400 flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Recent
            </p>
            {companyId ? treeLink(`/companies/${companyId}`, "This tenant", { accent: true }) : (
              <p className="px-2 py-1 text-[12px] text-neutral-300">Open a tenant to pin it here</p>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setOpsOpen((v) => !v)}
              className="w-full px-2 mb-1 text-[12px] text-neutral-400 flex items-center justify-between"
            >
              Operations
              <span className="flex items-center gap-1">
                <Link
                  href="/companies/new"
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 rounded-md hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
                  aria-label="Onboard tenant"
                >
                  <Plus className="h-3 w-3" />
                </Link>
                <ChevronDown className={cn("h-3 w-3 transition-transform", !opsOpen && "-rotate-90")} />
              </span>
            </button>
            {opsOpen && (
              <div className="space-y-0.5">
                {treeLink("/", "Dashboard", { exact: true })}
                {treeLink("/companies", "Tenants")}
                {onboarding && treeLink("/companies/new", "New tenant", { accent: true })}
                {companyId && (
                  <div className="ml-3 border-l border-neutral-100 pl-2 space-y-0.5">
                    {treeLink(`/companies/${companyId}`, "Overview", { exact: true })}
                    {treeLink(`/companies/${companyId}?tab=entitlements`, "Features", { match: false })}
                    {treeLink(`/companies/${companyId}?tab=billing`, "Billing history", { match: false })}
                    {treeLink(`/companies/${companyId}?tab=control`, "Lifecycle", { match: false })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setCommerceOpen((v) => !v)}
              className="w-full px-2 mb-1 text-[12px] text-neutral-400 flex items-center justify-between"
            >
              Commerce
              <ChevronDown className={cn("h-3 w-3 transition-transform", !commerceOpen && "-rotate-90")} />
            </button>
            {commerceOpen && (
              <div className="space-y-0.5">
                {treeLink("/subscriptions", "Billing")}
                {treeLink("/plans", "Plans")}
                {treeLink("/leads", "Inbound")}
              </div>
            )}
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-neutral-100">
          {treeLink("/profile", "Profile")}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-neutral-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex min-h-screen lg:h-screen lg:overflow-hidden p-0 lg:p-3 lg:gap-3">
        <aside className="hidden lg:flex bg-white rounded-[28px] shadow-[0_8px_40px_rgba(20,20,20,0.04)] overflow-hidden shrink-0">
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden />
            <aside className="relative m-2 rounded-[24px] bg-white shadow-2xl overflow-hidden flex">
              <button
                type="button"
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="shrink-0 px-4 sm:px-2 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-neutral-700"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <form onSubmit={submitSearch} className="flex-1 max-w-xl mx-auto">
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchHint}
                  className="w-full h-11 rounded-full bg-white pl-11 pr-4 text-sm text-neutral-800 placeholder:text-neutral-400 shadow-[0_4px_20px_rgba(20,20,20,0.04)] border border-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </form>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[12px] text-neutral-500">Live</span>
            </div>
          </header>

          <main className="flex-1 min-h-0 bg-white lg:rounded-[28px] lg:shadow-[0_8px_40px_rgba(20,20,20,0.04)] overflow-auto">
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
