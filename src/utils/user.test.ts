import { describe, expect, it } from 'vitest'
import { displayName, firstName } from './user'

describe('user utils', () => {
  it('displayName returns full name when both names present', () => {
    expect(displayName({ first_name: 'Siva', last_name: 'Chandra', email: 'siva@cesltd.com' })).toBe('Siva Chandra')
  })

  it('displayName returns first name when last name missing', () => {
    expect(displayName({ first_name: 'Siva', email: 'siva@cesltd.com' })).toBe('Siva')
  })

  it('displayName falls back to email when no names', () => {
    expect(displayName({ email: 'siva@cesltd.com' })).toBe('siva@cesltd.com')
  })

  it('displayName returns empty string for null/undefined', () => {
    expect(displayName(null)).toBe('')
    expect(displayName(undefined)).toBe('')
  })

  it('firstName returns first name when available', () => {
    expect(firstName({ first_name: 'Siva', email: 'siva@cesltd.com' })).toBe('Siva')
  })

  it('firstName falls back to email local part', () => {
    expect(firstName({ email: 'siva.chandra@cesltd.com' })).toBe('siva.chandra')
  })
})
