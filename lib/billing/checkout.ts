import { platformService } from "@/lib/api/services/platform-service"
import type { CheckoutSessionResponse } from "@/types/platform"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, handler: (response: unknown) => void) => void
    }
  }
}

const PLACEHOLDER_KEY_PREFIXES = ["rzp_test_placeholder", "rzp_live_placeholder"]

function isAbsoluteHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function isUnusableRazorpayKey(keyId?: string): boolean {
  if (!keyId?.trim()) return true
  return PLACEHOLDER_KEY_PREFIXES.some((p) => keyId.startsWith(p))
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay requires a browser"))
  }
  if (window.Razorpay) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]')
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")))
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.dataset.razorpayCheckout = "true"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"))
    document.body.appendChild(script)
  })
}

export type CheckoutResult =
  | { kind: "redirected" }
  | { kind: "verified"; subscriptionStatus: string }
  | { kind: "dismissed" }
  | { kind: "noop" }

async function verifyStubSession(
  checkout: CheckoutSessionResponse,
): Promise<CheckoutResult> {
  const verifyRes = await platformService.verifyPayment({
    provider: checkout.provider,
    sessionId: checkout.sessionId,
  })
  return {
    kind: "verified",
    subscriptionStatus: verifyRes.data?.subscriptionStatus ?? "active",
  }
}

/**
 * Handle a platform checkout response.
 * - Stripe: redirect only when checkoutUrl is an absolute http(s) URL
 * - Razorpay: open Checkout.js and verify payment with the platform API
 * - Stub (no provider keys): auto-verify so local onboarding isn't blocked
 */
export async function handleCheckoutSession(
  checkout: CheckoutSessionResponse | null | undefined,
): Promise<CheckoutResult> {
  if (!checkout) return { kind: "noop" }

  // Local / unconfigured providers — skip live Checkout.js (avoids rzp_test_placeholder 401).
  if (
    checkout.stub ||
    checkout.sessionId.startsWith("order_dev_") ||
    checkout.sessionId.startsWith("cs_dev_") ||
    isUnusableRazorpayKey(checkout.razorpay?.keyId)
  ) {
    return verifyStubSession(checkout)
  }

  if (checkout.checkoutUrl) {
    if (!isAbsoluteHttpUrl(checkout.checkoutUrl)) {
      throw new Error(
        `Invalid checkout URL from server: "${checkout.checkoutUrl}". Expected an absolute http(s) URL.`,
      )
    }
    window.location.href = checkout.checkoutUrl
    return { kind: "redirected" }
  }

  if (checkout.razorpay) {
    await loadRazorpayScript()
    if (!window.Razorpay) {
      throw new Error("Razorpay Checkout is unavailable")
    }

    const rz = checkout.razorpay
    return new Promise<CheckoutResult>((resolve, reject) => {
      let settled = false
      let paymentStarted = false
      const finish = (result: CheckoutResult) => {
        if (settled) return
        settled = true
        resolve(result)
      }
      const fail = (err: unknown) => {
        if (settled) return
        settled = true
        reject(err instanceof Error ? err : new Error("Payment failed"))
      }

      const rzp = new window.Razorpay!({
        key: rz.keyId,
        amount: rz.amount,
        currency: rz.currency,
        name: rz.name,
        description: rz.description,
        order_id: rz.orderId,
        prefill: rz.prefill,
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          paymentStarted = true
          try {
            const verifyRes = await platformService.verifyPayment({
              provider: "razorpay",
              sessionId: checkout.sessionId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            finish({
              kind: "verified",
              subscriptionStatus: verifyRes.data?.subscriptionStatus ?? "active",
            })
          } catch (err) {
            fail(err)
          }
        },
        modal: {
          ondismiss: () => {
            if (!paymentStarted) finish({ kind: "dismissed" })
          },
        },
      })

      rzp.on("payment.failed", (response: unknown) => {
        paymentStarted = true
        let message = "Razorpay payment failed"
        if (response && typeof response === "object" && "error" in response) {
          const description = (response as { error?: { description?: string } }).error
            ?.description
          if (typeof description === "string" && description.trim()) {
            message = description
          }
        }
        fail(new Error(message))
      })

      try {
        rzp.open()
      } catch (err) {
        fail(err)
      }
    })
  }

  return { kind: "noop" }
}
