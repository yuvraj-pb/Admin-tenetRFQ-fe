import type { ModuleFlagKey, QuotaKey } from "@/types/platform"

export const EMPTY_FEATURES: Record<ModuleFlagKey, boolean> = {
  rfqCore: false,
  approvalWorkflow: false,
  quotes: false,
  negotiations: false,
  rfqDeletionApprovals: false,
  supplierPortal: false,
  supplierNetwork: false,
  orders: false,
  dispatch: false,
  deliveries: false,
  quality: false,
  slaDisputes: false,
  approvalsHub: false,
  users: false,
  roles: false,
  branches: false,
  analytics: false,
  advancedAnalytics: false,
  analyticsExport: false,
  qualityAnalytics: false,
  notifications: false,
  customIntegrations: false,
  prioritySupport: false,
  dedicatedSupport: false,
}

export const ENTITLEMENT_GROUPS: {
  id: string
  label: string
  description: string
  flags: ModuleFlagKey[]
}[] = [
  {
    id: "procurement",
    label: "Procurement",
    description: "RFQ lifecycle, approvals, quotes and negotiations",
    flags: ["rfqCore", "approvalWorkflow", "quotes", "negotiations", "rfqDeletionApprovals"],
  },
  {
    id: "suppliers",
    label: "Suppliers",
    description: "Supplier portal and buyer-side supplier network",
    flags: ["supplierNetwork", "supplierPortal"],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Awards, logistics, quality and SLA",
    flags: ["orders", "dispatch", "deliveries", "quality", "slaDisputes", "approvalsHub"],
  },
  {
    id: "people",
    label: "People & org",
    description: "Users, roles and branches",
    flags: ["users", "roles", "branches"],
  },
  {
    id: "insights",
    label: "Analytics",
    description: "Dashboards and exports",
    flags: ["analytics", "advancedAnalytics", "analyticsExport", "qualityAnalytics"],
  },
  {
    id: "platform",
    label: "Platform",
    description: "Notifications and integrations",
    flags: ["notifications", "customIntegrations"],
  },
  {
    id: "commercial",
    label: "Commercial",
    description: "Support SLAs — not product gates",
    flags: ["prioritySupport", "dedicatedSupport"],
  },
]

export const FEATURE_CATALOG: {
  key: ModuleFlagKey
  label: string
  description: string
  requires: ModuleFlagKey[]
}[] = [
  { key: "rfqCore", label: "RFQ management", description: "Create, edit, publish and close RFQs", requires: [] },
  { key: "approvalWorkflow", label: "Approval workflow", description: "Maker–checker–approver RFQ stages", requires: ["rfqCore"] },
  { key: "quotes", label: "Quotes", description: "View, compare, accept and reject quotes", requires: ["rfqCore"] },
  { key: "negotiations", label: "Negotiations", description: "Start and close price negotiations", requires: ["quotes"] },
  { key: "rfqDeletionApprovals", label: "RFQ deletion approvals", description: "Queue for approving RFQ deletions", requires: ["approvalWorkflow"] },
  { key: "supplierNetwork", label: "Supplier network", description: "Invite and manage suppliers from the buyer side", requires: [] },
  { key: "supplierPortal", label: "Supplier portal", description: "Suppliers log in, quote and manage dispatches", requires: [] },
  { key: "orders", label: "Orders & awards", description: "Award RFQs and manage purchase orders", requires: ["quotes"] },
  { key: "dispatch", label: "Dispatch & logistics", description: "Truck dispatch flow and tracking", requires: ["orders"] },
  { key: "deliveries", label: "Deliveries & POD", description: "Delivery status, documents and receipt", requires: ["orders"] },
  { key: "quality", label: "Quality / QC", description: "Quality templates and reports", requires: ["deliveries"] },
  { key: "slaDisputes", label: "SLA disputes", description: "SLA breach tracking and dispute desk", requires: ["deliveries"] },
  { key: "approvalsHub", label: "Approvals hub", description: "Central inbox for quality and dispatch approvals", requires: ["approvalWorkflow"] },
  { key: "users", label: "User management", description: "Invite, edit and deactivate company users", requires: [] },
  { key: "roles", label: "Roles & permissions", description: "Custom roles beyond the seeded templates", requires: ["users"] },
  { key: "branches", label: "Multi-branch", description: "Create and manage branches", requires: [] },
  { key: "analytics", label: "Basic analytics", description: "Core dashboards", requires: [] },
  { key: "advancedAnalytics", label: "Advanced analytics", description: "Company-wide and comparison dashboards", requires: ["analytics"] },
  { key: "analyticsExport", label: "Analytics export", description: "Export reports", requires: ["analytics"] },
  { key: "qualityAnalytics", label: "Quality analytics", description: "QC performance dashboards", requires: ["analytics", "quality"] },
  { key: "notifications", label: "Notifications", description: "In-app and email notifications", requires: [] },
  { key: "customIntegrations", label: "Custom integrations", description: "API / ERP connectors", requires: [] },
  { key: "prioritySupport", label: "Priority support", description: "Faster support SLAs (commercial)", requires: [] },
  { key: "dedicatedSupport", label: "Dedicated support", description: "Named account manager (commercial)", requires: ["prioritySupport"] },
]

export const QUOTA_CATALOG: {
  key: QuotaKey
  label: string
  description: string
  step: number
  unit: "count" | "bytes" | "per_month"
}[] = [
  { key: "maxUsers", label: "Users", description: "Seats that can log in for this company", step: 1, unit: "count" },
  { key: "maxBranches", label: "Branches", description: "Active branch locations", step: 1, unit: "count" },
  { key: "maxStorageBytes", label: "Storage", description: "Upload storage for company files", step: 1024 * 1024 * 1024, unit: "bytes" },
  { key: "maxRfqsPerMonth", label: "RFQs / month", description: "New RFQs that can be created each billing month", step: 10, unit: "per_month" },
  { key: "maxSuppliers", label: "Suppliers", description: "Suppliers in the company network", step: 5, unit: "count" },
  { key: "maxCustomRoles", label: "Custom roles", description: "Roles beyond the seeded templates", step: 1, unit: "count" },
]

export const FEATURE_BY_KEY = Object.fromEntries(FEATURE_CATALOG.map((f) => [f.key, f])) as Record<
  ModuleFlagKey,
  (typeof FEATURE_CATALOG)[number]
>
