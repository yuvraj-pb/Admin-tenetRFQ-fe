"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { platformService } from "@/lib/api/services/platform-service"
import { handleCheckoutSession } from "@/lib/billing/checkout"
import type { BillingInterval, PaymentProvider, SubscriptionPlan } from "@/types/platform"
import { formatLimit, formatStorageBytes } from "@/types/platform"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export function CreateCompanyForm() {
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [companyName, setCompanyName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [addressLine, setAddressLine] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [planId, setPlanId] = useState("")
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly")
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("razorpay")
  const [collectPayment, setCollectPayment] = useState(true)
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminMobile, setAdminMobile] = useState("")

  useEffect(() => {
    platformService
      .getPlans()
      .then((res) => {
        const list = (res.data ?? []).filter((p) => p.isActive)
        setPlans(list)
        if (list[0]) setPlanId(String(list[0].id))
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load plans")
      })
      .finally(() => setLoadingPlans(false))
  }, [])

  const selectedPlan = plans.find((p) => String(p.id) === planId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim() || !email.trim() || !adminName.trim() || !adminEmail.trim() || !planId) {
      toast.error("Please fill required fields")
      return
    }
    setSubmitting(true)
    try {
      const res = await platformService.createCompany({
        companyName: companyName.trim(),
        legalName: legalName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        addressLine: addressLine.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: "IN",
        planId: Number(planId),
        billingInterval,
        companyAdmin: {
          name: adminName.trim(),
          email: adminEmail.trim(),
          mobile: adminMobile.trim() || undefined,
        },
        collectPayment,
        paymentProvider,
      })

      const company = res.data
      const checkout = company && "checkout" in company ? company.checkout : undefined

      toast.success("Company created")

      if (checkout) {
        const result = await handleCheckoutSession(checkout)
        if (result.kind === "redirected") return
        if (result.kind === "verified") {
          toast.success("Payment verified")
        } else if (result.kind === "dismissed") {
          toast.message("Payment cancelled — finish checkout from the company page")
        }
      }

      if (company?.id) {
        router.push(`/companies/${company.id}`)
      } else {
        router.push("/companies")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-gray-600">
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Onboard Company</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-white border border-gray-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Company details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="companyName">Company name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal name</Label>
              <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST number</Label>
              <Input id="gstNumber" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Company email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="addressLine">Address</Label>
              <Input
                id="addressLine"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Company Admin</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Name *</Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminMobile">Mobile</Label>
              <Input
                id="adminMobile"
                value={adminMobile}
                onChange={(e) => setAdminMobile(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="adminEmail">Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Backend generates a temporary password and emails it to this address.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPlans ? (
              <p className="text-sm text-gray-500">Loading plans…</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                No plans returned. Seed Basic / Professional / Enterprise in the database first.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan *</Label>
                    <Select
                      value={planId}
                      onValueChange={setPlanId}
                      placeholder="Select plan"
                      options={plans.map((p) => ({ value: String(p.id), label: p.name }))}
                    />
                  </div>
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
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={collectPayment}
                        onChange={(e) => setCollectPayment(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Collect payment now (in-app checkout)
                    </label>
                  </div>
                </div>

                {selectedPlan && (
                  <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Branches</div>
                      <div className="font-semibold">{formatLimit(selectedPlan.maxBranches)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Users</div>
                      <div className="font-semibold">{formatLimit(selectedPlan.maxUsers)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Storage</div>
                      <div className="font-semibold">
                        {formatStorageBytes(selectedPlan.maxStorageBytes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Price</div>
                      <div className="font-semibold">
                        ₹
                        {(billingInterval === "monthly"
                          ? selectedPlan.priceMonthly
                          : selectedPlan.priceYearly
                        ).toLocaleString("en-IN")}
                        /{billingInterval === "monthly" ? "mo" : "yr"}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || loadingPlans}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
              </>
            ) : (
              "Create company"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
