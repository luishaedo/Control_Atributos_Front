// Utilidades de SKU (limpieza y normalización de códigos)
export function cleanSku(raw = '') {
  if (!raw) return ''
  const m = raw.match(/^[A-Za-z0-9]+/)
  return (m ? m[0] : '').toUpperCase()
}

export function pad2(x) {
  if (x === null || x === undefined) return ''
  const soloDigitos = String(x).replace(/\D/g, '')
  return soloDigitos.padStart(2, '0')
}
