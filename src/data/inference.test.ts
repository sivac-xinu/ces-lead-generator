import { describe, expect, it } from 'vitest'
import {
  CES_FIELDS,
  detectTheme,
  FIELD_SYNONYMS,
  INFER_INDUSTRY,
  INFER_RULES,
  inferPainPoints,
  PP_THEMES,
} from './inference'

describe('INFER_RULES', () => {
  it('contains title-based inference rules', () => {
    expect(INFER_RULES.length).toBe(8)
    expect(INFER_RULES[0].titleKeys).toContain('ciso')
    expect(INFER_RULES[0].points.length).toBeGreaterThan(0)
  })
})

describe('INFER_INDUSTRY', () => {
  it('contains industry pain points', () => {
    expect(INFER_INDUSTRY.healthcare.length).toBe(6)
    expect(INFER_INDUSTRY.finance.length).toBe(6)
  })
})

describe('CES_FIELDS', () => {
  it('defines CSV field mappings', () => {
    expect(CES_FIELDS.find((f) => f.key === 'company')?.required).toBe(true)
    expect(CES_FIELDS.find((f) => f.key === 'industry')?.default).toBe('Other')
  })
})

describe('FIELD_SYNONYMS', () => {
  it('maps common CSV headers', () => {
    expect(FIELD_SYNONYMS.contact_name).toContain('full name')
    expect(FIELD_SYNONYMS.company).toContain('company name')
  })
})

describe('PP_THEMES', () => {
  it('contains pain point themes', () => {
    expect(PP_THEMES.length).toBeGreaterThan(0)
    expect(PP_THEMES[0].label).toBe('Cloud Migration')
  })
})

describe('inferPainPoints', () => {
  it('returns title-based points', () => {
    const points = inferPainPoints('Chief Information Officer', 'Technology')
    expect(points.length).toBeGreaterThan(0)
    expect(points[0]).toContain('88% of orgs use AI')
  })

  it('includes industry points when no title match', () => {
    const points = inferPainPoints('', 'Healthcare')
    expect(points.some((p) => p.includes('HIPAA'))).toBe(true)
  })

  it('deduplicates title and industry points', () => {
    const points = inferPainPoints('CTO', 'Finance')
    const set = new Set(points)
    expect(set.size).toBe(points.length)
  })

  it('returns fallback points for unknown inputs', () => {
    const points = inferPainPoints('', '')
    expect(points).toContain('IT cost and operational efficiency gaps')
    expect(points).toContain('No 24/7 managed support coverage')
  })
})

describe('detectTheme', () => {
  it('detects cloud migration theme', () => {
    expect(detectTheme('We need to migrate to the cloud')).toBe('Cloud Migration')
  })

  it('detects security theme', () => {
    expect(detectTheme('Ransomware threats are increasing')).toBe('Security')
  })

  it('returns fallback for unmatched pain points', () => {
    expect(detectTheme('Something random')).toBe(' Other')
  })

  it('is case-insensitive', () => {
    expect(detectTheme('CLOUD MIGRATION')).toBe('Cloud Migration')
  })
})
