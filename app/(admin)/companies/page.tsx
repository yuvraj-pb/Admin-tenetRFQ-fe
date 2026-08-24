import { Suspense } from "react"
import { CompaniesManager } from "@/components/super-admin/companies-manager"

export default function CompaniesPage() {
  return (
    <Suspense fallback={null}>
      <CompaniesManager />
    </Suspense>
  )
}
