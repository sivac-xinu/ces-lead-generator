import type { ICP, ITType, Lead, Tier, IntelligenceResult } from '@/types'
import { inferICP, inferITType, inferTier } from '@/utils/lead'
import { inferPainPoints } from '@/data/inference'

export function classifyBasic(lead: Partial<Lead>): { it_type: ITType; tier: Tier; icp: ICP } {
  return {
    it_type: inferITType(lead.industry),
    tier: inferTier(lead.employees, lead.annual_it_budget),
    icp: inferICP(lead.employees),
  }
}

export function classifyDeep(lead: Lead): IntelligenceResult {
  const emp = lead.employees || 0
  const ind = (lead.industry || '').toLowerCase()
  const tl = (lead.contact_title || '').toLowerCase()
  const budget = lead.annual_it_budget || ''
  const infra = lead.current_infra || ''
  const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, '')) || 0

  const isEnterprise = emp > 2000
  const isMidMarket = emp >= 200
  const segment = isEnterprise ? 'Enterprise' : isMidMarket ? 'Mid-Market' : 'SMB'
  const icpInd = lead.industry && lead.industry !== 'Other' ? lead.industry : undefined

  const titleIcp = tl.includes('ciso') || tl.includes('security')
    ? 'Cybersecurity'
    : tl.includes('cio') || tl.includes('cto') || tl.includes('vp') || tl.includes('head')
      ? 'IT Leadership'
      : tl.includes('cfo') || tl.includes('finance')
        ? 'Finance Technology'
        : tl.includes('operations') || tl.includes('sre')
          ? 'Infrastructure Operations'
          : undefined

  const baseIcp = icpInd ?? titleIcp ?? 'General Business'
  const altIcp = titleIcp && titleIcp !== baseIcp ? titleIcp : undefined

  const icp_options = [
    {
      value: `${segment} ${baseIcp}`,
      confidence: 'high' as const,
      reasoning: `${segment} segment based on ${emp ? `${emp.toLocaleString()} employees` : 'available profile data'}${icpInd ? ` in ${lead.industry}` : titleIcp ? ` with ${lead.contact_title} as contact` : ''}`,
    },
    ...(altIcp
      ? [
          {
            value: `${segment} ${altIcp}`,
            confidence: 'medium' as const,
            reasoning: `Contact role (${lead.contact_title}) suggests a ${altIcp} buying centre`,
          },
        ]
      : []),
    {
      value: isEnterprise ? `Mid-Market ${baseIcp}` : `Enterprise ${baseIcp}`,
      confidence: 'medium' as const,
      reasoning: isEnterprise
        ? 'Could be Mid-Market if employee count is inflated or includes contractors'
        : 'Could be Enterprise if revenue or scope is larger than headcount suggests',
    },
    {
      value: isEnterprise ? `SMB ${baseIcp}` : isMidMarket ? `SMB ${baseIcp}` : `Mid-Market ${baseIcp}`,
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
    industry: lead.industry,
    employees: lead.employees,
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
