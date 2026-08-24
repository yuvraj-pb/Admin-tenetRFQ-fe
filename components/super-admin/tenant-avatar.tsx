import { avatarTone, initials } from "@/lib/tenant/health"
import { cn } from "@/lib/utils"

export function TenantAvatar({
  name,
  id,
  size = "md",
}: {
  name: string
  id: number | string
  size?: "sm" | "md" | "lg"
}) {
  const dim = size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm"
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br text-white font-semibold flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm",
        dim,
        avatarTone(id),
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
