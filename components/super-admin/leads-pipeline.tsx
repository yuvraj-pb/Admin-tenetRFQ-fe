"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
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
import { getApiErrorMessage } from "@/lib/api/api-error"
import type { CallOutcome, LeadCall, LeadStatus, ModuleFlagKey, PlatformLead } from "@/types/platform"
import { FEATURE_CATALOG } from "@/lib/constants/entitlements"
import { CALL_OUTCOMES, DEFAULT_TRIAL_DAYS, LEAD_STATUSES } from "@/lib/commerce/package"
import { QuoteBuilderDialog } from "./quote-builder-dialog"
import { PageHeader } from "./page-header"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Phone, Plus, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const FILTERS: { id: LeadStatus | "all" | "queue"; label: string }[] = [
  { id: "queue", label: "Call queue" },
  { id: "all", label: "All" },
  ...LEAD_STATUSES.map((s) => ({ id: s.id, label: s.label })),
]

export function LeadsPipeline() {
  const { authState } = useAuth()
  const [leads, setLeads] = useState<PlatformLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("queue")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<PlatformLead | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status =
        filter === "all" || filter === "queue"
          ? undefined
          : filter
      const res = await platformService.getLeads({ page: 1, limit: 100, search: search.trim() || undefined, status })
      let rows = res.data ?? []
      if (filter === "queue") {
        rows = rows.filter((l) => l.status === "new" || l.status === "assigned" || l.status === "contacted")
      }
      setLeads(rows)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Commerce"
        title="Inbound"
        description="Landing-page signups land here. Callers contact them, start a 30-day trial with training, then negotiate a custom plan from the features they actually need."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add lead
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium border",
              filter === f.id ? "bg-primary text-white border-primary" : "bg-white text-neutral-600 border-neutral-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Input
        placeholder="Search company, contact, phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Leads API is not live yet</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs">The backend agent needs GET/POST /platform/leads. You can still add a lead once that route exists — landing-page submissions will use the same table.</p>
        </div>
      )}

      <div className="rounded-[24px] bg-neutral-50/70 overflow-hidden">
        {loading ? (
          <p className="px-5 py-12 text-center text-neutral-400">Loading inbound…</p>
        ) : leads.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-neutral-300" />
            <p className="font-medium text-neutral-800">No inbound leads in this view</p>
            <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
              When the landing form is live it will POST here. Until then, add a lead manually after a call.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white">
            {leads.map((lead) => (
              <li key={lead.id}>
                <button
                  type="button"
                  onClick={() => setSelected(lead)}
                  className="w-full text-left px-5 py-4 hover:bg-white/80 flex items-start gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-950 truncate">{lead.companyName}</p>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                    <p className="text-sm text-neutral-500 mt-0.5 truncate">
                      {lead.contactName} · {lead.email}
                      {lead.phone ? ` · ${lead.phone}` : ""}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      {lead.requestedFeatures.length} modules requested
                      {lead.assignedToName ? ` · ${lead.assignedToName}` : " · Unassigned"}
                      {lead.trialEndsAt ? ` · trial until ${new Date(lead.trialEndsAt).toLocaleDateString("en-IN")}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-primary font-medium shrink-0">Open</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LeadDetailDialog
        lead={selected}
        operatorName={authState.user?.name}
        onClose={() => setSelected(null)}
        onChanged={(next) => {
          setSelected(next)
          load()
        }}
      />
      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </div>
  )
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const styles: Record<LeadStatus, string> = {
    new: "bg-primary/10 text-primary",
    assigned: "bg-sky-50 text-sky-800",
    contacted: "bg-violet-50 text-violet-800",
    trial: "bg-amber-50 text-amber-800",
    negotiating: "bg-orange-50 text-orange-800",
    won: "bg-emerald-50 text-emerald-800",
    lost: "bg-neutral-100 text-neutral-600",
  }
  const label = LEAD_STATUSES.find((s) => s.id === status)?.label ?? status
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", styles[status])}>{label}</span>
}

function LeadDetailDialog({
  lead,
  operatorName,
  onClose,
  onChanged,
}: {
  lead: PlatformLead | null
  operatorName?: string
  onClose: () => void
  onChanged: (lead: PlatformLead) => void
}) {
  const [calls, setCalls] = useState<LeadCall[]>([])
  const [outcome, setOutcome] = useState<CallOutcome>("connected")
  const [callNotes, setCallNotes] = useState("")
  const [followUp, setFollowUp] = useState("")
  const [assignee, setAssignee] = useState("")
  const [busy, setBusy] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  useEffect(() => {
    if (!lead) return
    setAssignee(lead.assignedToName ?? operatorName ?? "")
    platformService.getLeadCalls(lead.id).then((res) => setCalls(res.data ?? [])).catch(() => setCalls([]))
  }, [lead, operatorName])

  if (!lead) return null

  const run = async (label: string, fn: () => Promise<PlatformLead | void>) => {
    setBusy(true)
    try {
      const next = await fn()
      toast.success(label)
      if (next) onChanged(next)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog open={!!lead} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {lead.companyName}
              <LeadStatusBadge status={lead.status} />
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-neutral-600 space-y-1">
            <p>{lead.contactName} · {lead.email}</p>
            {lead.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {lead.phone}</p>}
            {(lead.city || lead.state) && <p>{[lead.city, lead.state].filter(Boolean).join(", ")}</p>}
            {lead.notes && <p className="rounded-2xl bg-neutral-50 p-3 text-neutral-700">{lead.notes}</p>}
          </div>

          <div>
            <p className="text-xs font-medium text-neutral-400 mb-2">Features they asked for</p>
            <div className="flex flex-wrap gap-1.5">
              {lead.requestedFeatures.length ? lead.requestedFeatures.map((key) => (
                <span key={key} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-700">
                  {FEATURE_CATALOG.find((f) => f.key === key)?.label ?? key}
                </span>
              )) : <span className="text-sm text-neutral-400">Not specified — decide after the trial</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assign caller</Label>
              <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Caller name" />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                disabled={busy || !assignee.trim()}
                onClick={() =>
                  run("Assigned", async () => {
                    const res = await platformService.assignLead(lead.id, { assignedToName: assignee.trim() })
                    return res.data
                  })
                }
              >
                Assign to me / caller
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4 space-y-3">
            <p className="text-sm font-medium">Log a call</p>
            <Select
              value={outcome}
              onValueChange={(v) => setOutcome(v as CallOutcome)}
              options={CALL_OUTCOMES.map((o) => ({ value: o.id, label: o.label }))}
            />
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder="What they need, training slots, objections…"
            />
            <div className="space-y-1.5">
              <Label>Next follow-up</Label>
              <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
            </div>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run("Call logged", async () => {
                  await platformService.logLeadCall(lead.id, {
                    outcome,
                    notes: callNotes,
                    nextFollowUpAt: followUp ? new Date(followUp).toISOString() : null,
                  })
                  const res = await platformService.updateLead(lead.id, { status: "contacted" })
                  setCallNotes("")
                  return res.data
                })
              }
            >
              Save call
            </Button>
            {calls.length > 0 && (
              <ul className="space-y-2 pt-2">
                {calls.map((c) => (
                  <li key={c.id} className="text-xs text-neutral-500">
                    <span className="font-medium text-neutral-700">{c.outcome.replace(/_/g, " ")}</span>
                    {c.notes ? ` — ${c.notes}` : ""} · {new Date(c.createdAt).toLocaleString("en-IN")}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                run("30-day trial started", async () => {
                  const res = await platformService.startLeadTrial(lead.id, {
                    trialDays: DEFAULT_TRIAL_DAYS,
                    trainingIncluded: true,
                    notes: "Trial includes onboarding and training",
                  })
                  return res.data
                })
              }
            >
              Start {DEFAULT_TRIAL_DAYS}-day trial
            </Button>
            <Button variant="outline" onClick={() => setQuoteOpen(true)}>
              Negotiate package
            </Button>
            {lead.companyId && (
              <Button variant="ghost" asChild>
                <Link href={`/companies/${lead.companyId}`}>Open tenant</Link>
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run("Marked won", async () => {
                  const res = await platformService.convertLead(lead.id, { grantWithoutPayment: false })
                  return res.data
                })
              }
            >
              Convert / won
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                run("Marked lost", async () => {
                  const res = await platformService.updateLead(lead.id, { status: "lost" })
                  return res.data
                })
              }
            >
              Lost
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <QuoteBuilderDialog
        open={quoteOpen}
        leadId={lead.id}
        companyId={lead.companyId}
        companyName={lead.companyName}
        requestedFeatures={lead.requestedFeatures}
        onOpenChange={setQuoteOpen}
        onSaved={() => {
          platformService.updateLead(lead.id, { status: "negotiating" }).then((res) => res.data && onChanged(res.data))
        }}
      />
    </>
  )
}

function CreateLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [features, setFeatures] = useState<ModuleFlagKey[]>([])
  const [saving, setSaving] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-[24px]">
        <DialogHeader>
          <DialogTitle>Add inbound lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Company" value={companyName} onChange={setCompanyName} />
          <Field label="Contact name" value={contactName} onChange={setContactName} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-2xl border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-neutral-500">Modules they think they need (optional — final plan is decided after trial)</p>
          <div className="flex flex-wrap gap-1.5">
            {FEATURE_CATALOG.slice(0, 12).map((f) => {
              const on = features.includes(f.key)
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFeatures((prev) => (on ? prev.filter((k) => k !== f.key) : [...prev, f.key]))}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] border",
                    on ? "bg-primary text-white border-primary" : "bg-white text-neutral-600 border-neutral-200",
                  )}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || !companyName.trim() || !contactName.trim() || !email.trim()}
            onClick={async () => {
              setSaving(true)
              try {
                await platformService.createLead({
                  companyName: companyName.trim(),
                  contactName: contactName.trim(),
                  email: email.trim(),
                  phone: phone.trim() || undefined,
                  notes: notes.trim() || undefined,
                  requestedFeatures: features,
                  source: "manual",
                })
                toast.success("Lead added to the call queue")
                onOpenChange(false)
                setCompanyName("")
                setContactName("")
                setEmail("")
                setPhone("")
                setNotes("")
                setFeatures([])
                onCreated()
              } catch (err) {
                toast.error(getApiErrorMessage(err))
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? "Saving…" : "Add to queue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
