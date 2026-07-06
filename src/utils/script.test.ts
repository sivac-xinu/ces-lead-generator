import { describe, expect, it } from 'vitest'
import { buildScript, fillTemplate, getTalkingPoints } from './script'
import { TONES } from '@/data/tones'
import type { Lead, Solution } from '@/types'

const mockLead: Lead = {
  id: 1,
  company: 'Acme Inc',
  contact_name: 'John Doe',
  contact_title: 'CTO',
  industry: 'Technology',
  it_type: 'Hybrid',
  pain_points: ['legacy systems', 'cloud cost overruns'],
  current_infra: 'mixed on-prem and cloud',
}

const mockSolutions: Solution[] = [
  {
    id: '1',
    service: 'FinOps',
    pitch: 'We optimise cloud spend.',
    trend: 'Cloud costs are rising.',
    buySignal: 'CFO mentions budget pressure.',
    stat: 'Clients save 30%.',
    keywords: [],
    icon: '',
    urgency: 'high',
  },
]

describe('fillTemplate', () => {
  it('replaces placeholders', () => {
    const out = fillTemplate('Hello {firstName} at {company}', mockLead, mockSolutions)
    expect(out).toBe('Hello John at Acme Inc')
  })

  it('uses fallback pain points', () => {
    const out = fillTemplate('Pain: {pain1}, {pain2}', { ...mockLead, pain_points: [] }, mockSolutions)
    expect(out).toContain('operational efficiency gaps')
  })
})

describe('buildScript', () => {
  it('returns 5 sections', () => {
    const script = buildScript(mockLead, TONES.consultative, mockSolutions)
    expect(script).toHaveLength(5)
    expect(script[0].section).toBe('Opening / Hook')
  })
})

describe('getTalkingPoints', () => {
  it('returns 4 talking points', () => {
    const points = getTalkingPoints(mockLead, mockSolutions)
    expect(points).toHaveLength(4)
    expect(points[0]).toContain('hybrid complexity')
  })
})
