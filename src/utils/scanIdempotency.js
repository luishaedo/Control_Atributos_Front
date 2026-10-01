function randomKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)
  return `${Date.now().toString(36)}-${Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')}`
}

function fingerprint(payload = {}) {
  return JSON.stringify({
    campaniaId: Number(payload.campaniaId || 0),
    skuRaw: String(payload.skuRaw || '').trim(),
    skuNormalized: String(payload.skuNormalized || '').trim(),
    sugeridos: {
      categoria_cod: String(payload.sugeridos?.categoria_cod || '').trim(),
      tipo_cod: String(payload.sugeridos?.tipo_cod || '').trim(),
      clasif_cod: String(payload.sugeridos?.clasif_cod || '').trim(),
    },
  })
}

export function createScanAttemptTracker(makeKey = randomKey) {
  let current = null
  return {
    keyFor(payload) {
      const nextFingerprint = fingerprint(payload)
      if (!current || current.fingerprint !== nextFingerprint) {
        current = { fingerprint: nextFingerprint, key: makeKey() }
      }
      return current.key
    },
    complete(key) {
      if (current?.key === key) current = null
    },
    reset() {
      current = null
    },
  }
}
