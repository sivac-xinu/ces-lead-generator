import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select ref={ref} className={cn('select', className)} {...props}>
        {children}
      </select>
    )
  }
)
Select.displayName = 'Select'
