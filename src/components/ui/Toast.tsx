import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { CheckCircle, XCircle } from 'lucide-react'

export function Toast() {
  const { toast, clearToast } = useUIStore()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(clearToast, 3000)
    return () => clearTimeout(timer)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-ces-navy px-4 py-3 text-white shadow-lg">
      {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-ces-orange" /> : <XCircle className="h-4 w-4 text-red-400" />}
      <span className="text-sm">{toast.message}</span>
    </div>
  )
}
