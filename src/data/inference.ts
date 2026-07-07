import type { CsvField } from '@/types'

export interface InferRule {
  titleKeys: string[]
  points: string[]
}

export interface PainPointTheme {
  label: string
  keys: string[]
}

export const INFER_RULES: InferRule[] = [
  {
    titleKeys: ['ciso', 'chief information security', 'security officer'],
    points: [
      'Governance models cannot keep pace with AI-generated data and outputs (Forrester 2026)',
      'Sensitive data surfacing in AI prompts despite document-level access controls (McKinsey)',
      'Quantum computing will break current public key infrastructure within planning horizon (Forrester)',
      'AI agents acting autonomously without auditability trails for compliance teams (McKinsey)',
      'Budget pressure to prove security ROI while threat surface expands with agentic AI (Forrester)',
      'Cross-functional Q-Day readiness requires security, dev, and infra teams to act now (Forrester)',
    ],
  },
  {
    titleKeys: ['cio', 'chief information officer'],
    points: [
      '88% of orgs use AI in one function but only one-third have begun scaling enterprise-wide (McKinsey 2025)',
      'Data ownership gaps block AI scaling — teams cannot identify the authoritative data source (Forrester)',
      'Legacy on-premises data warehouses hitting capacity, blocking AI-ready platform transition (Forrester)',
      'IT infrastructure costs projected to increase 2-3x by 2030 while budgets stay flat (McKinsey)',
      'AI pilots deliver function-level value but only 39% report any enterprise EBIT impact (McKinsey)',
      'Operating model redesign needed as AI agents fundamentally change the nature of IT work (Forrester)',
    ],
  },
  {
    titleKeys: ['cto', 'chief technology officer'],
    points: [
      'Infrastructure designed for ticket-based workflows cannot sustain agentic AI throughput (McKinsey)',
      'Less than 10% of agentic AI programs reach meaningful scale due to fragmented tooling (McKinsey)',
      'Agentic systems create more failure points than legacy stacks — outage risk is rising (McKinsey)',
      'Agent governance gap: no registry, scope definitions, or lifecycle management for deployed agents (McKinsey)',
      'Composable mesh-like infrastructure required but most orgs still run siloed platforms (McKinsey)',
      'AI compute and storage demand growth requires 20%+ of digital budget committed now (McKinsey)',
    ],
  },
  {
    titleKeys: ['it director', 'director of it', 'director of information technology'],
    points: [
      'Service desk still handles 80%+ of tickets manually despite mature automation tooling available (McKinsey)',
      'Observability gaps mean engineers spend majority of time in reactive firefighting mode (McKinsey)',
      'Cloud and SaaS sprawl makes contract and license management a manual, costly process (McKinsey)',
      'Mean time to repair is rising as system complexity outpaces team capacity (McKinsey)',
      'Patching and environment provisioning still dominated by tickets and manual coordination (McKinsey)',
      'IT team structure has not evolved to reflect AI-first operating models or SRE principles (Forrester)',
    ],
  },
  {
    titleKeys: ['vp it', 'vp of it', 'vice president it', 'vice president of it'],
    points: [
      'AI pilots scattered across business units with no shared governance or reuse layer (Forrester)',
      'IT finance practices are still early-stage — roughly half lack mature cost allocation models (Forrester)',
      'Vendor contracts misaligned with AI-enabled productivity gains, eroding ROI (McKinsey)',
      'Business units building AI apps on different pipelines producing inconsistent outputs (McKinsey)',
      'Workflow redesign is the top differentiator for AI value capture, yet most organisations skip it (McKinsey)',
      'Skill erosion risk as teams over-rely on AI code generation without upskilling strategy (Forrester)',
    ],
  },
  {
    titleKeys: [
      'infrastructure manager',
      'infrastructure lead',
      'head of infrastructure',
      'infra manager',
    ],
    points: [
      'Network operations still reactive — no real-time intent-driven management in place (McKinsey)',
      'Configuration drift across cloud and on-premises environments creates undetected risk (McKinsey)',
      'IaC adoption can deliver ~15% run-rate savings — most mid-market orgs have not started (McKinsey)',
      'Fragmented CMDB and inconsistent asset ownership make agent automation unsafe (McKinsey)',
      'SRE function under-resourced to handle both incident response and agentic governance (McKinsey)',
      'Capacity management and patching still dominated by manual ticket-driven coordination (McKinsey)',
    ],
  },
  {
    titleKeys: ['cloud architect', 'cloud engineer', 'solutions architect'],
    points: [
      'Multi-cloud sprawl prevents shared orchestration layer needed for agentic workloads (McKinsey)',
      'AI inference costs are nonlinear and unpredictable, breaking existing cloud FinOps models (McKinsey)',
      'Vendor lock-in risk increases as hyperscaler-native agent frameworks proliferate (McKinsey)',
      'Data sovereignty obligations block centralised AI platforms for global cloud deployments (Forrester)',
      'GPU and accelerator procurement queues creating 6-12 month delays for AI infrastructure (McKinsey)',
      'RAG pipelines failing without governed, versioned data products as a foundation (McKinsey)',
    ],
  },
  {
    titleKeys: ['cfo', 'chief financial officer', 'finance director', 'vp finance'],
    points: [
      '40-60% of technology spend is in external vendor contracts with limited continuous oversight (McKinsey)',
      'AI infrastructure costs projected 2-3x increase by 2030 — no current budget model accounts for it (McKinsey)',
      'High performers commit 20%+ of digital budget to AI, but ROI proof points lag investment (McKinsey)',
      'Duplicated data pipelines across business units multiplying costs without a shared platform (McKinsey)',
      'Only 39% of organisations report any EBIT impact from AI, making budget justification difficult (McKinsey)',
      'IT finance function still early-stage — roughly half cannot accurately attribute tech spend to value (Forrester)',
    ],
  },
]

