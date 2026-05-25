import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-orange-50 text-orange-700',
        secondary:   'bg-slate-100 text-slate-700',
        success:     'bg-emerald-50 text-emerald-700',
        warning:     'bg-orange-50 text-orange-700',
        destructive: 'bg-red-50 text-red-600',
        blue:        'bg-blue-50 text-blue-700',
        outline:     'border border-slate-200 text-slate-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
