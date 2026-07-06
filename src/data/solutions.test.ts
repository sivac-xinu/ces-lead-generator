import { describe, expect, it } from 'vitest'
import { matchSolutions, SEED_SOLUTIONS } from './solutions'

describe('SEED_SOLUTIONS', () => {
  it('contains solution records', () => {
    expect(SEED_SOLUTIONS.length).toBeGreaterThan(0)
    expect(SEED_SOLUTIONS[0].service).toBeDefined()
    expect(SEED_SOLUTIONS[0].keywords.length).toBeGreaterThan(0)
  })
})

describe('matchSolutions', () => {
  it('matches solutions by keyword substring', () => {
    const matched = matchSolutions('Cloud cost overrun is killing our budget')
    expect(matched.length).toBeGreaterThan(0)
    expect(matched[0].service).toBe('FinOps for AI & Cloud Cost Governance')
  })

  it('returns up to two matches', () => {
    const matched = matchSolutions('Cloud cost and security ransomware')
    expect(matched.length).toBeLessThanOrEqual(2)
  })

  it('returns fallback when no match', () => {
    const matched = matchSolutions('Something unrelated')
    expect(matched.length).toBe(1)
    expect(matched[0].service).toBe('Managed IT Services')
  })

  it('is case-insensitive', () => {
    const lower = matchSolutions('cloud cost')
    const upper = matchSolutions('CLOUD COST')
    expect(lower[0].service).toBe(upper[0].service)
  })
})
