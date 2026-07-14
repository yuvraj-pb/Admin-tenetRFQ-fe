# RFQ Platform — Super Admin

Standalone **Super Admin / Platform Admin** web app for the RFQ platform. It talks to the
same backend as the main RFQ app but only uses the `/platform/*` endpoints (plus login) and
only allows the `super-admin` / `system-admin` role to sign in.

It manages **tenant companies, subscription plans, subscriptions, and billing**. It never
shows procurement data (RFQs, quotes, suppliers, prices, orders).

## Tech stack

- Next.js 15 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS + Radix UI / shadcn-style primitives
- TanStack Query, axios, zustand (persisted auth), react-hook-form + zod, sonner

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit NEXT_PUBLIC_API_BASE_URL if needed
npm run dev                  # http://localhost:3001
```

### Environment

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | yes | Main RFQ backend (login), including `/api`, no trailing slash. Local default: `http://localhost:3005/api`. |
| `NEXT_PUBLIC_PLATFORM_API_BASE_URL` | local split backends | Platform Super Admin API (`/platform/*`). Local default: `http://localhost:4005/api`. In production with a reverse proxy, omit this so it falls back to the main API base. |
| `NEXT_PUBLIC_S3_UPLOAD_HOST` | no | Upload host; falls back to the API base URL. |

**Local dual-backend setup:** run main auth on **3005**, platform service on **4005**, this app on **3001**. Both backends must share the same `JWT_SECRET` so tokens from login are accepted by `/platform/*`.

Everything is `NEXT_PUBLIC_*` — this is a browser-side app and holds no server secrets.
Razorpay/Stripe keys are **not** needed here; the backend returns the Razorpay `keyId`
(and order) or a Stripe hosted `checkoutUrl` in the checkout response.

## Routes

| Route | Page |
| --- | --- |
| `/login` | Admin login (super-admin only) |
| `/` | Platform dashboard (KPIs + recent companies) |
| `/companies` | Companies manager (list / search / filter / row actions) |
| `/companies/new` | Create company |
| `/companies/[id]` | Company detail (usage, subscription, plan change / renew / cancel) |
| `/plans` | Subscription plans grid |
| `/subscriptions` | Subscriptions manager |
| `/profile` | Profile + logout |

## Scripts

- `npm run dev` — dev server on port 3001
- `npm run build` — production build
- `npm run start` — serve the production build on port 3001
- `npm run lint` — ESLint

## Deployment

Deploy as a normal Next.js app (e.g. Vercel), ideally on a separate subdomain
(`admin.example.com`) pointing at the same backend. Set `NEXT_PUBLIC_API_BASE_URL` in the
host's env for each environment, and make sure the backend CORS allows the new origin.
