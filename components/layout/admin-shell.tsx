"use client"

import type React from "react"
import { useState } from "react"
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
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from "lucide-react"

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/companies", label: "Companies", icon: Building2 },
  { path: "/plans", label: "Plans", icon: Layers },
  { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
]

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path
    return pathname === path || pathname.startsWith(path + "/")
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const sidebarContent = (
    <>
      <div className={cn("px-4 py-5 border-b border-gray-200", collapsed && "px-2")}>
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">RFQ</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight">RFQ Platform</p>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          )}
        </Link>
      </div>

      <nav className={cn("flex-1 px-3 py-3 space-y-0.5 overflow-y-auto", collapsed && "px-2")}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path, item.exact)
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-gray-200/70 text-gray-900"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn("px-3 py-3 border-t border-gray-200 space-y-0.5", collapsed && "px-2")}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors",
            collapsed && "justify-center px-2",
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Profile" : undefined}
        >
          <User className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Profile</span>}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-[#e8e8e8] border-r border-gray-300/60 shrink-0 transition-all duration-200",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative w-64 max-w-[85vw] flex flex-col bg-[#e8e8e8] border-r border-gray-300/60 shadow-xl">
            <button
              type="button"
              className="absolute top-4 right-3 p-1 rounded-md text-gray-500 hover:bg-gray-200"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-[#f0f0f0] border-b border-gray-300/60 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-700"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-gray-900 text-sm">RFQ Admin Panel</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
