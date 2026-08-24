"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { CompanyEntitlementsPanel } from "./company-entitlements-panel"
import { CompanyPaymentsPanel } from "./company-payments-panel"
import {
  SubscriptionCheckoutDialog,
  type CheckoutDialogMode,
  type SettlementMode,
} from "./subscription-checkout-dialog"
import { TenantAvatar } from "./tenant-avatar"
import { UsageMeter } from "./usage-meter"
import { HealthBadge } from "./health-badge"
import { ConfirmActionDialog } from "./confirm-action-dialog"
import { QuoteBuilderDialog } from "./quote-builder-dialog"
import { DEFAULT_TRIAL_DAYS } from "@/lib/commerce/package"
import { getApiErrorMessage } from "@/lib/api/api-error"
import {
  formatDate,
  formatRelativeExpiry,
  getTenantHealth,
  tenantCode,
  tenantSlug,
} from "@/lib/tenant/health"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Copy,
  Loader2,
  RefreshCw,
  MapPin,
  Calendar,
  Shield,
} from "lucide-react"

type Tab = "overview" | "entitlements" | "billing" | "control"

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "entitlements", label: "Features they can see" },
  { id: "billing", label: "Billing history" },
  { id: "control", label: "Lifecycle" },
]

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
  const [tab, setTab] = useState<Tab>("overview")

  const [planDialog, setPlanDialog] = useState<CheckoutDialogMode | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly")
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("razorpay")
  const [settlement, setSettlement] = useState<SettlementMode>("owner")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [paymentsTick, setPaymentsTick] = useState(0)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)

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
      setPaymentsTick((n) => n + 1)
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
    if (action === "upgrade" || action === "renew" || action === "collect") {
      setPlanDialog(action)
    }
    const nextTab = searchParams.get("tab")
    if (nextTab === "entitlements" || nextTab === "billing" || nextTab === "control" || nextTab === "overview") {
      setTab(nextTab)
    }
  }, [searchParams])

  useEffect(() => {
    if (subscription?.planId && !selectedPlanId) {
      setSelectedPlanId(String(subscription.planId))
    }
    if (subscription?.billingInterval) {
      setBillingInterval(subscription.billingInterval)
    }
    if (subscription?.paymentProvider === "stripe" || subscription?.paymentProvider === "razorpay") {
      setPaymentProvider(subscription.paymentProvider)
    }
  }, [subscription, selectedPlanId])

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
    if ((planDialog === "upgrade" || planDialog === "collect") && !selectedPlanId) {
      toast.error("Select a plan")
      return
    }
    setCheckoutLoading(true)
    const interval = billingInterval === "yearly" ? "yearly" : "monthly"
    try {
      if (settlement === "owner") {
        await platformService.grantSubscription(companyId, {
          planId: Number(selectedPlanId || subscription?.planId),
          billingInterval: interval,
          reason: "Covered by platform operator — tenant not charged",
          restoreAccess: true,
        })
        toast.success("Plan assigned. Now hide any modules this company should not see.")
        setPlanDialog(null)
        setTab("entitlements")
        load()
        return
      }

      const gateway = paymentProvider === "stripe" ? "stripe" : "razorpay"
      let res
      if (planDialog === "renew") {
        res = await platformService.renewSubscription(companyId, {
          billingInterval: interval,
          paymentProvider: gateway,
        })
      } else if (planDialog === "collect") {
        res = await platformService.createCheckout({
          companyId: Number(companyId),
          planId: Number(selectedPlanId || subscription?.planId),
          billingInterval: interval,
          paymentProvider: gateway,
          purpose: "new",
        })
      } else {
        res = await platformService.changePlan(companyId, {
          planId: Number(selectedPlanId),
          billingInterval: interval,
          paymentProvider: gateway,
        })
      }

      const result = await handleCheckoutSession(res.data)
      if (result.kind === "redirected") return
      if (result.kind === "verified") {
        toast.success("Tenant payment verified — plan features unlocked")
        setPlanDialog(null)
        load()
      } else if (result.kind === "dismissed") {
        toast.message("Tenant checkout cancelled")
      } else {
        toast.success("Checkout session created")
        setPlanDialog(null)
        load()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not activate plan")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleCancelSubscription = async (atPeriodEnd: boolean) => {
    setCancelLoading(true)
    try {
      await platformService.cancelSubscription(companyId, atPeriodEnd)
      toast.success(
        atPeriodEnd
          ? "Subscription will cancel at period end"
          : "Subscription cancelled immediately — plan features are off",
      )
      setCancelOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed")
    } finally {
      setCancelLoading(false)
    }
  }

  const handleResume = async () => {
    try {
      await platformService.resumeSubscription(companyId)
      toast.success("Auto-renew restored")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume failed")
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

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy")
    }
  }

  if (loading) {
    return (
      <div className="text-slate-500 text-sm py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
        Loading tenant workspace…
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="max-w-5xl space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to tenants
          </Link>
        </Button>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error || "Tenant not found"}
        </div>
      </div>
    )
  }

  const usage = subscription?.usage ?? company.usage
  const limits = subscription?.limits
  const canResume =
    !!subscription &&
    subscription.cancelAtPeriodEnd &&
    subscription.status !== "cancelled" &&
    subscription.status !== "expired"
  const needsPayment =
    !!subscription &&
    (subscription.status === "incomplete" || subscription.status === "past_due")
  const canCancel =
    !!subscription &&
    subscription.status !== "cancelled" &&
    subscription.status !== "expired"
  const health = getTenantHealth(company, plans)
  const expiry = formatRelativeExpiry(subscription?.currentPeriodEnd ?? company.subscriptionExpiresAt)
  const code = tenantCode(company.id)
  const slug = tenantSlug(company)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-slate-600">
        <Link href="/companies">
          <ArrowLeft className="h-4 w-4 mr-1" /> All tenants
        </Link>
      </Button>

      <div className="rounded-[24px] bg-neutral-50/80 overflow-hidden">
        <div className="px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <TenantAvatar name={company.companyName} id={company.id} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-medium tracking-tight text-neutral-900 truncate">{company.companyName}</h1>
                  <CompanyStatusBadge status={company.status} />
                  <SubscriptionStatusBadge status={subscription?.status ?? company.subscriptionStatus} />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-neutral-500">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-mono hover:text-neutral-900"
                    onClick={() => copy(code, "Tenant ID")}
                  >
                    {code} <Copy className="h-3 w-3" />
                  </button>
                  <span className="text-neutral-300">·</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-mono hover:text-neutral-900"
                    onClick={() => copy(slug, "Slug")}
                  >
                    {slug} <Copy className="h-3 w-3" />
                  </button>
                  {(company.city || company.state) && (
                    <>
                      <span className="text-neutral-300">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[company.city, company.state].filter(Boolean).join(", ")}
                      </span>
                    </>
                  )}
                  <span className="text-neutral-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Onboarded {formatDate(company.createdAt)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <HealthBadge health={health} />
                  {subscription?.cancelAtPeriodEnd && subscription.status === "active" && (
                    <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      Cancels at period end
                    </span>
                  )}
                  {health.reasons[0] && health.level !== "healthy" && (
                    <span className="text-xs text-neutral-500">{health.reasons.join(" · ")}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button size="sm" onClick={() => setPlanDialog("upgrade")}>
                {subscription?.planName || company.plan?.name ? "Change plan" : "Give them a plan"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuoteOpen(true)}>
                Negotiate package
              </Button>
              <Button size="sm" variant="info" onClick={() => setTab("entitlements")}>
                Control features
              </Button>
              {(!subscription || subscription.status === "expired" || subscription.status === "cancelled") && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={trialLoading}
                  onClick={async () => {
                    setTrialLoading(true)
                    try {
                      await platformService.startCompanyTrial(companyId, {
                        trialDays: DEFAULT_TRIAL_DAYS,
                        trainingIncluded: true,
                      })
                      toast.success(`${DEFAULT_TRIAL_DAYS}-day trial started with training`)
                      load()
                    } catch (err) {
                      toast.error(getApiErrorMessage(err))
                    } finally {
                      setTrialLoading(false)
                    }
                  }}
                >
                  Start {DEFAULT_TRIAL_DAYS}-day trial
                </Button>
              )}
              {needsPayment && (
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => {
                    if (subscription?.planId) setSelectedPlanId(String(subscription.planId))
                    setPlanDialog("collect")
                  }}
                >
                  Activate plan
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlanDialog("renew")}
                >
                  Renew
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 pb-5">
          <HeroStat label="Current plan" value={subscription?.planName ?? company.plan?.name ?? "Unassigned"} />
          <HeroStat
            label="Contract value"
            value={
              subscription
                ? `${subscription.currency} ${Number(subscription.amount).toLocaleString("en-IN")}`
                : "—"
            }
            hint={subscription?.billingInterval ? capitalize(subscription.billingInterval) : undefined}
          />
          <HeroStat
            label="Renewal"
            value={expiry.label}
            hint={formatDate(subscription?.currentPeriodEnd ?? company.subscriptionExpiresAt)}
            tone={expiry.tone}
          />
          <HeroStat
            label="Region"
            value={company.region ?? "ap-south-1"}
            hint={company.country || "IN"}
          />
        </div>

        {subscription?.status === "trialing" && (
          <div className="mx-6 mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            30-day trial with onboarding/training. Ends {formatDate(subscription.trialEndsAt ?? subscription.currentPeriodEnd)}.
            Negotiate a custom package from the modules they actually use before converting.
          </div>
        )}

        <div className="px-4 pb-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 text-sm whitespace-nowrap transition-colors rounded-full",
                tab === t.id ? "bg-primary/10 text-primary font-medium" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuotaCard
              title="Seats"
              used={usage?.usersUsed}
              max={limits?.maxUsers}
              footnote="Active users in this tenant"
            />
            <QuotaCard
              title="Branches"
              used={usage?.branchesUsed}
              max={limits?.maxBranches}
              footnote="Org units / locations"
            />
            <QuotaCard
              title="Storage"
              used={usage?.storageUsedBytes}
              max={limits?.maxStorageBytes}
              kind="storage"
              footnote="Company-owned uploads only"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border border-slate-200/80 shadow-sm hover:shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!subscription && !company.plan ? (
                  <p className="text-slate-500 py-1">
                    No subscription yet. Assign a plan and collect payment to unlock modules.
                  </p>
                ) : null}
                <Row label="Interval" value={subscription?.billingInterval ? capitalize(subscription.billingInterval) : "—"} />
                <Row
                  label="Gateway"
                  value={
                    (subscription?.paymentProvider as string | undefined) === "owner"
                      ? "Covered by you"
                      : subscription?.paymentProvider
                        ? capitalize(subscription.paymentProvider)
                        : "—"
                  }
                />
                <Row
                  label="Period"
                  value={
                    subscription?.currentPeriodStart && subscription?.currentPeriodEnd
                      ? `${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}`
                      : company.subscriptionExpiresAt
                        ? `Expires ${formatDate(company.subscriptionExpiresAt)}`
                        : "—"
                  }
                />
                <Row
                  label="Auto renew"
                  value={subscription?.autoRenew == null ? "—" : subscription.autoRenew ? "Yes" : "No"}
                />
                <div className="flex flex-wrap gap-2 pt-2">
                  {canResume && (
                    <Button variant="outline" size="sm" onClick={handleResume}>
                      Resume auto-renew
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
                      Cancel subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200/80 shadow-sm hover:shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Tenant admin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Name" value={company.companyAdmin?.name ?? "—"} />
                <Row label="Email" value={company.companyAdmin?.email ?? "—"} />
                <Row label="Mobile" value={company.companyAdmin?.mobile ?? "—"} />
                <Button variant="outline" size="sm" className="mt-2" onClick={handleResetPassword}>
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
                      onClick={() => copy(tempPassword, "Password")}
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border border-slate-200/80 shadow-sm hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Legal & contact</CardTitle>
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
                    <p className="text-sm text-slate-800 py-2">{company[key] || "—"}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "entitlements" && (
      <CompanyEntitlementsPanel
        companyId={companyId}
        subscription={subscription}
        onGivePlan={() => setPlanDialog("upgrade")}
        onUpdated={(updated) => {
            if (updated) setSubscription(updated)
            else load()
          }}
        />
      )}

      {tab === "billing" && <CompanyPaymentsPanel key={paymentsTick} companyId={companyId} />}

      {tab === "control" && (
        <Card className="bg-white border border-slate-200/80 shadow-sm hover:shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Lifecycle controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              These actions change tenant access. They do not delete procurement records. Every action should be
              written to the backend audit log.
            </p>
            <div className="flex flex-wrap gap-2">
              {company.status === "active" && (
                <Button variant="outline" onClick={() => setSuspendOpen(true)}>
                  Suspend access
                </Button>
              )}
              {company.status === "suspended" && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await platformService.activateCompany(companyId)
                    toast.success("Tenant access restored")
                    load()
                  }}
                >
                  Restore access
                </Button>
              )}
              <Button
                variant="outline"
                onClick={async () => {
                  await platformService.archiveCompany(companyId)
                  toast.success("Tenant archived")
                  load()
                }}
              >
                Archive
              </Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Soft delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 border-t pt-4">
        <Shield className="h-3 w-3" />
        Security boundary: usage counts and billing only. RFQs, suppliers, quotations, and prices are never loaded for Super Admin.
      </p>

      <QuoteBuilderDialog
        open={quoteOpen}
        companyId={Number(companyId)}
        companyName={company.companyName}
        onOpenChange={setQuoteOpen}
        onSaved={() => load()}
      />

      <SubscriptionCheckoutDialog
        open={!!planDialog}
        mode={planDialog}
        plans={plans}
        selectedPlanId={selectedPlanId}
        billingInterval={billingInterval}
        paymentProvider={paymentProvider}
        settlement={settlement}
        archived={company.status === "archived" || company.status === "suspended"}
        loading={checkoutLoading}
        onOpenChange={(open) => !open && setPlanDialog(null)}
        onSelectedPlanId={setSelectedPlanId}
        onBillingInterval={setBillingInterval}
        onPaymentProvider={setPaymentProvider}
        onSettlement={setSettlement}
        onConfirm={handleCheckout}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Cancel at period end keeps access until{" "}
            {subscription?.currentPeriodEnd
              ? formatDate(subscription.currentPeriodEnd)
              : "the current period ends"}
            . Immediate cancel turns plan features off now.
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep subscription
            </Button>
            <Button variant="outline" disabled={cancelLoading} onClick={() => handleCancelSubscription(true)}>
              {cancelLoading ? "Cancelling…" : "Cancel at period end"}
            </Button>
            <Button variant="destructive" disabled={cancelLoading} onClick={() => handleCancelSubscription(false)}>
              Cancel immediately
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={suspendOpen}
        title="Suspend tenant access?"
        description="Users in this workspace lose access immediately. Billing is unchanged."
        confirmLabel="Suspend"
        destructive
        reasonLabel="Reason (optional)"
        onOpenChange={setSuspendOpen}
        onConfirm={async (reason) => {
          await platformService.suspendCompany(companyId, reason)
          toast.success("Tenant suspended")
          load()
        }}
      />
      <ConfirmActionDialog
        open={deleteOpen}
        title="Soft-delete this tenant?"
        description="Status becomes deleted. Data is retained. This is not a hard wipe."
        confirmLabel="Soft delete"
        destructive
        onOpenChange={setDeleteOpen}
        onConfirm={async () => {
          await platformService.softDeleteCompany(companyId)
          toast.success("Tenant soft-deleted")
          load()
        }}
      />
    </div>
  )
}

function HeroStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: "ok" | "watch" | "critical" | "muted"
}) {
  return (
    <div className="rounded-[20px] bg-white px-5 py-4 shadow-[0_4px_16px_rgba(20,20,20,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold mt-1 truncate",
          tone === "critical" && "text-red-700",
          tone === "watch" && "text-amber-700",
          tone !== "critical" && tone !== "watch" && "text-slate-950",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function QuotaCard({
  title,
  used,
  max,
  kind = "count",
  footnote,
}: {
  title: string
  used?: number | null
  max?: number | null
  kind?: "count" | "storage"
  footnote: string
}) {
  return (
    <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_16px_rgba(20,20,20,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3">{title}</p>
      <UsageMeter used={used} max={max} kind={kind} />
      <p className="text-[11px] text-slate-400 mt-3">
        {kind === "storage"
          ? `${formatStorageBytes(used)} of ${formatStorageBytes(max)}`
          : `${(used ?? 0).toLocaleString("en-IN")} of ${formatLimit(max)}`}
        {" · "}
        {footnote}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
