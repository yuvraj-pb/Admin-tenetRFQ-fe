"use client"

import type * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={`
        rounded-3xl border border-neutral-200/70 bg-white shadow-[0_8px_30px_rgba(20,20,20,0.04)]
        dark:border-gray-800/60 dark:bg-gray-950
        ${className}
      `}
      {...props}
    />
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      className={`
        flex flex-col space-y-2 p-4 sm:p-6
        ${className}
      `}
      {...props}
    />
  )
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={`
        text-lg sm:text-xl font-semibold text-gray-900 leading-tight
        dark:text-gray-50
        ${className}
      `}
      {...props}
    />
  )
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={`
        text-sm sm:text-base text-gray-600 leading-relaxed
        dark:text-gray-400
        ${className}
      `}
      {...props}
    />
  )
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      className={`p-4 sm:p-6 pt-0 ${className}
      `}
      {...props}
    />
  )
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={`
        flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 sm:p-6 pt-0
        ${className}
      `}
      {...props}
    />
  )
}
