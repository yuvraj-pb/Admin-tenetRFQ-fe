"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { platformService } from "@/lib/api/services/platform-service"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

function BillingReturnInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState("Completing payment…")
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const status = searchParams.get("status")
    const sessionId = searchParams.get("session_id")
    const companyId = searchParams.get("companyId")
    const dest = companyId ? `/companies/${companyId}` : "/subscriptions"

    const go = (delay = 800) => {
      window.setTimeout(() => router.replace(dest), delay)
    }

    if (status === "cancelled") {
      setMessage("Checkout cancelled. Returning…")
      go()
      return
    }

    if (!sessionId) {
      setMessage("No payment session found. Returning…")
      go()
      return
    }

    platformService
      .verifyPayment({ provider: "stripe", sessionId })
      .then(() => {
        setMessage("Payment verified. Unlocking plan features…")
        go(600)
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Could not verify payment")
        go(1800)
      })
  }, [router, searchParams])

  return (
    <div className="max-w-md mx-auto py-16">
      <Card className="bg-white border border-gray-200/80 shadow-sm">
        <CardContent className="py-10 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
          <p className="text-sm text-gray-700">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BillingReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-gray-500">Loading…</div>
      }
    >
      <BillingReturnInner />
    </Suspense>
  )
}
