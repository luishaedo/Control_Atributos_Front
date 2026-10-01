import { describe, expect, it } from 'vitest'
import { cleanSku, pad2, parseCode, parseSku } from '../sku'

describe('SKU utilities', () => {
  it('separates # and $ suffixes and normalizes only the base', () => {
    expect(parseSku(' abC123#etiqueta ')).toMatchObject({
      valid: true, normalized: 'ABC123', separator: '#', suffix: 'etiqueta', hadSuffix: true,
    })
    expect(cleanSku('xy9$precio')).toBe('XY9')
  })

  it('returns an empty string when value is missing', () => {
    expect(cleanSku()).toBe('')
  })

  it('left-pads numeric values to two digits', () => {
    expect(pad2(7)).toBe('07')
  })

  it('rejects SKU formats outside the agreed domain', () => {
    expect(parseSku('ABC-123')).toMatchObject({ valid: false, normalized: '', reason: 'INVALID_FORMAT' })
    expect(cleanSku('ABC 123')).toBe('')
  })

  it('rejects codes instead of stripping or truncating them', () => {
    expect(parseCode('A-9')).toMatchObject({ valid: false, normalized: '' })
    expect(parseCode('123')).toMatchObject({ valid: false, normalized: '' })
    expect(pad2('A-9')).toBe('')
    expect(pad2('123')).toBe('')
  })
})
