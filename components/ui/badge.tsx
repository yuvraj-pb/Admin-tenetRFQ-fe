"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-white hover:bg-brand-primary/90 border-transparent",
        secondary: "bg-gray-100 text-gray-900 border-transparent dark:bg-gray-800 dark:text-gray-100",
        outline: "border border-gray-300 bg-transparent text-gray-700 dark:border-gray-700 dark:text-gray-300",
        destructive: "bg-red-500 text-white border-transparent hover:bg-red-600",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
