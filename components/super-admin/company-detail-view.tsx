"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { platformService } from "@/lib/api/services/platform-service"
import { handleCheckoutSession } from "@/lib/billing/checkout"
import type {
  BillingInterval,
  PaymentProvider,
  PlatformCompany,
  PlatformSubscription,
  SubscriptionPlan,
  UpdatePlatformCompanyRequest,
} from "@/types/platform"
import { formatLimit, formatStorageBytes } from "@/types/platform"
import { CompanyStatusBadge, SubscriptionStatusBadge } from "./status-badges"
import { toast } from "sonner"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"

export function CompanyDetailView({ companyId }: { companyId: string }) {
  const searchParams = useSearchParams()
  const [company, setCompany] = useState<PlatformCompany | null>(null)
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<UpdatePlatformCompanyRequest>({})

  const [planDialog, setPlanDialog] = useState<"upgrade" | "renew" | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly")
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("razorpay")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [companyRes, subRes, plansRes] = await Promise.all([
        platformService.getCompany(companyId),
        platformService.getCompanySubscription(companyId).catch(() => ({ data: null })),
        platformService.getPlans({ skipErrorToast: true }).catch(() => ({ data: [] as SubscriptionPlan[] })),
      ])
      const c = companyRes.data ?? null
      setCompany(c)
      setSubscription(subRes?.data ?? null)
      setPlans((plansRes.data ?? []).filter((p) => p.isActive))
      if (c) {
        setForm({
          companyName: c.companyName,
          legalName: c.legalName,
          email: c.email,
          phone: c.phone,
          gstNumber: c.gstNumber,
          addressLine: c.addressLine,
          city: c.city,
          state: c.state,
          country: c.country,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company")
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const action = searchParams.get("action")
    if (action === "upgrade" || action === "renew") {
      setPlanDialog(action)
      if (subscription?.planId) setSelectedPlanId(String(subscription.planId))
    }
  }, [searchParams, subscription?.planId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await platformService.updateCompany(companyId, form)
      toast.success("Company updated")
      setEditing(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const handleCheckout = async () => {
    if (!selectedPlanId && planDialog === "upgrade") {
      toast.error("Select a plan")
      return
    }
    setCheckoutLoading(true)
    try {
      const res =
        planDialog === "renew"
          ? await platformService.renewSubscription(companyId, {
              billingInterval,
              paymentProvider,
            })
          : await platformService.changePlan(companyId, {
              planId: Number(selectedPlanId),
              billingInterval,
              paymentProvider,
            })

      const result = await handleCheckoutSession(res.data)
      if (result.kind === "redirected") return
      if (result.kind === "verified") {
        toast.success("Payment verified")
        setPlanDialog(null)
        load()
      } else if (result.kind === "dismissed") {
        toast.message("Checkout cancelled")
      } else {
        toast.success(
          paymentProvider === "razorpay"
            ? "Checkout session created (no payment widget returned)"
            : "Checkout session created",
        )
        setPlanDialog(null)
        load()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Cancel this subscription at the end of the current billing period? The company keeps access until then.",
      )
    ) {
      return
    }
    setCancelLoading(true)
    try {
      await platformService.cancelSubscription(companyId, true)
      toast.success("Subscription set to cancel at period end")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed")
    } finally {
      setCancelLoading(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      const res = await platformService.resetCompanyAdminPassword(companyId)
      if (res.data?.emailed) {
        setTempPassword(null)
        toast.success("Temporary password emailed to company admin")
      } else if (res.data?.temporaryPassword) {
        setTempPassword(res.data.temporaryPassword)
        toast.success("Password reset — copy the temporary password below")
      } else {
        setTempPassword(null)
        toast.success("Password reset")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed")
    }
  }

  const handleSuspend = async () => {
    const reason = window.prompt("Optional suspend reason (shown in audit logs):")
    if (reason === null) return
    try {
      await platformService.suspendCompany(companyId, reason.trim() || undefined)
      toast.success("Company suspended")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suspend failed")
    }
  }

  if (loading) {
    return (
      <div className="text-gray-500 text-sm py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
        Loading company…
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="max-w-5xl space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error || "Company not found"}
        </div>
      </div>
    )
  }

  const usage = subscription?.usage ?? company.usage
  const limits = subscription?.limits

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/companies">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{company.companyName}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <CompanyStatusBadge status={company.status} />
            <SubscriptionStatusBadge
              status={subscription?.status ?? company.subscriptionStatus}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPlanDialog("upgrade")}>
            Change plan
          </Button>
          <Button
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => setPlanDialog("renew")}
          >
            Renew
          </Button>
          {subscription &&
            subscription.status !== "cancelled" &&
            subscription.status !== "expired" && (
              <Button
                variant="outline"
                size="sm"
                disabled={cancelLoading}
                onClick={handleCancelSubscription}
              >
                {cancelLoading ? "Cancelling…" : "Cancel subscription"}
              </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border border-gray-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!subscription && !company.plan ? (
              <p className="text-gray-500 py-1">
                No subscription yet. Use Change plan to assign one.
              </p>
            ) : null}
            <Row label="Current plan" value={subscription?.planName ?? company.plan?.name ?? "—"} />
            <Row
              label="Expiry"
              value={
                (subscription?.currentPeriodEnd || company.subscriptionExpiresAt)
                  ? new Date(
                      subscription?.currentPeriodEnd || company.subscriptionExpiresAt!,
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            <Row
              label="Auto renew"
              value={subscription?.autoRenew == null ? "—" : subscription.autoRenew ? "Yes" : "No"}
            />
            <Row
              label="Branches"
              value={`${usage?.branchesUsed ?? 0} / ${formatLimit(limits?.maxBranches)}`}
            />
            <Row
              label="Users"
              value={`${usage?.usersUsed ?? 0} / ${formatLimit(limits?.maxUsers)}`}
            />
            <Row
              label="Storage"
              value={`${formatStorageBytes(usage?.storageUsedBytes)} / ${formatStorageBytes(limits?.maxStorageBytes)}`}
            />
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Company Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={company.companyAdmin?.name ?? "—"} />
            <Row label="Email" value={company.companyAdmin?.email ?? "—"} />
            <Row label="Mobile" value={company.companyAdmin?.mobile ?? "—"} />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleResetPassword}
            >
              Reset admin password
            </Button>
            {tempPassword && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <div className="text-amber-900 font-medium mb-1">Temporary password</div>
                <code className="text-amber-950 break-all select-all">{tempPassword}</code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(tempPassword)
                      toast.success("Copied to clipboard")
                    } catch {
                      toast.error("Could not copy")
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Company details</CardTitle>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              ["companyName", "Company name"],
              ["legalName", "Legal name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["gstNumber", "GST"],
              ["addressLine", "Address"],
              ["city", "City"],
              ["state", "State"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              {editing ? (
                <Input
                  value={(form[key] as string) || ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-gray-800 py-2">{(company as any)[key] || "—"}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-lg">Lifecycle actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {company.status === "active" && (
            <Button variant="outline" onClick={handleSuspend}>
              Suspend
            </Button>
          )}
          {company.status === "suspended" && (
            <Button
              variant="outline"
              onClick={async () => {
                await platformService.activateCompany(companyId)
                toast.success("Company activated")
                load()
              }}
            >
              Activate
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              await platformService.archiveCompany(companyId)
              toast.success("Company archived")
              load()
            }}
          >
            Archive
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Soft-delete this company? Data is retained.")) return
              await platformService.softDeleteCompany(companyId)
              toast.success("Company soft-deleted")
              load()
            }}
          >
            Soft delete
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500 border-t pt-4">
        Security boundary: this screen shows usage counts and billing only. RFQs, suppliers,
        quotations, and prices are never loaded for Super Admin.
      </p>

      <Dialog open={!!planDialog} onOpenChange={(open) => !open && setPlanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{planDialog === "renew" ? "Renew subscription" : "Change plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {planDialog === "upgrade" && (
              <div className="space-y-2">
                <Label>New plan</Label>
                <Select
                  value={selectedPlanId}
                  onValueChange={setSelectedPlanId}
                  placeholder="Select plan"
                  options={plans.map((p) => ({ value: String(p.id), label: p.name }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Billing interval</Label>
              <Select
                value={billingInterval}
                onValueChange={(v) => setBillingInterval(v as BillingInterval)}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment provider</Label>
              <Select
                value={paymentProvider}
                onValueChange={(v) => setPaymentProvider(v as PaymentProvider)}
                options={[
                  { value: "razorpay", label: "Razorpay" },
                  { value: "stripe", label: "Stripe" },
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {checkoutLoading ? "Starting…" : "Start checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
