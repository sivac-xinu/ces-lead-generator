import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { searchZoomInfoCompanies, type ZoomInfoLeadPartial } from '@/lib/zoominfo'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateLead } from '@/hooks/useLeads'
import { useUIStore } from '@/store/uiStore'
import { inferICP, inferITType, inferTier } from '@/utils/lead'
import type { Lead } from '@/types'

type Tab = 'zoominfo' | 'clearbit'

interface ClearbitSuggestion {
  name: string
  domain: string
  logo: string
}

function buildLeadFromZoomInfo(result: ZoomInfoLeadPartial, salesRep: string): Partial<Lead> {
  const industry = result.industry || 'Unknown'
  return {
    company: result.company,
    industry,
    employees: result.employees,
    website: result.website,
    location: result.location,
    contact_name: result.contact_name || '',
    contact_title: result.contact_title || '',
    contact_email: result.contact_email,
    contact_phone: result.contact_phone,
    current_infra: result.current_infra,
    annual_it_budget: result.annual_it_budget,
    it_type: inferITType(industry),
    tier: inferTier(result.employees),
    icp: inferICP(result.employees),
    pain_points: [],
    imported: true,
    imported_by: 'ZoomInfo',
    company_source: 'ZoomInfo Search',
    sales_rep: salesRep || undefined,
    status: 'New',
  }
}

function buildLeadFromClearbit(result: ClearbitSuggestion, salesRep: string): Partial<Lead> {
  return {
    company: result.name,
    website: result.domain,
    linkedin_url: result.domain,
    industry: 'Unknown',
    it_type: 'Unknown',
    pain_points: [],
    contact_name: '',
    contact_title: '',
    imported: true,
    imported_by: 'Clearbit',
    company_source: result.domain,
    sales_rep: salesRep || undefined,
    status: 'New',
  }
}

