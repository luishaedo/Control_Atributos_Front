import { useCallback, useEffect, useRef } from 'react'
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
  const mainLoadSeqRef = useRef(0)
  const missingSeqRef = useRef(0)
  const confirmSeqRef = useRef(0)
  const consolidateSeqRef = useRef(0)

  const cargar = useCallback(async () => {
    const requestSeq = mainLoadSeqRef.current + 1
    mainLoadSeqRef.current = requestSeq

    const data = await getRevisiones({
      campaniaId,
      sku,
      consenso,
      soloConDiferencias: String(soloDif),
    })
    if (mainLoadSeqRef.current !== requestSeq) return
    setItems(data.items || [])

    const archivada =
      colaArchivada === 'activas' ? 'false'
        : colaArchivada === 'archivadas' ? 'true'
          : 'todas'

    const acts = await listarActualizaciones(Number(campaniaId), {
      estado: colaEstado || undefined,
      archivada,
    })
    if (mainLoadSeqRef.current !== requestSeq) return

    setCola(acts.items || [])
    setSeleccion((sel) => sel.filter((id) => (acts.items || []).some((item) => item.id === id)))
  }, [campaniaId, colaArchivada, colaEstado, consenso, setCola, setItems, setSeleccion, sku, soloDif])

  const loadMissingItems = useCallback(async () => {
    if (!authOK || !campaniaId) return
    const requestSeq = missingSeqRef.current + 1
    missingSeqRef.current = requestSeq

    try {
      setMissingLoading(true)
      setMissingError('')
      const data = await getMissingMaestro(Number(campaniaId))
      if (missingSeqRef.current !== requestSeq) return
      setMissingItems(data.items || [])
    } catch (error) {
      if (missingSeqRef.current !== requestSeq) return
      setMissingError(error?.message || 'No se pudieron cargar los articulos faltantes en maestro.')
    } finally {
      if (missingSeqRef.current === requestSeq) setMissingLoading(false)
    }
  }, [authOK, campaniaId, setMissingError, setMissingItems, setMissingLoading])

  const loadConfirmaciones = useCallback(async () => {
    if (!authOK || !campaniaId) return
    const requestSeq = confirmSeqRef.current + 1
    confirmSeqRef.current = requestSeq

    try {
      setConfirmLoading(true)
      setConfirmError('')
      const data = await getConfirmaciones(Number(campaniaId))
      if (confirmSeqRef.current !== requestSeq) return
      setConfirmItems(data.items || [])
    } catch (error) {
      if (confirmSeqRef.current !== requestSeq) return
      setConfirmError(error?.message || 'No se pudieron cargar las confirmaciones.')
    } finally {
      if (confirmSeqRef.current === requestSeq) setConfirmLoading(false)
    }
  }, [authOK, campaniaId, setConfirmError, setConfirmItems, setConfirmLoading])

  const loadConsolidacion = useCallback(async () => {
    if (!authOK || !campaniaId) return
    const requestSeq = consolidateSeqRef.current + 1
    consolidateSeqRef.current = requestSeq

    try {
      setConsolidateLoading(true)
      setConsolidateError('')
      const data = await getConsolidacionCambios(Number(campaniaId))
      if (consolidateSeqRef.current !== requestSeq) return
      setConsolidateItems(data.items || [])
    } catch (error) {
      if (consolidateSeqRef.current !== requestSeq) return
      setConsolidateError(error?.message || 'No se pudieron cargar los cambios de consolidacion.')
    } finally {
      if (consolidateSeqRef.current === requestSeq) setConsolidateLoading(false)
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
