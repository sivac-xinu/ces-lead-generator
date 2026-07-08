export type ICP = string

export type Tier = 'Tier 1' | 'Tier 2' | 'Tier 3'

export type ITType = 'Cloud' | 'On-Premise' | 'Hybrid' | 'Unknown'

export type UserRole = 'user' | 'admin'

export type CallOutcome =
  | 'Prospect'
  | 'Contacted'
  | 'Voicemail'
  | 'Follow-up Scheduled'
  | 'Qualified'
  | 'Not Interested'
  | 'Closed Won'

export interface Contact {
  id: number
  lead_id: number
  name: string
  title?: string
  email?: string
  phone?: string
  is_primary?: boolean
  source?: string
  created_at?: string
  updated_at?: string
}

export interface Lead {
  id: number
  company: string
  contact_name: string
  contact_title: string
  contact_email?: string
  contact_phone?: string
  contacts?: Contact[]
  industry: string
  employees?: number
  size?: string
  location?: string
  website?: string
  linkedin_url?: string
  it_type: ITType
  current_infra?: string
  pain_points: string[]
  annual_it_budget?: string
  icp?: ICP
  tier?: Tier
  imported?: boolean
  imported_by?: string
  company_source?: string
  _source?: string
  status?: string
  sales_rep?: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

export interface DbContact {
  id: number
  lead_id: number
  name: string
  title?: string
  email?: string
  phone?: string
  is_primary?: boolean
  source?: string
  created_at?: string
  updated_at?: string
}

export interface DbLead {
  id: number
  company: string
  contact_name: string
  contact_title: string
  contact_email?: string
  contact_phone?: string
  industry: string
  employees?: number
  company_size?: string
  location?: string
  website?: string
  linkedin_url?: string
  it_type: string
  current_infra?: string
  pain_points?: string[]
  annual_it_budget?: string
  icp?: string
  tier?: string
  imported?: boolean
  imported_by?: string
  company_source?: string
  status?: string
  sales_rep?: string
  assigned_rep?: string
  notes?: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

export interface CallLog {
  id: number
  lead_id: number
  rep?: string
  date: string
  outcome: CallOutcome
  notes?: string
  next_action_date?: string
  follow_up?: string
  company?: string
  contact_name?: string
  contact_title?: string
  created_at?: string
}

export interface Solution {
  id: string
  service: string
  urgency: 'critical' | 'high' | 'medium'
  icon: string
  keywords: string[]
  trend: string
  buySignal: string
  pitch: string
  stat: string
  created_at?: string
}

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  approved: boolean
  created_at?: string
}

export interface AuditLogEntry {
  id?: number
  user_id: string
  action: string
  detail: string
  created_at?: string
}

export type AIProvider = 'local' | 'openrouter' | 'openai' | 'anthropic'

export interface AIConfig {
  provider: AIProvider
  apiKey?: string
  model: string
  depth: 'quick' | 'deep'
}

export interface IcpOption {
  value: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export interface IntelligenceResult {
  icp?: string
  icp_options: IcpOption[]
  tier: Tier
  it_type: ITType
  pain_points: string[]
  enrichment?: {
    company_context: string
    key_challenges: string
    recommended_approach: string
  }
  research?: {
    summary?: string
    recent_activities?: string
    upcoming_activities?: string
    key_drivers?: string
    industry_trends?: string
    next_portfolio?: string
    ces_support?: string
    competitors?: string
    tech_stack?: string
    decision_makers?: string
    buying_triggers?: string
    talking_points?: string
    ces_entry_angle?: string
  }
}

export type ToneKey = 'consultative' | 'empathetic' | 'challenger' | 'executive' | 'technical'

export interface Tone {
  label: string
  icon: string
  desc: string
  note: string
  scripts: {
    hook: string
    pain: string
    value: string
    objection: string
    cta: string
  }
}

export interface CsvField {
  key: string
  label: string
  required: boolean
  default: string | null
}
