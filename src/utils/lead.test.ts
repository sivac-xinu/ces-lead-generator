import { describe, expect, it } from 'vitest'
import { dbRowToLead, inferICP, inferITType, inferTier, leadToDbRow, sizeBucket } from './lead'
import type { DbLead, Lead } from '@/types'

describe('sizeBucket', () => {
  it('returns correct buckets', () => {
    expect(sizeBucket(10)).toBe('1-50')
    expect(sizeBucket(100)).toBe('50-200')
    expect(sizeBucket(350)).toBe('200-500')
    expect(sizeBucket(750)).toBe('500-1000')
    expect(sizeBucket(2500)).toBe('1000-5000')
    expect(sizeBucket(6000)).toBe('5000+')
  })

  it('returns dash for missing value', () => {
    expect(sizeBucket(null)).toBe('—')
    expect(sizeBucket(undefined)).toBe('—')
  })
})

describe('inferITType', () => {
  it('detects cloud-heavy industries', () => {
    expect(inferITType('Technology')).toBe('Cloud')
    expect(inferITType('SaaS')).toBe('Cloud')
  })

  it('detects on-premise-heavy industries', () => {
    expect(inferITType('Manufacturing')).toBe('On-Premise')
    expect(inferITType('Healthcare')).toBe('On-Premise')
  })

  it('defaults to hybrid', () => {
    expect(inferITType('Retail')).toBe('Hybrid')
  })
})

describe('inferTier', () => {
  it('uses employee count', () => {
    expect(inferTier(3000)).toBe('Tier 1')
    expect(inferTier(500)).toBe('Tier 2')
    expect(inferTier(50)).toBe('Tier 3')
  })

  it('uses budget when available', () => {
    expect(inferTier(100, '$15M')).toBe('Tier 1')
    expect(inferTier(100, '$5M')).toBe('Tier 2')
  })
})

describe('inferICP', () => {
  it('returns Enterprise for large companies', () => {
    expect(inferICP(5000)).toBe('Enterprise')
    expect(inferICP(2001)).toBe('Enterprise')
  })

  it('returns Mid-Market for medium companies', () => {
    expect(inferICP(200)).toBe('Mid-Market')
    expect(inferICP(1500)).toBe('Mid-Market')
  })

  it('returns SMB for small or unknown companies', () => {
    expect(inferICP(50)).toBe('SMB')
    expect(inferICP(null)).toBe('SMB')
    expect(inferICP(undefined)).toBe('SMB')
  })
})

describe('dbRowToLead', () => {
  it('normalizes db row to lead', () => {
    const row: DbLead = {
      id: 1,
      company: 'Acme',
      contact_name: 'John Doe',
      contact_title: 'CTO',
      industry: 'Technology',
      employees: 150,
      company_size: '50-200',
      it_type: 'Cloud',
      pain_points: ['legacy'],
    }
    const lead = dbRowToLead(row)
    expect(lead.size).toBe('50-200')
    expect(lead.it_type).toBe('Cloud')
    expect(lead.pain_points).toEqual(['legacy'])
  })
})

describe('leadToDbRow', () => {
  it('maps size to company_size', () => {
    const db = leadToDbRow({ size: '50-200', company: 'Acme' } as Partial<Lead>)
    expect(db.company_size).toBe('50-200')
  })
})
