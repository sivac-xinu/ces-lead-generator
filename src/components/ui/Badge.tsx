import { cn } from '@/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'cloud' | 'onprem' | 'hybrid' | 'industry' | 'urgency'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-ces-text',
    cloud: 'bg-blue-50 text-blue-700',
    onprem: 'bg-amber-50 text-amber-700',
    hybrid: 'bg-purple-50 text-purple-700',
    industry: 'bg-slate-100 text-ces-muted',
    urgency: 'bg-red-50 text-red-700',
  }

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
