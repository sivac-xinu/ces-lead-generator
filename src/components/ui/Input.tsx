import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn('input', className)} {...props} />
  }
)
Input.displayName = 'Input'