export const INFER_INDUSTRY: Record<string, string[]> = {
  healthcare: [
    'Patient data scattered across systems, blocking AI-powered clinical decision models (Forrester)',
    'Data sovereignty and partner sharing compliance prevents unified AI data platform (Forrester)',
    'AI agent use is highest in healthcare, yet scaling remains stuck below 10% of functions (McKinsey)',
    'HIPAA and audit requirements demand artifact-level data lineage AI systems cannot yet provide (McKinsey)',
    'Legacy EHR integrations create fragmented data signals that degrade AI model accuracy (McKinsey)',
    'Uptime requirements for clinical systems expose single points of failure in ageing infrastructure',
  ],
  finance: [
    'Unstructured data pipelines — contracts, transcripts, PDFs — not governed to AI-ready standard (McKinsey)',
    'AI outputs non-defensible in regulatory audits due to missing chunk-level data lineage (McKinsey)',
    'Sensitive clause fragments surfacing in AI responses despite document-level access controls (McKinsey)',
    'Core banking modernisation stalled while AI adoption pressure from competitors accelerates (McKinsey)',
    'Legacy monolithic architecture cannot support real-time agent decision-making demands (McKinsey)',
    'AI code generation raising concerns about skill erosion and overreliance across dev teams (Forrester)',
  ],
  banking: [
    'Regulatory compliance obligations make AI output explainability a hard blocker to deployment (McKinsey)',
    'Competitive pressure from neobanks forces infrastructure modernisation ahead of readiness (McKinsey)',
    'Structured and unstructured data not linked — AI cannot connect customer records to contracts (McKinsey)',
    'Manual invoice validation and vendor benchmarking still consuming significant IT ops capacity (McKinsey)',
    'AI agent governance gaps creating audit trail risk in supervised financial services environments (McKinsey)',
    'Precision with speed is the new mandate — legacy infrastructure cannot deliver both (McKinsey Global Banking 2026)',
  ],
  manufacturing: [
    'AI delivers the most reported cost benefits in manufacturing, but scaling is still limited (McKinsey State of AI 2025)',
    'OT/IT convergence creates attack surface that legacy security models were not designed for (Gartner 2026)',
    'Predictive maintenance AI blocked by inconsistent sensor data and no governed data pipeline (McKinsey)',
    'Supply chain disruptions exposed infrastructure brittleness — resilience investment now overdue (McKinsey)',
    'Industrial IoT device fleet requires hardware refresh before quantum-safe encryption can deploy (Forrester)',
    'Agentic AI for robotics in pilots but no enterprise orchestration layer exists yet (McKinsey 2025 Trends)',
  ],
  retail: [
    'AI-powered personalisation requires real-time data that most retailers infrastructure lacks (McKinsey)',
    'Marketing and sales AI pilots generate revenue lift but workflows have not been redesigned to capture it (McKinsey)',
    'Customer data platform and data warehouse stacks siloed — AI cannot produce a consistent customer view (Forrester)',
    'Seasonal infrastructure spikes require elastic capacity most mid-market retailers cannot provision (Gartner)',
    'Legacy POS and ERP systems block the API-first connectivity agentic AI requires (McKinsey)',
    'E-commerce growth to 21% of total retail sales by 2030 demands infrastructure that scales fast (Forrester)',
  ],
  legal: [
    'Contract review AI blocked by unstructured PDF pipelines with no chunk-level lineage or versioning (McKinsey)',
    'Legal discovery obligations require AI output traceability that most document AI systems lack (McKinsey)',
    'Data governance gaps make client confidentiality compliance in AI environments unverifiable (McKinsey)',
    'AI-generated case document summaries cannot be validated against source without lineage tools (McKinsey)',
    'Quantum computing threatens encryption protecting privileged client communications (Forrester)',
    'Matter management and billing still manual — AI automation blocked by fragmented data ownership (McKinsey)',
  ],
  education: [
    'Campus IT teams lack AI governance frameworks as student and faculty AI tool use proliferates (Gartner)',
    'Legacy student information systems cannot integrate with modern AI data platforms (McKinsey)',
    'Research computing infrastructure not designed for GPU-intensive AI workloads (McKinsey)',
    'FERPA compliance and data sovereignty requirements constrain cloud AI platform options (McKinsey)',
    'Cybersecurity posture underfunded relative to rising ransomware attacks on education sector (Gartner)',
    'Data and AI literacy gap in faculty is blocking institution-level AI adoption (Forrester)',
  ],
  government: [
    'AI adoption lags due to data sovereignty, security clearance, and audit obligations (McKinsey)',
    'Ageing infrastructure creates resilience risk — agentic AI requires modern API-first environments (McKinsey)',
    'Multi-agency data sharing for AI early-warning systems blocked by inconsistent governance (Forrester)',
    'Quantum-safe cryptography migration required across all classified and sensitive systems (Forrester)',
    'Procurement cycles too slow to keep pace with AI vendor and infrastructure evolution (Gartner)',
    'Public trust under pressure — IT reliability and uptime directly impacts citizen perception (Forrester)',
  ],
  'professional services': [
    'Knowledge management AI now the third most adopted function — but governance is absent (McKinsey State of AI 2025)',
    'Client deliverable quality risk from AI hallucinations without output validation workflows (McKinsey)',
    'Billable hour model disrupted by AI efficiency gains — no strategy yet to monetise AI productivity (Forrester)',
    'Consultant AI tool sprawl without enterprise guardrails creates IP leakage and compliance risk (Forrester)',
    'Proposal and contract AI accelerates deal speed but without lineage tools review risk increases (McKinsey)',
    'Data literacy gap means most staff cannot evaluate AI output quality, undermining trust (McKinsey)',
  ],
  construction: [
    'Project management data siloed across field tools, ERP, and finance — AI insights impossible (McKinsey)',
    'IoT sensors on sites generate unstructured data with no governed pipeline to analytics (McKinsey)',
    'Cybersecurity investment underweighted relative to growing OT and connected equipment exposure (Gartner)',
    'Cloud adoption lagging industry peers, creating competitive disadvantage in AI-driven project delivery (McKinsey)',
    'Supply chain visibility requires real-time data infrastructure most construction IT cannot provide (McKinsey)',
    'Mobile-first workforce requires always-on connectivity and edge compute that current infra lacks (McKinsey)',
  ],
  logistics: [
    'Autonomous route optimisation AI requires real-time data feeds legacy TMS systems cannot provide (McKinsey)',
    'Supply chain resilience investment overdue — brittleness exposed by recent global disruptions (McKinsey)',
    'Last-mile agentic AI coordination requires composable, API-connected infrastructure (McKinsey)',
    'IoT fleet telemetry generates unstructured data with no governed pipeline to predictive analytics (McKinsey)',
    'Carrier and 3PL vendor contracts unoptimised — manual benchmarking missing real-time pricing signals (McKinsey)',
    'Warehouse automation AI pilots not scaling because infrastructure does not support agent interoperability (McKinsey)',
  ],
}

