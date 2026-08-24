import { NextResponse } from "next/server"

const PLATFORM_LOGIN_API = "http://127.0.0.1:4005/api"
const LOCAL_AUTH_API = "http://127.0.0.1:3005/api"
const PRODUCTION_LOGIN_API = "https://arfq-api.potatobazaar.com/api"

const LOGIN_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (TenetRFQ-Admin)",
  "ngrok-skip-browser-warning": "true",
}

function stripSlash(url: string) {
  return url.replace(/\/$/, "")
}

function normalizeApiBase(raw: string) {
  const base = stripSlash(raw.trim())
  if (!base) return PLATFORM_LOGIN_API
  if (/\/api$/i.test(base)) return base
  return `${base}/api`
}

function configuredBase() {
  return normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE_URL || PLATFORM_LOGIN_API)
}

function isThisNextApp(url: string) {
  try {
    const { hostname, port } = new URL(url)
    const local = hostname === "localhost" || hostname === "127.0.0.1"
    return local && (port === "3000" || port === "3001" || port === "")
  } catch {
    return true
  }
}

function loginCandidates() {
  const seen = new Set<string>()
  const list: string[] = []
  for (const base of [PLATFORM_LOGIN_API, configuredBase(), LOCAL_AUTH_API, PRODUCTION_LOGIN_API]) {
    if (isThisNextApp(base)) continue
    if (seen.has(base)) continue
    seen.add(base)
    list.push(base)
  }
  return list.length ? list : [PLATFORM_LOGIN_API]
}

async function postLogin(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: LOGIN_HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const text = await res.text()
  let data: { success?: boolean; message?: string; data?: unknown }
  try {
    data = text ? JSON.parse(text) : { success: false, message: "Empty login response" }
  } catch {
    data = {
      success: false,
      message: `Login API at ${url} returned ${res.status} (not JSON).`,
    }
  }
  return { res, data }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: "Invalid login payload" }, { status: 400 })
  }

  const attempts: string[] = []

  for (const base of loginCandidates()) {
    const url = `${stripSlash(base)}/users/login`
    try {
      const { res, data } = await postLogin(url, body)
      attempts.push(`${res.status} ${url}`)

      if (res.status === 404 || res.status === 405) continue

      if (!data.message && !res.ok) {
        data.message = `Login failed (${res.status})`
      }
      return NextResponse.json(data, { status: res.ok ? 200 : res.status })
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unreachable"
      attempts.push(`DOWN ${url} (${detail})`)
    }
  }

  return NextResponse.json(
    {
      success: false,
      message:
        "No login API responded. In Admin-tenetRFQ-be run `npm run dev` (port 4005), then `npm run seed` if you have no Super Admin. " +
        `Tried: ${attempts.join(" → ") || "nothing"}`,
    },
    { status: 502 },
  )
}
