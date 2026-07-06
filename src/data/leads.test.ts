import { describe, expect, it } from 'vitest'
import { LEADS } from './leads'

describe('LEADS', () => {
  it('contains seed leads', () => {
    expect(LEADS.length).toBe(15)
  })

  it('has required lead fields', () => {
    const lead = LEADS[0]
    expect(lead.company).toBe('Meridian Financial Group')
    expect(lead.pain_points.length).toBeGreaterThan(0)
    expect(['Cloud', 'On-Premise', 'Hybrid', 'Unknown']).toContain(lead.it_type)
  })

  it('has unique ids', () => {
    const ids = LEADS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
