import { useCallback, useEffect } from 'react'
import {
  getRevisiones,
  getMissingMaestro,
  getConfirmaciones,
  getConsolidacionCambios,
  listarActualizaciones,
} from '../../../services/adminApi'

export default function useRevisionesDataLoader({
  authOK,
  campaniaId,
  sku,
  consenso,
  soloDif,
  colaArchivada,
  colaEstado,
  activeTab,
  confirmItems,
  messageTimeoutRef,
  setItems,
  setCola,
  setSeleccion,
  setMissingLoading,
  setMissingError,
  setMissingItems,
  setConfirmLoading,
  setConfirmError,
  setConfirmItems,
  setConsolidateLoading,
  setConsolidateError,
  setConsolidateItems,
  setConfirmTargets,
}) {
  const cargar = useCallback(async () => {
    const data = await getRevisiones({
      campaniaId,
      sku,
      consenso,
      soloConDiferencias: String(soloDif),
    })
    setItems(data.items || [])

    const archivada =
      colaArchivada === 'activas' ? 'false'
        : colaArchivada === 'archivadas' ? 'true'
          : 'todas'

    const acts = await listarActualizaciones(Number(campaniaId), {
      estado: colaEstado || undefined,
      archivada,
    })

    setCola(acts.items || [])
    setSeleccion((sel) => sel.filter((id) => (acts.items || []).some((item) => item.id === id)))
  }, [campaniaId, colaArchivada, colaEstado, consenso, setCola, setItems, setSeleccion, sku, soloDif])

  const loadMissingItems = useCallback(async () => {
    if (!authOK || !campaniaId) return
    try {
      setMissingLoading(true)
      setMissingError('')
      const data = await getMissingMaestro(Number(campaniaId))
      setMissingItems(data.items || [])
    } catch (error) {
      setMissingError(error?.message || 'No se pudieron cargar los artículos faltantes en maestro.')
    } finally {
      setMissingLoading(false)
    }
  }, [authOK, campaniaId, setMissingError, setMissingItems, setMissingLoading])

  const loadConfirmaciones = useCallback(async () => {
    if (!authOK || !campaniaId) return
    try {
      setConfirmLoading(true)
      setConfirmError('')
      const data = await getConfirmaciones(Number(campaniaId))
      setConfirmItems(data.items || [])
    } catch (error) {
      setConfirmError(error?.message || 'No se pudieron cargar las confirmaciones.')
    } finally {
      setConfirmLoading(false)
    }
  }, [authOK, campaniaId, setConfirmError, setConfirmItems, setConfirmLoading])

  const loadConsolidacion = useCallback(async () => {
    if (!authOK || !campaniaId) return
    try {
      setConsolidateLoading(true)
      setConsolidateError('')
      const data = await getConsolidacionCambios(Number(campaniaId))
      setConsolidateItems(data.items || [])
    } catch (error) {
      setConsolidateError(error?.message || 'No se pudieron cargar los cambios de consolidación.')
    } finally {
      setConsolidateLoading(false)
    }
  }, [authOK, campaniaId, setConsolidateError, setConsolidateItems, setConsolidateLoading])

  useEffect(() => {
    if (!authOK || !campaniaId) return
    cargar().catch((error) => console.error('[Revisiones] cargar error', error))
  }, [authOK, campaniaId, cargar])

  useEffect(() => {
    if (activeTab === 'export') loadMissingItems()
  }, [activeTab, loadMissingItems])

  useEffect(() => {
    if (activeTab === 'confirm') loadConfirmaciones()
  }, [activeTab, loadConfirmaciones])

  useEffect(() => {
    if (activeTab === 'consolidate') loadConsolidacion()
  }, [activeTab, loadConsolidacion])

  useEffect(() => {
    if (!confirmItems.length) return
    setConfirmTargets((prev) => {
      const next = { ...prev }
      confirmItems.forEach((item) => {
        if (next[item.sku] === undefined) next[item.sku] = 'consolidate'
      })
      return next
    })
  }, [confirmItems, setConfirmTargets])

  useEffect(() => () => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
  }, [messageTimeoutRef])

  return {
    cargar,
    loadMissingItems,
    loadConfirmaciones,
    loadConsolidacion,
  }
}