export const CES_FIELDS: CsvField[] = [
  {
    key: 'company',
    label: 'Company Name',
    required: true,
    default: null,
  },
  {
    key: 'contact_name',
    label: 'Contact Full Name',
    required: false,
    default: null,
  },
  {
    key: 'first_name',
    label: 'First Name',
    required: false,
    default: null,
  },
  {
    key: 'last_name',
    label: 'Last Name',
    required: false,
    default: null,
  },
  {
    key: 'contact_title',
    label: 'Job Title',
    required: false,
    default: '—',
  },
  {
    key: 'industry',
    label: 'Industry',
    required: false,
    default: 'Other',
  },
  {
    key: 'employees',
    label: 'Company Size / Employees',
    required: false,
    default: '—',
  },
  {
    key: 'location',
    label: 'Location / City',
    required: false,
    default: '—',
  },
  {
    key: 'contact_email',
    label: 'Email Address',
    required: false,
    default: '—',
  },
  {
    key: 'contact_phone',
    label: 'Phone Number',
    required: false,
    default: '—',
  },
  {
    key: 'website',
    label: 'LinkedIn URL / Website',
    required: false,
    default: '—',
  },
]

export const FIELD_SYNONYMS: Record<string, string[]> = {
  contact_name: ['full name', 'name', 'contact name', 'person name'],
  first_name: ['first name', 'firstname', 'given name'],
  last_name: ['last name', 'lastname', 'surname', 'family name'],
  contact_title: ['title', 'job title', 'headline', 'position', 'role', 'function'],
  company: [
    'company',
    'company name',
    'account',
    'account name',
    'organization',
    'employer',
    'firm',
  ],
  industry: ['industry', 'sector', 'vertical', 'market'],
  employees: [
    'employees',
    'company size',
    'headcount',
    'employee count',
    'size',
    'num employees',
    '# employees',
    'company headcount',
    'staff',
  ],
  location: [
    'location',
    'city',
    'region',
    'geography',
    'metro',
    'area',
    'country',
    'state',
    'province',
  ],
  contact_email: ['email', 'email address', 'work email', 'e-mail', 'business email'],
  contact_phone: [
    'phone',
    'mobile',
    'phone number',
    'telephone',
    'cell',
    'direct phone',
    'work phone',
  ],
  website: ['linkedin url', 'profile url', 'linkedin', 'url', 'website', 'profile link'],
}

