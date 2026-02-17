import { useCallback, useMemo } from 'react'

function includesIgnoreCase(value, term) {
  return String(value || '').toLowerCase().includes(String(term || '').toLowerCase())
}

export default function useColaFilters({
  cola,
  colaEstado,
  seleccion,
  filters,
}) {
  const {
    fSKU,
    fEstado,
    fOldCat,
    fNewCat,
    fOldTipo,
    fNewTipo,
    fOldCla,
    fNewCla,
    fDecideBy,
  } = filters

  const filtroRow = useCallback((row) => {
    if (colaEstado && row.estado !== colaEstado) return false
    if (fEstado && row.estado !== fEstado) return false

    if (fSKU && !includesIgnoreCase(row.sku, fSKU)) return false
    if (fOldCat && !includesIgnoreCase(row.old_categoria_cod, fOldCat)) return false
    if (fNewCat && !includesIgnoreCase(row.new_categoria_cod, fNewCat)) return false
    if (fOldTipo && !includesIgnoreCase(row.old_tipo_cod, fOldTipo)) return false
    if (fNewTipo && !includesIgnoreCase(row.new_tipo_cod, fNewTipo)) return false
    if (fOldCla && !includesIgnoreCase(row.old_clasif_cod, fOldCla)) return false
    if (fNewCla && !includesIgnoreCase(row.new_clasif_cod, fNewCla)) return false
    if (fDecideBy && !includesIgnoreCase(row.decidedBy, fDecideBy)) return false

    return true
  }, [colaEstado, fDecideBy, fEstado, fNewCat, fNewCla, fNewTipo, fOldCat, fOldCla, fOldTipo, fSKU])

  const colaFiltrada = useMemo(() => (cola || []).filter(filtroRow), [cola, filtroRow])

  const allVisibleSelected = useMemo(() => {
    const visibleIds = new Set(colaFiltrada.map((row) => row.id))
    if (!visibleIds.size) return false
    return Array.from(visibleIds).every((id) => seleccion.includes(id))
  }, [colaFiltrada, seleccion])

  return {
    colaFiltrada,
    allVisibleSelected,
  }
}
