import { describe, expect, it } from 'vitest'
import { createScanAttemptTracker } from '../scanIdempotency.js'

const payload = {
  campaniaId: 7,
  skuRaw: 'ABC-1',
  skuNormalized: 'ABC-1',
  sugeridos: { categoria_cod: '01', tipo_cod: '02', clasif_cod: '03' },
}

describe('scan idempotency attempts', () => {
  it('reuses the key while retrying the same logical payload', () => {
    let sequence = 0
    const tracker = createScanAttemptTracker(() => `key-${++sequence}`)
    expect(tracker.keyFor(payload)).toBe('key-1')
    expect(tracker.keyFor({ ...payload, username: 'otro-operador' })).toBe('key-1')
  })

  it('rotates the key after a payload change or successful completion', () => {
    let sequence = 0
    const tracker = createScanAttemptTracker(() => `key-${++sequence}`)
    const first = tracker.keyFor(payload)
    expect(tracker.keyFor({ ...payload, skuRaw: 'ABC-2' })).toBe('key-2')
    tracker.complete('key-2')
    expect(tracker.keyFor({ ...payload, skuRaw: 'ABC-2' })).toBe('key-3')
    tracker.complete(first)
    expect(tracker.keyFor({ ...payload, skuRaw: 'ABC-2' })).toBe('key-3')
  })
})