export const PP_THEMES: PainPointTheme[] = [
  {
    label: 'Cloud Migration',
    keys: [
      'migrat',
      'lift and shift',
      'vmware',
      'broadcom',
      'data center',
      'cloud first',
      'cloud roadmap',
      'cloud journey',
      'move to cloud',
    ],
  },
  {
    label: 'Cost & Budget',
    keys: ['cost', 'budget', 'overrun', 'spend', 'finops', 'pricing', 'licensing'],
  },
  {
    label: 'Security',
    keys: [
      'security',
      'ransomware',
      'threat',
      'siem',
      'soc',
      'cyber',
      'breach',
      'attack',
      'posture',
    ],
  },
  {
    label: 'Vuln & Patch Mgmt',
    keys: [
      'vulnerab',
      'patch',
      'cve',
      'exploit',
      'unpatched',
      'zero-day',
      'zero day',
      'pen test',
      'penetration',
      'attack surface',
      'misconfig',
      'exposure',
    ],
  },
  {
    label: 'Compliance',
    keys: [
      'compliance',
      'hipaa',
      'sox',
      'pci',
      'nerc',
      'ferpa',
      'gdpr',
      'fda',
      'regulatory',
      'audit',
      'grc',
    ],
  },
  {
    label: 'Legacy & EOL',
    keys: [
      'legacy',
      'eol',
      'end of life',
      'end-of-life',
      'aging',
      'mainframe',
      'outdated',
      'old',
      'obsolete',
      'windows server 2012',
    ],
  },
  {
    label: 'Hybrid/Multi-Cloud',
    keys: ['hybrid', 'multi-cloud', 'silo', 'visibility', 'on-prem and cloud', 'mixed environment'],
  },
  {
    label: 'Uptime & DR',
    keys: [
      'uptime',
      'disaster recovery',
      'redundancy',
      'failover',
      'backup',
      'availability',
      'outage',
      'downtime',
    ],
  },
  {
    label: 'DevSecOps & Scaling',
    keys: [
      'devsecops',
      'devops',
      'scaling',
      'platform',
      'pipeline',
      'ci/cd',
      'moderniz',
      'application',
    ],
  },
  {
    label: 'Visibility & Mgmt',
    keys: ['visibility', 'monitoring', 'vendor', 'sprawl', 'governance', 'centrali', 'observab'],
  },
  {
    label: 'Connectivity',
    keys: ['latency', 'network', 'connectivity', 'bandwidth', 'wan', 'sd-wan', 'sd wan'],
  },
  {
    label: 'Identity & Access',
    keys: [
      'identity',
      'iam',
      'pam',
      'privileged',
      'active directory',
      'sso',
      'mfa',
      'access management',
      'credential',
      'entra',
      'okta',
    ],
  },
  {
    label: 'M365 & Collab',
    keys: [
      'microsoft 365',
      'm365',
      'office 365',
      'teams',
      'sharepoint',
      'onedrive',
      'exchange',
      'collaboration',
      'intune',
      'copilot',
      'm365',
    ],
  },
  {
    label: 'Helpdesk & ITSM',
    keys: [
      'helpdesk',
      'service desk',
      'itsm',
      'break-fix',
      'ticket',
      'end user',
      'it support',
      'it staffing',
      'understaffed',
      '24x7 support',
      '24/7',
    ],
  },
  {
    label: 'Endpoint & MDM',
    keys: [
      'endpoint management',
      'uem',
      'mdm',
      'byod',
      'device management',
      'unmanaged device',
      'device inventory',
      'endpoint',
      'jamf',
      'device fleet',
    ],
  },
  {
    label: 'Storage & Backup',
    keys: [
      'storage',
      'nas',
      'san',
      'archive',
      'data lifecycle',
      'data tiering',
      'object storage',
      'tape',
      'data growth',
      'capacity',
      'file server',
    ],
  },
  {
    label: 'SRE & Reliability',
    keys: [
      'sre',
      'site reliability',
      'on-call',
      'toil',
      'mttr',
      'sla breach',
      'slo',
      'error budget',
      'runbook',
      'reliability',
    ],
  },
  {
    label: 'Email Security',
    keys: [
      'phish',
      'email security',
      'bec',
      'dmarc',
      'dkim',
      'spf',
      'email threat',
      'spam',
      'spear phish',
      'email impersonation',
      'wire fraud',
    ],
  },
]

