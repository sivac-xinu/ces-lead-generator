import { describe, expect, it } from 'vitest'
import { displayName, firstName } from './user'

describe('user utils', () => {
  it('displayName returns full name when both names present', () => {
    expect(displayName({ first_name: 'Siva', last_name: 'Chandra', email: 'siva@cesltd.com' })).toBe('Siva Chandra')
  })

  it('displayName returns first name when last name missing', () => {
    expect(displayName({ first_name: 'Siva', email: 'siva@cesltd.com' })).toBe('Siva')
  })

  it('displayName derives name from email local part when no names', () => {
    expect(displayName({ email: 'akbar.khan@cesltd.com' })).toBe('Akbar Khan')
    expect(displayName({ email: 'jahnavi.avireni@cesltd.com' })).toBe('Jahnavi Avireni')
  })

  it('displayName falls back to raw email when name cannot be derived', () => {
    expect(displayName({ email: 'info@cesltd.com' })).toBe('info@cesltd.com')
  })

  it('displayName returns empty string for null/undefined', () => {
    expect(displayName(null)).toBe('')
    expect(displayName(undefined)).toBe('')
  })

  it('firstName returns first name when available', () => {
    expect(firstName({ first_name: 'Siva', email: 'siva@cesltd.com' })).toBe('Siva')
  })

  it('firstName derives first name from email local part', () => {
    expect(firstName({ email: 'akbar.khan@cesltd.com' })).toBe('Akbar')
    expect(firstName({ email: 'jahnavi.avireni@cesltd.com' })).toBe('Jahnavi')
  })
})
