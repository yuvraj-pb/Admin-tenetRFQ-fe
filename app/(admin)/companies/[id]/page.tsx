import { Suspense } from "react"
import { CompanyDetailView } from "@/components/super-admin/company-detail-view"

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <CompanyDetailView companyId={id} />
    </Suspense>
  )
}