export function inferPainPoints(title?: string, industry?: string): string[] {
  const tl = (title || '').toLowerCase()
  const ind = (industry || '').toLowerCase()
  const points: string[] = []

  for (const rule of INFER_RULES) {
    if (rule.titleKeys.some((k) => tl.includes(k))) {
      points.push(...rule.points)
      break
    }
  }

  const indMatch = Object.entries(INFER_INDUSTRY).find(([k]) => ind.includes(k))
  if (indMatch) {
    for (const p of indMatch[1]) {
      if (!points.includes(p)) points.push(p)
    }
  }

  if (!points.length) {
    return [
      'IT cost and operational efficiency gaps',
      'No 24/7 managed support coverage',
      'Security posture and compliance risks',
      'Legacy infrastructure hitting end-of-life',
      'Cloud migration complexity and risk',
      'Cybersecurity gaps and compliance exposure',
    ]
  }

  return points
}

export function detectTheme(painPoint: string): string {
  const lower = painPoint.toLowerCase()
  for (const t of PP_THEMES) {
    if (t.keys.some((k) => lower.includes(k))) return t.label
  }
  return ' Other'
}

import type { IntelligenceResult, ITType, Lead, Tier } from '@/types'
import { inferITType, inferTier } from '@/utils/lead'

export function deepInferAll(lead: Lead): IntelligenceResult {
  const emp = lead.employees || 0
  const ind = (lead.industry || '').toLowerCase()
  const tl = (lead.contact_title || '').toLowerCase()
  const budget = lead.annual_it_budget || ''
  const infra = lead.current_infra || ''
  const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, '')) || 0

  const isEnterprise = emp > 2000
  const isMidMarket = emp >= 200
  const segment = isEnterprise ? 'Enterprise' : isMidMarket ? 'Mid-Market' : 'SMB'
  const icpInd = lead.industry || 'Other'

  const icp_options = [
    {
      value: `${segment} ${icpInd}`,
      confidence: 'high' as const,
      reasoning: `${segment} segment based on ${emp.toLocaleString()} employees in ${lead.industry || 'unknown'} industry`,
    },
    {
      value: isEnterprise ? `Mid-Market ${icpInd}` : `Enterprise ${icpInd}`,
      confidence: 'medium' as const,
      reasoning: isEnterprise
        ? 'Could be Mid-Market if employee count is inflated or includes contractors'
        : 'Could be Enterprise if revenue or scope is larger than headcount suggests',
    },
    {
      value: isEnterprise ? `SMB ${icpInd}` : isMidMarket ? `SMB ${icpInd}` : `Mid-Market ${icpInd}`,
      confidence: 'low' as const,
      reasoning: 'Boundary case based on partial data — verify with actual revenue or budget figures',
    },
  ]

  const tier: Tier = inferTier(emp, budget)
  const itType: ITType = inferITType(lead.industry)
  const basePoints = inferPainPoints(lead.contact_title, lead.industry)

  const contextPoints: string[] = []
  if (budgetNum > 5) contextPoints.push('High IT budget indicates significant existing infrastructure investment — cost optimisation and ROI proof points will resonate strongly')
  if (isEnterprise) contextPoints.push('Enterprise scale means change management and migration complexity are key blockers — phased, low-risk approaches preferred')
  if (isMidMarket) contextPoints.push('Mid-market organisations typically run lean IT teams — managed services and automation reduce operational overhead')
  if (infra.toLowerCase().includes('cloud')) contextPoints.push('Already cloud-enabled — focus on FinOps, multi-cloud governance, and AI workload optimisation')
  if (infra.toLowerCase().includes('on-prem') || infra.toLowerCase().includes('legacy')) contextPoints.push('On-premise dependency creates urgency around end-of-life hardware and migration planning')
  if (infra.toLowerCase().includes('hybrid')) contextPoints.push('Hybrid infrastructure complexity creates visibility and orchestration gaps — unified management is critical')

  const allPoints = [...new Set([...contextPoints, ...basePoints])]
  const painList = allPoints.slice(0, 8)

  const company_context = `${lead.company} (${lead.industry}, ~${emp.toLocaleString()} employees, ${budget || 'unknown'} IT budget) operates with a ${itType} infrastructure model: current setup is "${infra || 'not specified'}". ${lead.contact_name} (${lead.contact_title || 'senior IT leader'}) is the primary contact. ${isEnterprise ? 'As a large enterprise with scale and complexity,' : isMidMarket ? 'As a mid-market organisation with growing IT needs,' : 'As a smaller organisation with constrained resources,'} they face pressures around ${ind.includes('healthcare') ? 'compliance and data sovereignty under NHS/government standards' : ind.includes('finance') ? 'regulatory compliance (FCA/PRA) and legacy modernisation' : ind.includes('manufacturing') ? 'OT/IT convergence, supply chain resilience, and Industry 4.0' : ind.includes('retail') ? 'omnichannel customer experience and e-commerce scalability' : ind.includes('logistics') ? 'supply chain visibility and fleet/warehouse modernisation' : ind.includes('legal') ? 'client data governance and practice management modernisation' : 'digital transformation, cost efficiency, and cybersecurity'}. The lead's role suggests decision-making authority over ${tl.includes('cfo') || tl.includes('finance') ? 'technology investment, vendor contracts, and IT budget allocation' : tl.includes('security') || tl.includes('ciso') ? 'security posture, risk management, and compliance frameworks' : tl.includes('cio') || tl.includes('cto') ? 'technology strategy, infrastructure architecture, and digital transformation roadmaps' : tl.includes('vp') || tl.includes('head') || tl.includes('director') ? 'infrastructure operations, team leadership, and vendor management' : 'IT operations and infrastructure decisions'}.`

  const key_challenges = (ind.includes('healthcare')
    ? [
        'HIPAA/DPA compliance burden for patient data in cloud/shared environments',
        'Legacy EHR system latency and interoperability with modern APIs',
        'Scaling AI for clinical decision support while maintaining data governance',
      ]
    : ind.includes('finance') || ind.includes('bank')
      ? [
          'FCA/PRA regulatory compliance for AI model outputs in financial services',
          'Core banking modernisation complexity — risk of disruption during migration',
          'Legacy system integration with cloud-native fintech platforms',
        ]
      : ind.includes('manufacturing')
        ? [
            'OT network segmentation and security in increasingly connected factory environments',
            'Inconsistent sensor data quality blocking predictive maintenance AI',
            'Supply chain visibility gaps exposed by recent global disruptions',
          ]
        : isEnterprise
          ? [
              'Scaling AI and automation initiatives from pilot to enterprise-wide production',
              'Managing multi-cloud/hybrid cost and complexity without centralised FinOps governance',
              'Addressing security and compliance across increasingly distributed infrastructure',
            ]
          : isMidMarket
            ? [
                'Running lean IT teams while managing growing infrastructure complexity and cloud sprawl',
                'Building business case for technology investment with limited internal benchmarking data',
                'Evaluating managed services vs in-house build for critical infrastructure capabilities',
              ]
            : [
                'Operating with constrained IT resources while managing basic compliance and security needs',
                'Prioritising limited technology budget across competing operational demands',
                'Finding cost-effective, low-risk entry points for cloud or managed services adoption',
              ]
  ).join('\n')

  const recommended_approach = `Position CES as a ${isEnterprise ? 'strategic partner who helps enterprises accelerate AI-ready infrastructure modernisation at scale' : 'trusted advisor who helps mid-market organisations build enterprise-grade IT operations without enterprise overhead'}. Lead with ${lead.contact_name}'s specific pain points around ${painList.slice(0, 2).map(p => (p.split('—')[0] || p).toLowerCase()).join(' and ')}. Reference the current infrastructure state ("${infra || 'mixed environment'}") and offer a no-obligation infrastructure assessment tailored to ${lead.company}'s ${lead.industry || 'current'} context. Emphasise CES experience with ${ind.includes('healthcare') ? 'NHS and healthcare providers' : ind.includes('finance') || ind.includes('bank') ? 'financial services and regulated institutions' : ind.includes('manufacturing') ? 'manufacturing and industrial enterprises' : ind.includes('retail') ? 'retail and e-commerce companies' : ind.includes('logistics') ? 'logistics and supply chain organisations' : 'organisations of similar size and complexity'} to build credibility.`

  const research = {
    recent_activities: `${lead.company}, a ${segment.toLowerCase()} ${lead.industry || 'cross-sector'} company with ~${emp.toLocaleString()} employees and ${budget || 'an estimated'} IT budget, is actively ${isEnterprise ? 'evaluating enterprise-wide AI infrastructure modernisation' : 'assessing cloud migration and managed services to support its growth trajectory'}. ${lead.contact_name} (${lead.contact_title || 'senior IT leader'}) is likely ${tl.includes('cfo') || tl.includes('finance') ? 'reviewing IT vendor contracts and optimising technology spend against budget targets' : tl.includes('security') || tl.includes('ciso') ? 'evaluating security posture improvements and compliance readiness after recent industry incidents' : tl.includes('cio') || tl.includes('cto') ? 'driving digital transformation and AI readiness initiatives from the technology side' : 'managing critical infrastructure upgrades and operational efficiency projects'}. Current infrastructure (${infra || 'mixed on-prem/cloud'}) ${infra.toLowerCase().includes('age') || infra.toLowerCase().includes('eol') ? 'is approaching end-of-life, creating urgency for modernisation' : infra.toLowerCase().includes('cloud') ? 'has a cloud foundation but likely needs FinOps governance' : 'presents both modernisation opportunities and migration complexity'}.`,
    key_drivers: `Primary initiative driver: ${lead.contact_name} (${lead.contact_title || 'senior IT leader'}) at ${lead.company}. Secondary influence likely from ${isEnterprise ? 'the CIO/CTO office and line-of-business heads' : 'the CEO/founder and department heads'}. Key motivators include: ${infra.toLowerCase().includes('eol') || infra.toLowerCase().includes('age') ? 'end-of-life infrastructure replacement timelines, ' : ''}${budgetNum > 5 ? `IT budget (${budget}) requiring cost optimisation focus, ` : ''}${painList.length ? `resolving identified pain points around ${painList.slice(0, 2).map(p => p.split('—')[0] || p).join(', ')}, ` : ''}and competitive pressure to modernise within the ${lead.industry || 'current'} sector.`,
    industry_trends: (ind.includes('healthcare')
      ? [
          'AI-powered clinical decision support driving data infrastructure investment at NHS trusts and private providers',
          'Data sovereignty and partner sharing compliance creating urgency for governed data platforms',
          'Legacy EHR modernisation timelines accelerating due to NHS interoperability mandates',
          'Cyber resilience requirements intensifying after high-profile healthcare ransomware attacks',
        ]
      : ind.includes('finance') || ind.includes('bank')
        ? [
            'Core banking modernisation driven by neobank competition and open banking regulations',
            'Regulatory compliance for AI in financial services requiring explainable, auditable model governance',
            'Quantum-safe cryptography migration planning beginning for financial data protection',
            'Cloud adoption in regulated financial environments growing with new compliance frameworks',
          ]
        : ind.includes('manufacturing')
          ? [
              'OT/IT convergence creating new attack surfaces requiring integrated security approaches',
              'Predictive maintenance AI scaling blocked by inconsistent sensor data pipelines across factory floors',
              'Supply chain resilience investment prioritised after recent global disruptions',
              'Digital twin and smart factory initiatives requiring modern, low-latency infrastructure',
            ]
          : ind.includes('retail')
            ? [
                'Real-time personalisation driving need for modern data platforms and AI/ML infrastructure',
                'E-commerce growth to 21% of total retail by 2030 requiring elastic, scalable infrastructure',
                'Customer data platform consolidation to enable consistent omnichannel experience',
                'Legacy POS and ERP systems blocking API-first connectivity required by agentic AI',
              ]
            : [
                'AI adoption accelerating across the sector with infrastructure modernisation as the primary enabler',
                'Data governance and sovereignty becoming board-level priorities',
                'Cybersecurity investment increasing in response to ransomware and supply-chain threats',
                'Cloud FinOps emerging as a standard practice for controlling multi-cloud spend',
              ]
    ).join('\n'),
    next_portfolio: `Recommended near-term priorities for ${lead.company}: 1) Infrastructure assessment and risk register, 2) AI-ready data platform roadmap, 3) Multi-cloud FinOps governance, 4) Security and compliance posture review, 5) Managed services or SRE augmentation to close capacity gaps.`,
    ces_support: `CES can support ${lead.company} through managed IT services, cloud migration, AI-ready infrastructure design, FinOps governance, cybersecurity programs, and 24/7 SRE-led operations. The engagement typically starts with a no-obligation infrastructure assessment aligned to ${lead.industry || 'the sector'} priorities.`,
  }

  return {
    icp: icp_options[0].value,
    icp_options,
    tier,
    it_type: itType,
    pain_points: painList,
    enrichment: {
      company_context,
      key_challenges,
      recommended_approach,
    },
    research,
  }
}