export function ApiSourcesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('zoominfo')

  const [zoomUsername, setZoomUsername] = useState('')
  const [zoomPassword, setZoomPassword] = useState('')
  const [zoomResults, setZoomResults] = useState<ZoomInfoLeadPartial[]>([])
  const [zoomLoading, setZoomLoading] = useState(false)
  const [zoomError, setZoomError] = useState<string | null>(null)

  const [clearbitQuery, setClearbitQuery] = useState('')
  const [clearbitResults, setClearbitResults] = useState<ClearbitSuggestion[]>([])
  const [clearbitLoading, setClearbitLoading] = useState(false)
  const [clearbitError, setClearbitError] = useState<string | null>(null)

  const { user } = useAuth()
  const createLead = useCreateLead()
  const { showToast } = useUIStore()
  const salesRep = user?.email ?? ''

  const handleTestZoomInfo = async () => {
    setZoomLoading(true)
    setZoomError(null)
    setZoomResults([])
    try {
      const results = await searchZoomInfoCompanies({
        companyName: 'Example Corp',
        industry: 'Software',
        employeeCountMin: 50,
        employeeCountMax: 5000,
      })
      setZoomResults(results)
    } catch (err) {
      setZoomError(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setZoomLoading(false)
    }
  }

  const handleImportZoomInfo = async (result: ZoomInfoLeadPartial) => {
    try {
      await createLead.mutateAsync(buildLeadFromZoomInfo(result, salesRep))
      showToast(`Imported ${result.company} from ZoomInfo`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to import lead', 'error')
    }
  }

  const handleSearchClearbit = async () => {
    if (!clearbitQuery.trim()) return
    setClearbitLoading(true)
    setClearbitError(null)
    setClearbitResults([])
    try {
      const response = await fetch(
        `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(clearbitQuery)}`
      )
      if (!response.ok) {
        throw new Error(`Clearbit request failed: ${response.status}`)
      }
      const data = (await response.json()) as ClearbitSuggestion[]
      setClearbitResults(data)
    } catch (err) {
      setClearbitError(err instanceof Error ? err.message : 'Clearbit search failed')
    } finally {
      setClearbitLoading(false)
    }
  }

  const handleImportClearbit = async (result: ClearbitSuggestion) => {
    try {
      await createLead.mutateAsync(buildLeadFromClearbit(result, salesRep))
      showToast(`Imported ${result.name} from Clearbit`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to import lead', 'error')
    }
  }

  const zoomCredentialsEntered = zoomUsername.trim().length > 0 && zoomPassword.trim().length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Sources</h1>
        <p className="text-ces-muted">Connect ZoomInfo and Clearbit to enrich leads.</p>
      </div>

      <div className="flex gap-2 border-b border-ces-border pb-1">
        <Button
          variant={activeTab === 'zoominfo' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('zoominfo')}
          className="rounded-b-none"
        >
          ZoomInfo
        </Button>
        <Button
          variant={activeTab === 'clearbit' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('clearbit')}
          className="rounded-b-none"
        >
          Clearbit
        </Button>
      </div>

      {activeTab === 'zoominfo' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ZoomInfo credentials required. Enter them in Supabase Edge Function secrets to enable live data.
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">ZoomInfo Configuration</h2>
            <p className="text-sm text-ces-muted">
              Credentials are stored in Supabase Edge Function secrets and never leave the server.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="zoom-username" className="label">
                  ZoomInfo Username
                </label>
                <Input
                  id="zoom-username"
                  value={zoomUsername}
                  onChange={e => setZoomUsername(e.target.value)}
                  placeholder="username@company.com"
                />
              </div>
              <div>
                <label htmlFor="zoom-password" className="label">
                  ZoomInfo Password
                </label>
                <Input
                  id="zoom-password"
                  type="password"
                  value={zoomPassword}
                  onChange={e => setZoomPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleTestZoomInfo}
              loading={zoomLoading}
              disabled={!zoomCredentialsEntered || zoomLoading}
            >
              Test Connection
            </Button>
            {!zoomCredentialsEntered && (
              <p className="text-xs text-ces-muted">Enter both username and password to test the connection.</p>
            )}
          </div>

          {zoomError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{zoomError}</div>
          )}

          {zoomResults.length > 0 && (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-ces-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Industry</th>
                    <th className="px-4 py-3 font-medium">Employees</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ces-border">
                  {zoomResults.map((result, index) => (
                    <tr key={`${result.company}-${index}`}>
                      <td className="px-4 py-3 font-medium">{result.company}</td>
                      <td className="px-4 py-3">{result.industry}</td>
                      <td className="px-4 py-3">{result.employees?.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3">
                        {result.website ? (
                          <a
                            href={`https://${result.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ces-orange hover:underline"
                          >
                            {result.website}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">{result.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleImportZoomInfo(result)}
                          loading={createLead.isPending}
                          disabled={createLead.isPending}
                        >
                          Import
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'clearbit' && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">Clearbit Search</h2>
            <p className="text-sm text-ces-muted">Search Clearbit directly from the browser by company name.</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="clearbit-query" className="label">
                  Company Name
                </label>
                <Input
                  id="clearbit-query"
                  value={clearbitQuery}
                  onChange={e => setClearbitQuery(e.target.value)}
                  placeholder="Acme Inc"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleSearchClearbit()
                    }
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button variant="primary" onClick={() => void handleSearchClearbit()} loading={clearbitLoading}>
                  Search
                </Button>
              </div>
            </div>
          </div>

          {clearbitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{clearbitError}</div>
          )}

          {clearbitResults.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clearbitResults.map(result => (
                <div key={result.domain} className="card flex items-start gap-4">
                  {result.logo && (
                    <img
                      src={result.logo}
                      alt={`${result.name} logo`}
                      className="h-12 w-12 rounded-md object-contain"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{result.name}</h3>
                    <p className="truncate text-sm text-ces-muted">{result.domain}</p>
                    <Button
                      size="sm"
                      variant="primary"
                      className="mt-3"
                      onClick={() => handleImportClearbit(result)}
                      loading={createLead.isPending}
                      disabled={createLead.isPending}
                    >
                      Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
