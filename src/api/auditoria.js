export async function apiGetDiscrepancias({ campaniaId, sku = '', minVotos = 1, token = '' }) {
  const params = new URLSearchParams({ campaniaId: String(campaniaId), sku, minVotos: String(minVotos) })
  const res = await fetch(`/api/admin/discrepancias?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json() // { items: [...] }
}

export async function apiGetDiscrepanciasSucursales({ campaniaId, sku = '', minSucursales = 2, token = '' }) {
  const params = new URLSearchParams({ campaniaId: String(campaniaId), sku, minSucursales: String(minSucursales) })
  const res = await fetch(`/api/admin/discrepancias-sucursales?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json() // { items: [...] }
}
