import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Layout } from '@/components/layout/Layout'
import { LeadDiscoveryPage } from '@/features/leads/LeadDiscoveryPage'
import { ScriptGeneratorPage } from '@/features/script/ScriptGeneratorPage'
import { CallTrackerPage } from '@/features/tracker/CallTrackerPage'
import { SolutionsPage } from '@/features/solutions/SolutionsPage'
import { ApiSourcesPage } from '@/features/apiSources/ApiSourcesPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { AuthPage } from '@/features/auth/AuthPage'
import { PainPointsGlancePage } from '@/features/painpoints/PainPointsGlancePage'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ces-orange border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  if (!user.approved && user.role !== 'admin') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl">⏳</div>
        <h1 className="mt-4 text-xl font-semibold">Approval Required</h1>
        <p className="mt-2 text-ces-muted">
          Your account is pending approval. An administrator will review and activate your access shortly.
        </p>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/leads" replace />} />
        <Route path="/leads" element={<LeadDiscoveryPage />} />
        <Route path="/script" element={<ScriptGeneratorPage />} />
        <Route path="/tracker" element={<CallTrackerPage />} />
        <Route path="/solutions" element={<SolutionsPage />} />
        <Route path="/apis" element={<ApiSourcesPage />} />
        <Route path="/pain-points" element={<PainPointsGlancePage />} />
        {user.role === 'admin' && <Route path="/admin" element={<AdminPage />} />}
        <Route path="*" element={<Navigate to="/leads" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
