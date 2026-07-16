import { describe, it, expect } from 'vitest'
import { classifyBasic, classifyDeep } from './classify'
import { LEADS } from '@/data/leads'

describe('classify', () => {
  it('classifyBasic returns it_type, tier, icp', () => {
    const c = classifyBasic({ industry: 'Finance', employees: 720, annual_it_budget: '$4.2M' })
    expect(c).toHaveProperty('it_type')
    expect(c).toHaveProperty('tier')
    expect(c).toHaveProperty('icp')
  })

  it('classifyDeep tier matches classifyBasic tier for the same lead', () => {
    const lead = LEADS[0]
    expect(classifyDeep(lead).tier).toBe(classifyBasic(lead).tier)
  })
})
