import { describe, expect, it } from 'vitest'
import { cleanSku, pad2 } from '../sku'

describe('SKU utilities', () => {
  it('normalizes alphanumeric values to uppercase', () => {
    expect(cleanSku('abC123-extra')).toBe('ABC123')
  })

  it('returns an empty string when value is missing', () => {
    expect(cleanSku()).toBe('')
  })

  it('left-pads numeric values to two digits', () => {
    expect(pad2(7)).toBe('07')
  })

  it('strips non-numeric characters before padding', () => {
    expect(pad2('A-9')).toBe('09')
  })
})
