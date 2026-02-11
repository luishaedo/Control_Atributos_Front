// src/pages/Revisiones.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Card,
  Button,
  Row,
  Col,
  Form,
  Badge,
  Stack,
  Table,
  Accordion,
  OverlayTrigger,
  Tooltip,
  Dropdown,
  ButtonGroup,
  Tabs,
  Tab,
  Modal,
  Toast,
  ToastContainer
} from 'react-bootstrap'
import { getDictionaries } from '../services/api'
import { pad2 } from '../utils/sku'
import {
  badgeDecision,
  buildAttributeOptions,
  consensusLabel,
  etiqueta,
  etiquetaNombre,
  getAcceptedAttributeCode,
  getAcceptedAttributeDecision,
  hasValidCode,
  resolveAttributeValue,
  shortUserLabel,
} from '../utils/revisionesHelpers.jsx'
import { EmptyState } from '../components/ui.jsx'
import {
  // Revisiones
  getRevisiones, decidirRevision,
  importarMaestroJSON, getMissingMaestro,
  getConfirmaciones, getConsolidacionCambios, cerrarCampania,
  // Cola
  listarActualizaciones, exportActualizacionesCSV, aplicarActualizaciones,
  archivarActualizaciones, undoActualizacion, revertirActualizacion,
  // TXT
  exportTxtCategoria, exportTxtTipo, exportTxtClasif, exportSummaryTxt, fetchAdminBlobByUrl,
  updateUnknownSku,
  updateUnknown, rejectUnknown, moverEtapa,
} from '../services/adminApi'

// ===== Helpers =====
function descargarBlobDirecto(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
function getNewAttributeValue(item, field) {
  const accepted = getAcceptedAttributeCode(item?.propuestas, field)
  if (accepted) return accepted
  if (field === 'categoria_cod') return item?.maestro?.categoria_cod || ''
  if (field === 'tipo_cod') return item?.maestro?.tipo_cod || ''
  return item?.maestro?.clasif_cod || ''
}

async function descargarBlobDesdeUrl(url, nombre) {
  const blob = await fetchAdminBlobByUrl(url)
  descargarBlobDirecto(blob, nombre)
}

export default function Revisiones({ campanias, campaniaIdDefault, authOK }) {
  // ===== Estado general =====
  const [activeTab, setActiveTab] = useState('revisiones')
  const [dic, setDic] = useState(null)
  const [uiMessage, setUiMessage] = useState(null)
  const messageTimeoutRef = useRef(null)

  // —— Filtros tarjetas (revisiones)
  const [campaniaId, setCampaniaId] = useState(String(campaniaIdDefault || ''))
  const [sku, setSku] = useState('')
  const [consenso, setConsenso] = useState('') // '', 'true', 'false'
  const [soloDif, setSoloDif] = useState(true)
  const [items, setItems] = useState([])
  const [filtroDecision, setFiltroDecision] = useState('pendientes') // 'pendientes'|'aceptadas'|'rechazadas'|'todas'

  // —— Cola
  const [cola, setCola] = useState([])
  const [seleccion, setSeleccion] = useState([])

  // Toolbar de la cola (server-side)
  const [colaEstado, setColaEstado] = useState('')              // '', 'pendiente', 'aplicada', 'rechazada'
  const [colaArchivada, setColaArchivada] = useState('activas') // 'activas'|'archivadas'|'todas'
  const [exportIncludeArchived, setExportIncludeArchived] = useState(false)
  const [toast, setToast] = useState({ show: false, variant: 'success', message: '' })
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [lastExportKind, setLastExportKind] = useState('')
  const [lastActionSku, setLastActionSku] = useState('')
  const [currentSku, setCurrentSku] = useState('')
  const [evaluarOrder, setEvaluarOrder] = useState([])
  const [evaluarNotice, setEvaluarNotice] = useState('')
  const [stageBySku, setStageBySku] = useState({})
  const [confirmFlags, setConfirmFlags] = useState({})
  const [activeEvalTab, setActiveEvalTab] = useState('pending')
  const [closeSummary, setCloseSummary] = useState(null)
  const [unknownEdits, setUnknownEdits] = useState({})
  const [missingItems, setMissingItems] = useState([])
  const [missingLoading, setMissingLoading] = useState(false)
  const [missingError, setMissingError] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [confirmItems, setConfirmItems] = useState([])
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [confirmTargets, setConfirmTargets] = useState({})
  const [consolidateItems, setConsolidateItems] = useState([])
  const [consolidateLoading, setConsolidateLoading] = useState(false)
  const [consolidateError, setConsolidateError] = useState('')

  // Filtros por columna (client-side)
  const [fSKU, setFSKU] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fOldCat, setFOldCat] = useState('')
  const [fNewCat, setFNewCat] = useState('')
  const [fOldTipo, setFOldTipo] = useState('')
  const [fNewTipo, setFNewTipo] = useState('')
  const [fOldCla, setFOldCla] = useState('')
  const [fNewCla, setFNewCla] = useState('')
  const [fDecideBy, setFDecideBy] = useState('')

  const colaRef = useRef(null)
  const cardRefs = useRef(new Map())

  // ===== Carga diccionarios =====
  useEffect(() => { getDictionaries().then(setDic).catch(()=>{}) }, [])
  useEffect(() => {
    if (!campaniaIdDefault) return
    setCampaniaId(prev => (prev ? prev : String(campaniaIdDefault)))
  }, [campaniaIdDefault])

  // ===== Carga datos =====
  async function cargar() {
    // Tarjetas
    const data = await getRevisiones({
      campaniaId, sku, consenso, soloConDiferencias: String(soloDif)
    })
    setItems(data.items || [])

    // Cola (server-side filters)
    const arch =
      colaArchivada === 'activas'    ? 'false' :
      colaArchivada === 'archivadas' ? 'true'  : 'todas'
    const acts = await listarActualizaciones(Number(campaniaId), {
      estado: colaEstado || undefined,
      archivada: arch,
    })
    setCola(acts.items || [])
    // sanea selección (por si cambió la vista)
    setSeleccion(sel => sel.filter(id => (acts.items || []).some(a => a.id === id)))
  }

  async function loadMissingItems() {
    if (!authOK || !campaniaId) return
    try {
      setMissingLoading(true)
      setMissingError('')
      const data = await getMissingMaestro(Number(campaniaId))
      setMissingItems(data.items || [])
    } catch (e) {
      setMissingError(e?.message || 'No se pudieron cargar los artículos faltantes en maestro.')
    } finally {
      setMissingLoading(false)
    }
  }

  async function loadConfirmaciones() {
    if (!authOK || !campaniaId) return
    try {
      setConfirmLoading(true)
      setConfirmError('')
      const data = await getConfirmaciones(Number(campaniaId))
      setConfirmItems(data.items || [])
    } catch (e) {
      setConfirmError(e?.message || 'No se pudieron cargar las confirmaciones.')
    } finally {
      setConfirmLoading(false)
    }
  }

  async function loadConsolidacion() {
    if (!authOK || !campaniaId) return
    try {
      setConsolidateLoading(true)
      setConsolidateError('')
      const data = await getConsolidacionCambios(Number(campaniaId))
      setConsolidateItems(data.items || [])
    } catch (e) {
      setConsolidateError(e?.message || 'No se pudieron cargar los cambios de consolidación.')
    } finally {
      setConsolidateLoading(false)
    }
  }

  useEffect(() => {
    if (!authOK || !campaniaId) return
    cargar().catch(e => console.error('[Revisiones] cargar error', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaniaId, authOK, colaEstado, colaArchivada, soloDif, consenso, sku])

  useEffect(() => {
    if (activeTab !== 'export') return
    loadMissingItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, campaniaId, authOK])

  useEffect(() => {
    if (activeTab !== 'confirm') return
    loadConfirmaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, campaniaId, authOK])

  useEffect(() => {
    if (!confirmItems.length) return
    setConfirmTargets((prev) => {
      const next = { ...prev }
      confirmItems.forEach((item) => {
        if (next[item.sku] === undefined) next[item.sku] = 'consolidate'
      })
      return next
    })
  }, [confirmItems])

  useEffect(() => {
    if (activeTab !== 'consolidate') return
    loadConsolidacion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, campaniaId, authOK])

  useEffect(() => () => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
  }, [])

  const evaluarItems = useMemo(() => (
    (items || [])
      .map((it) => ({
        ...it,
        propsFiltradas: it.propuestas.filter(filtrarPropuestas),
      }))
      .filter((it) => it.propsFiltradas.length > 0)
  ), [items, filtroDecision])

  useEffect(() => {
    setEvaluarOrder((prev) => {
      const skus = evaluarItems.map((it) => it.sku)
      const kept = prev.filter((sku) => skus.includes(sku))
      const missing = skus.filter((sku) => !kept.includes(sku))
      return [...kept, ...missing]
    })
  }, [evaluarItems])

  const orderedEvaluarItems = useMemo(() => {
    if (!evaluarOrder.length) return evaluarItems
    const map = new Map(evaluarItems.map((it) => [it.sku, it]))
    const ordered = evaluarOrder.map((sku) => map.get(sku)).filter(Boolean)
    const remaining = evaluarItems.filter((it) => !evaluarOrder.includes(it.sku))
    return [...ordered, ...remaining]
  }, [evaluarItems, evaluarOrder])

  useEffect(() => {
    setStageBySku((prev) => {
      const next = { ...prev }
      orderedEvaluarItems.forEach((item) => {
        if (next[item.sku]) return
        if (item?.stage) {
          next[item.sku] = item.stage
          return
        }
        const skuType = String(item?.skuType || '').toUpperCase()
        if (skuType) {
          next[item.sku] = skuType === 'UNKNOWN' ? 'unknown' : (getChangeCountForItem(item) === 0 ? 'confirm' : 'evaluate')
          return
        }
        const missingMaestro = !item?.maestro?.categoria_cod && !item?.maestro?.tipo_cod && !item?.maestro?.clasif_cod
        if (missingMaestro) {
          next[item.sku] = 'unknown'
          return
        }
        const changes = getChangeCountForItem(item)
        const hasDif = hasPropuestaDif(item)
        next[item.sku] = (changes === 0 && !hasDif) ? 'confirm' : 'evaluate'
      })
      return next
    })
  }, [orderedEvaluarItems])

  useEffect(() => {
    setConfirmFlags((prev) => {
      const next = { ...prev }
      orderedEvaluarItems.forEach((item) => {
        if (stageBySku[item.sku] !== 'confirm') return
        if (next[item.sku] === undefined) next[item.sku] = true
      })
      return next
    })
  }, [orderedEvaluarItems, stageBySku])

  useEffect(() => {
    setStageBySku((prev) => {
      const next = { ...prev }
      orderedEvaluarItems.forEach((item) => {
        if (next[item.sku] !== 'evaluate') return
        if (getChangeCountForItem(item) === 0 && !hasPropuestaDif(item)) next[item.sku] = 'confirm'
      })
      return next
    })
  }, [orderedEvaluarItems])

  const evaluateQueue = useMemo(
    () => orderedEvaluarItems.filter((it) => stageBySku[it.sku] === 'evaluate'),
    [orderedEvaluarItems, stageBySku]
  )
  const confirmQueue = useMemo(
    () => orderedEvaluarItems.filter((it) => stageBySku[it.sku] === 'confirm'),
    [orderedEvaluarItems, stageBySku]
  )
  const consolidateQueue = useMemo(
    () => orderedEvaluarItems.filter((it) => stageBySku[it.sku] === 'consolidate'),
    [orderedEvaluarItems, stageBySku]
  )
  const unknownQueue = useMemo(
    () => orderedEvaluarItems.filter((it) => stageBySku[it.sku] === 'unknown'),
    [orderedEvaluarItems, stageBySku]
  )

  useEffect(() => {
    setUnknownEdits((prev) => {
      const next = { ...prev }
      unknownQueue.forEach((item) => {
        if (!item?.sku) return
        const current = next[item.sku] || {}
        const categoriaTop = buildAttributeOptions(item?.propuestas, 'categoria_cod').options[0]?.code || ''
        const tipoTop = buildAttributeOptions(item?.propuestas, 'tipo_cod').options[0]?.code || ''
        const clasifTop = buildAttributeOptions(item?.propuestas, 'clasif_cod').options[0]?.code || ''
        next[item.sku] = {
          categoria_cod: current.categoria_cod || categoriaTop || '',
          tipo_cod: current.tipo_cod || tipoTop || '',
          clasif_cod: current.clasif_cod || clasifTop || '',
        }
      })
      return next
    })
  }, [unknownQueue])

  const currentEvaluarItem = useMemo(() => {
    if (!evaluateQueue.length) return null
    if (currentSku) {
      const found = evaluateQueue.find((it) => it.sku === currentSku)
      if (found) return found
    }
    return evaluateQueue[0]
  }, [currentSku, evaluateQueue])

  useEffect(() => {
    if (orderedEvaluarItems.length) setEvaluarNotice('')
  }, [orderedEvaluarItems.length])

  useEffect(() => {
    if (!lastActionSku || activeTab !== 'revisiones') return
    if (!evaluateQueue.length) return

    let targetSku = lastActionSku
    const sameSkuIndex = evaluateQueue.findIndex((it) => it.sku === lastActionSku)
    if (sameSkuIndex === -1) {
      targetSku = evaluateQueue[0].sku
    }

    const node = cardRefs.current.get(targetSku)
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setLastActionSku('')
  }, [activeTab, evaluateQueue, lastActionSku])

  function scrollToSku(targetSku) {
    const node = cardRefs.current.get(targetSku)
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function resolveCurrentSku() {
    if (currentSku && evaluateQueue.some((it) => it.sku === currentSku)) {
      return currentSku
    }
    return evaluateQueue[0]?.sku || ''
  }

  function onNextEvaluar() {
    if (!evaluateQueue.length) {
      setEvaluarNotice('No hay pendientes para evaluar.')
      return
    }
    const skuToUse = resolveCurrentSku()
    const currentIndex = evaluateQueue.findIndex((it) => it.sku === skuToUse)
    const nextItem = evaluateQueue[currentIndex + 1] || null
    if (!nextItem) {
      setEvaluarNotice('No hay más pendientes para evaluar.')
      return
    }
    setCurrentSku(nextItem.sku)
    setEvaluarNotice('')
    scrollToSku(nextItem.sku)
  }

  function onPostponeEvaluar() {
    if (!evaluateQueue.length) {
      setEvaluarNotice('No hay pendientes para evaluar.')
      return
    }
    const skuToUse = resolveCurrentSku()
    if (!skuToUse) return
    setEvaluarOrder((prev) => {
      const without = prev.filter((sku) => sku !== skuToUse)
      return [...without, skuToUse]
    })
    const currentIndex = evaluateQueue.findIndex((it) => it.sku === skuToUse)
    const nextItem = evaluateQueue[currentIndex + 1] || evaluateQueue[0]
    if (nextItem?.sku === skuToUse) {
      setEvaluarNotice('No hay más pendientes para evaluar.')
      return
    }
    setCurrentSku(nextItem?.sku || '')
    setEvaluarNotice('')
    if (nextItem?.sku) scrollToSku(nextItem.sku)
  }

  function isMissingItemValid(item) {
    return (
      hasValidCode(dic?.categorias, item?.categoria_cod) &&
      hasValidCode(dic?.tipos, item?.tipo_cod) &&
      hasValidCode(dic?.clasif, item?.clasif_cod)
    )
  }

  function getEffectiveValue(item, field) {
    const overrides = unknownEdits[item.sku] || {}
    if (overrides[field]) return overrides[field]
    return resolveAttributeValue(item, field)
  }

  function getChangeCountForItem(item) {
    if (!item?.maestro) return 3
    const fields = ['categoria_cod', 'tipo_cod', 'clasif_cod']
    return fields.reduce((acc, field) => {
      const original = field === 'categoria_cod'
        ? item?.maestro?.categoria_cod
        : field === 'tipo_cod'
          ? item?.maestro?.tipo_cod
          : item?.maestro?.clasif_cod
      const nextValue = getEffectiveValue(item, field)
      return acc + (String(nextValue || '') !== String(original || '') ? 1 : 0)
    }, 0)
  }

  function hasPropuestaDif(item) {
    if (!item?.maestro) return false
    return (item?.propuestas || []).some((p) => (
      String(p?.categoria_cod || '') !== String(item?.maestro?.categoria_cod || '') ||
      String(p?.tipo_cod || '') !== String(item?.maestro?.tipo_cod || '') ||
      String(p?.clasif_cod || '') !== String(item?.maestro?.clasif_cod || '')
    ))
  }

  function isUnknownReady(sku) {
    const edits = unknownEdits[sku] || {}
    return (
      hasValidCode(dic?.categorias, edits.categoria_cod) &&
      hasValidCode(dic?.tipos, edits.tipo_cod) &&
      hasValidCode(dic?.clasif, edits.clasif_cod)
    )
  }

  function onUpdateUnknown(sku, field, value) {
    setUnknownEdits((prev) => ({
      ...prev,
      [sku]: {
        ...(prev[sku] || {}),
        [field]: value
      }
    }))
  }

  function resolveUnknownId(item) {
    if (!item) return ''
    return String(item.unknownId || item?.unknown?.id || '').trim()
  }

  async function onMarkReady(item) {
    if (!item?.sku) return
    try {
      await moverEtapa({
        campaniaId: Number(campaniaId),
        sku: item.sku,
        stage: 'confirm',
        updatedBy: 'admin@local',
      })
      setStageBySku((prev) => ({ ...prev, [item.sku]: 'confirm' }))
      setConfirmFlags((prev) => ({ ...prev, [item.sku]: true }))
      await loadConfirmaciones()
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo mover el SKU a confirmación.',
      })
    }
  }

  async function onMoveUnknownToConfirm(item) {
    if (!item?.sku) return
    if (!isUnknownReady(item.sku)) return
    if (String(item?.unknownStatus || '').toUpperCase() === 'REJECTED') return
    const unknownId = resolveUnknownId(item)
    const payload = {
      sku: item.sku,
      campaniaId: Number(campaniaId),
      ...(unknownId ? { unknownId } : {}),
      categoria_cod: unknownEdits[item.sku]?.categoria_cod || '',
      tipo_cod: unknownEdits[item.sku]?.tipo_cod || '',
      clasif_cod: unknownEdits[item.sku]?.clasif_cod || '',
      updatedBy: 'admin@local',
    }
    try {
      if (unknownId) {
        await updateUnknown(payload)
      } else {
        await updateUnknownSku(item.sku, payload)
      }
      await moverEtapa({
        campaniaId: Number(campaniaId),
        sku: item.sku,
        stage: 'confirm',
        updatedBy: 'admin@local',
      })
      await Promise.all([cargar(), loadConfirmaciones()])
      setStageBySku((prev) => ({ ...prev, [item.sku]: 'confirm' }))
      setConfirmFlags((prev) => ({ ...prev, [item.sku]: true }))
      setToast({
        show: true,
        variant: 'success',
        message: `SKU ${item.sku} enviado a confirmación.`
      })
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo enviar el SKU a confirmación.'
      })
    }
  }

  async function onRejectUnknown(item) {
    if (!item?.sku) return
    const unknownId = resolveUnknownId(item)
    if (!unknownId) {
      setToast({ show: true, variant: 'warning', message: 'Unknown ID no disponible para rechazar.' })
      return
    }
    const isRejected = String(item?.unknownStatus || '').toUpperCase() === 'REJECTED'
    const payload = {
      ...(unknownId ? { unknownId } : {}),
      campaniaId: Number(campaniaId),
      reason: '',
      updatedBy: 'admin@local',
    }
    try {
      if (isRejected) {
        await updateUnknown({
          sku: item.sku,
          campaniaId: Number(campaniaId),
          categoria_cod: unknownEdits[item.sku]?.categoria_cod || '',
          tipo_cod: unknownEdits[item.sku]?.tipo_cod || '',
          clasif_cod: unknownEdits[item.sku]?.clasif_cod || '',
          updatedBy: 'admin@local',
        })
      } else {
        await rejectUnknown(payload)
      }
      await Promise.all([cargar(), loadConfirmaciones()])
      setActiveTab('confirm')
      setToast({
        show: true,
        variant: 'success',
        message: isRejected ? `SKU ${item.sku} reactivado.` : `SKU ${item.sku} rechazado.`,
      })
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo rechazar el SKU.'
      })
    }
  }

  function onToggleConfirmFlag(sku, value) {
    setConfirmFlags((prev) => ({ ...prev, [sku]: value }))
  }

  async function onApplyConfirmation() {
    const updates = (confirmItems || []).map((item) => {
      const target = confirmTargets[item.sku] || 'consolidate'
      const isUnknown = String(item?.skuType || '').toUpperCase() === 'UNKNOWN'
      const stage = target === 'consolidate' ? 'consolidate' : (isUnknown ? 'unknown' : 'evaluate')
      return { sku: item.sku, stage }
    })

    try {
      await Promise.all(
        updates.map((entry) =>
          moverEtapa({
            campaniaId: Number(campaniaId),
            sku: entry.sku,
            stage: entry.stage,
            updatedBy: 'admin@local',
          })
        )
      )
      setStageBySku((prev) => {
        const next = { ...prev }
        updates.forEach((entry) => {
          next[entry.sku] = entry.stage
        })
        return next
      })
      await Promise.all([loadConfirmaciones(), loadConsolidacion(), cargar()])
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo actualizar la etapa en el servidor.',
      })
    }
  }

  function buildSummary() {
    const statsByUser = {}
    const items = consolidateQueue.map((item) => {
      const fields = ['categoria_cod', 'tipo_cod', 'clasif_cod']
      const changes = fields.map((field) => {
        const original = field === 'categoria_cod'
          ? item?.maestro?.categoria_cod
          : field === 'tipo_cod'
            ? item?.maestro?.tipo_cod
            : item?.maestro?.clasif_cod
        const nextValue = getEffectiveValue(item, field)
        return {
          field,
          oldValue: original || '',
          newValue: nextValue || ''
        }
      })
      item?.propuestas?.forEach((p) => {
        ;(p.usuarios || []).forEach((u) => {
          statsByUser[u] = (statsByUser[u] || 0) + 1
        })
      })
      return { sku: item.sku, changes }
    })
    const totalSkus = consolidateQueue.length
    const updatedSkus = consolidateQueue.filter((item) => getChangeCountForItem(item) > 0).length
    const verifiedSkus = consolidateQueue.filter((item) => getChangeCountForItem(item) === 0).length
    return {
      totalSkus,
      updatedSkus,
      verifiedSkus,
      statsByUser,
      items
    }
  }

  function exportSummaryFiles(summary) {
    const header = [
      `Campaña: ${campaniaId || '—'}`,
      `Total SKUs: ${summary.totalSkus}`,
      `Actualizados: ${summary.updatedSkus}`,
      `Verificados: ${summary.verifiedSkus}`
    ]
    const statsLines = Object.entries(summary.statsByUser).map(([email, count]) => `${email}\t${count}`)
    const skuLines = summary.items.flatMap((item) =>
      item.changes.map((change) => `${item.sku}\t${change.field}\t${change.oldValue}\t${change.newValue}`)
    )
    const txtBody = [
      'RESUMEN',
      ...header,
      '',
      'ESTADISTICAS POR USUARIO',
      ...statsLines,
      '',
      'SKU / CAMBIOS',
      ...skuLines
    ].join('\n')
    const txtBlob = new Blob([`\ufeff${txtBody}`], { type: 'text/plain;charset=utf-8' })
    descargarBlobDirecto(txtBlob, `campania_${campaniaId}_resumen.txt`)

    const csvLines = [
      ['section', 'key', 'value'].join(','),
      ...header.map((line) => ['summary', ...line.split(': ').map((v) => `"${v}"`)].join(',')),
      '',
      ['section', 'email', 'count'].join(','),
      ...Object.entries(summary.statsByUser).map(([email, count]) => `stats,${email},${count}`),
      '',
      ['section', 'sku', 'field', 'old_value', 'new_value'].join(','),
      ...summary.items.flatMap((item) =>
        item.changes.map((change) =>
          `changes,${item.sku},${change.field},${change.oldValue},${change.newValue}`
        )
      )
    ].join('\n')
    const csvBlob = new Blob([`\ufeff${csvLines}`], { type: 'text/csv;charset=utf-8' })
    descargarBlobDirecto(csvBlob, `campania_${campaniaId}_resumen.csv`)
  }

  async function onCloseCampaign() {
    try {
      const response = await cerrarCampania(Number(campaniaId))
      if (response?.summary) {
        setCloseSummary(response.summary)
      } else {
        setCloseSummary(null)
        setToast({
          show: true,
          variant: 'warning',
          message: 'La campaña se cerró, pero no se recibió el resumen.'
        })
      }

      const exports = response?.exports || {}
      setExportLoading(true)
      try {
        await descargarTxtPorScope('applied', exports.applied || null)
        await descargarTxtPorScope('unknown', exports.unknown || null)
        if (exports.summaryTxt) {
          await descargarBlobDesdeUrl(exports.summaryTxt, `summary_campania_${campaniaId}.txt`)
        } else {
          const summaryBlob = await exportSummaryTxt(Number(campaniaId))
          descargarBlobDirecto(summaryBlob, `summary_campania_${campaniaId}.txt`)
        }
      } finally {
        setExportLoading(false)
      }

      loadConsolidacion()
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo cerrar la campaña.'
      })
    }
  }

  // ===== Acciones tarjetas =====
  async function onDecideAttribute(sku, field, code, decision) {
    const propuesta = { [field]: code }
    try {
      await decidirRevision({
        campaniaId: Number(campaniaId),
        sku,
        propuesta,
        decision,
        decidedBy: 'admin@local',
        aplicarAhora: false
      })
      setItems((prev) =>
        (prev || []).map((item) => {
          if (item.sku !== sku) return item
          const nextPropuestas = (item.propuestas || []).map((p) => {
            if (p?.[field] === code) {
              return {
                ...p,
                decision: {
                  estado: 'pendiente',
                  id: p.decision?.id || null,
                  new_categoria_cod: field === 'categoria_cod' ? code : '',
                  new_tipo_cod: field === 'tipo_cod' ? code : '',
                  new_clasif_cod: field === 'clasif_cod' ? code : '',
                },
              }
            }
            if (p?.decision && p?.decision?.estado !== 'aplicada') {
              const hasSameField =
                (field === 'categoria_cod' && p.decision?.new_categoria_cod) ||
                (field === 'tipo_cod' && p.decision?.new_tipo_cod) ||
                (field === 'clasif_cod' && p.decision?.new_clasif_cod)
              if (hasSameField) {
                return { ...p, decision: null }
              }
            }
            return p
          })
          return { ...item, propuestas: nextPropuestas }
        })
      )
      await cargar()
      setLastActionSku(sku)
      setCurrentSku(sku)
      setToast({
        show: true,
        variant: 'success',
        message: `Decisión ${decision === 'aceptar' ? 'aceptada' : 'rechazada'} para ${sku}.`
      })
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo guardar la decisión.'
      })
    }
  }
  async function onUndoAttributeDecision(decisionId, sku) {
    if (!decisionId) return
    try {
      await archivarActualizaciones([decisionId], true, 'undo-attr')
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
      setUiMessage({
        variant: 'info',
        text: 'Decisión deshecha. Se restauró el maestro.'
      })
      messageTimeoutRef.current = setTimeout(() => {
        setUiMessage(null)
        messageTimeoutRef.current = null
      }, 4000)
      await cargar()
      if (sku) setLastActionSku(sku)
      setCurrentSku(sku)
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo deshacer la decisión.'
      })
    }
  }

  function mapMissingItem(item) {
    return {
      sku: String(item?.sku || '').trim().toUpperCase(),
      categoria_cod: pad2(item?.categoria_cod),
      tipo_cod: pad2(item?.tipo_cod),
      clasif_cod: pad2(item?.clasif_cod),
    }
  }

  async function onAddMissingItems(itemsToAdd) {
    const payload = (itemsToAdd || [])
      .filter(isMissingItemValid)
      .map(mapMissingItem)
      .filter((item) => item.sku)
    if (!payload.length) {
      setToast({
        show: true,
        variant: 'warning',
        message: 'No hay artículos válidos para agregar al maestro.'
      })
      return
    }
    try {
      await importarMaestroJSON(payload)
      setToast({
        show: true,
        variant: 'success',
        message: `Se agregaron ${payload.length} artículos al maestro.`
      })
      await loadMissingItems()
      await cargar()
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudieron agregar los artículos al maestro.'
      })
    }
  }

  // ===== Acciones cola (masivas) =====
  async function onAplicarSeleccion() {
    const pendientes = cola.filter(a => seleccion.includes(a.id) && a.estado === 'pendiente').map(a => a.id)
    if (!pendientes.length) {
      setToast({
        show: true,
        variant: 'warning',
        message: 'No hay pendientes seleccionadas para aplicar.'
      })
      return
    }
    try {
      await aplicarActualizaciones(pendientes, 'admin@local')
      setSeleccion([])
      setToast({
        show: true,
        variant: 'success',
        message: `Se aplicaron ${pendientes.length} actualizaciones.`
      })
      await cargar()
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudieron aplicar las actualizaciones.'
      })
    }
  }
  async function onArchivarSeleccion() {
    if (!seleccion.length) return
    await archivarActualizaciones(seleccion, true, 'bulk-arch')
    setSeleccion([])
    await cargar()
  }
  async function onDesarchivarSeleccion() {
    if (!seleccion.length) return
    await archivarActualizaciones(seleccion, false, 'bulk-unarch')
    setSeleccion([])
    await cargar()
  }

  // ===== Acciones cola (fila) =====
  async function onUndoRow(item) {
    if (!item?.id) return
    await undoActualizacion(item.id)
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
    setUiMessage({
      variant: 'info',
      text: 'Actualización deshecha. Quedó como pendiente nuevamente.'
    })
    messageTimeoutRef.current = setTimeout(() => {
      setUiMessage(null)
      messageTimeoutRef.current = null
    }, 4000)
    await cargar()
    if (item?.sku) setLastActionSku(item.sku)
    if (item?.sku) setCurrentSku(item.sku)
    setActiveTab('revisiones')
  }
  async function onRevertRow(id) {
    await revertirActualizacion(id)
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
    setUiMessage({
      variant: 'warning',
      text: 'Se creó una reversión pendiente. Aplicala desde Decidir para impactar Maestro.'
    })
    messageTimeoutRef.current = setTimeout(() => {
      setUiMessage(null)
      messageTimeoutRef.current = null
    }, 4000)
    await cargar()
  }
  async function onToggleArchiveRow(a) {
    await archivarActualizaciones([a.id], !a.archivada, 'row-toggle')
    await cargar()
  }

  // ===== Exportaciones =====
  async function onExportCola() {
    const blob = await exportActualizacionesCSV(Number(campaniaId))
    descargarBlobDirecto(blob, 'actualizaciones_campania.csv')
    setLastExportKind('CSV')
    setShowArchiveModal(true)
  }
  async function descargarTxtPorScope(scope, urls = null) {
    const id = Number(campaniaId)
    const suffix = scope || 'applied'
    const failures = []
    const recordFailure = (label, error) => {
      const reason = error?.message || label
      failures.push(reason)
    }
    if (urls) {
      if (!urls.categoria) {
        recordFailure('categoría')
      } else {
        await descargarBlobDesdeUrl(urls.categoria, `categoria_${id}_${suffix}.txt`).catch((e) => {
          recordFailure('categoría', e)
        })
      }
      if (!urls.tipo) {
        recordFailure('tipo')
      } else {
        await descargarBlobDesdeUrl(urls.tipo, `tipo_${id}_${suffix}.txt`).catch((e) => {
          recordFailure('tipo', e)
        })
      }
      if (!urls.clasif) {
        recordFailure('clasif')
      } else {
        await descargarBlobDesdeUrl(urls.clasif, `clasif_${id}_${suffix}.txt`).catch((e) => {
          recordFailure('clasif', e)
        })
      }
      if (failures.length) {
        throw new Error(`No se pudieron descargar algunos archivos TXT: ${failures.join(', ')}.`)
      }
      return
    }
    const catBlob = await exportTxtCategoria(id, scope).catch((e) => {
      recordFailure('categoría', e)
      return null
    })
    if (catBlob) descargarBlobDirecto(catBlob, `categoria_${id}_${suffix}.txt`)
    const tipoBlob = await exportTxtTipo(id, scope).catch((e) => {
      recordFailure('tipo', e)
      return null
    })
    if (tipoBlob) descargarBlobDirecto(tipoBlob, `tipo_${id}_${suffix}.txt`)
    const clasifBlob = await exportTxtClasif(id, scope).catch((e) => {
      recordFailure('clasif', e)
      return null
    })
    if (clasifBlob) descargarBlobDirecto(clasifBlob, `clasif_${id}_${suffix}.txt`)
    if (failures.length) {
      throw new Error(`No se pudieron descargar algunos archivos TXT: ${failures.join(', ')}.`)
    }
  }

  async function onDownloadAppliedTxts() {
    if (!campaniaId) return
    try {
      setExportLoading(true)
      await descargarTxtPorScope('pending')
      setToast({
        show: true,
        variant: 'success',
        message: 'TXT de cambios aplicados descargados.'
      })
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudieron descargar los TXT aplicados.'
      })
    } finally {
      setExportLoading(false)
    }
  }

  async function onDownloadUnknownTxts() {
    if (!campaniaId) return
    try {
      setExportLoading(true)
      await descargarTxtPorScope('unknown')
      setToast({
        show: true,
        variant: 'success',
        message: 'TXT de artículos desconocidos descargados.'
      })
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudieron descargar los TXT de desconocidos.'
      })
    } finally {
      setExportLoading(false)
    }
  }

  // ===== Selección en cola =====
  function toggleSel(id) {
    setSeleccion(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
  }
  function toggleSelAllVisible(e) {
    const checked = e.target.checked
    const visibles = colaFiltrada.map(a => a.id)
    setSeleccion(sel => checked
      ? Array.from(new Set([...sel, ...visibles]))
      : sel.filter(id => !visibles.includes(id))
    )
  }

  // ===== Contadores tarjetas =====
  const contadores = items.reduce((acc, it) => {
    for (const p of it.propuestas) {
      if (!p.decision || p.decision.estado === 'pendiente') acc.pendientes++
      else if (p.decision.estado === 'rechazada') acc.rechazadas++
      else acc.aceptadas++
    }
    return acc
  }, { pendientes:0, aceptadas:0, rechazadas:0 })

  function filtrarPropuestas(p) {
    if (filtroDecision === 'todas') return true
    if (filtroDecision === 'pendientes') return !p.decision || p.decision?.estado === 'pendiente'
    if (filtroDecision === 'rechazadas') return p.decision?.estado === 'rechazada'
    if (filtroDecision === 'aceptadas') return p.decision && p.decision.estado !== 'rechazada'
    return true
  }

  // ===== Filtro por columnas (cola) =====
  function incluye(v, term) {
    return String(v || '').toLowerCase().includes(String(term || '').toLowerCase())
  }
  function filtroRow(a) {
    if (colaEstado && a.estado !== colaEstado) return false
    if (fEstado && a.estado !== fEstado) return false

    if (fSKU && !incluye(a.sku, fSKU)) return false
    if (fOldCat && !incluye(a.old_categoria_cod, fOldCat)) return false
    if (fNewCat && !incluye(a.new_categoria_cod, fNewCat)) return false
    if (fOldTipo && !incluye(a.old_tipo_cod, fOldTipo)) return false
    if (fNewTipo && !incluye(a.new_tipo_cod, fNewTipo)) return false
    if (fOldCla && !incluye(a.old_clasif_cod, fOldCla)) return false
    if (fNewCla && !incluye(a.new_clasif_cod, fNewCla)) return false
    if (fDecideBy && !incluye(a.decidedBy, fDecideBy)) return false
    return true
  }
  const colaFiltrada = useMemo(
    () => (cola || []).filter(filtroRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cola, colaEstado, fEstado, fSKU, fOldCat, fNewCat, fOldTipo, fNewTipo, fOldCla, fNewCla, fDecideBy]
  )
  const allVisibleSelected = useMemo(() => {
    const visibles = new Set(colaFiltrada.map(a => a.id))
    if (!visibles.size) return false
    return Array.from(visibles).every(id => seleccion.includes(id))
  }, [colaFiltrada, seleccion])

  function limpiarFiltrosCola() {
    setFSKU(''); setFEstado(''); setFOldCat(''); setFNewCat('')
    setFOldTipo(''); setFNewTipo(''); setFOldCla(''); setFNewCla('')
    setFDecideBy('')
  }
  async function onArchiveAfterExport() {
    try {
      setArchiveLoading(true)
      const pendientes = await listarActualizaciones(Number(campaniaId), {
        estado: 'pendiente',
        archivada: 'false'
      })
      const ids = (pendientes.items || []).map(a => a.id)
      if (!ids.length) {
        setToast({
          show: true,
          variant: 'info',
          message: 'No hay decisiones pendientes para archivar.'
        })
        setShowArchiveModal(false)
        return
      }
      await archivarActualizaciones(ids, true, 'export-archive')
      setToast({
        show: true,
        variant: 'success',
        message: `Se archivaron ${ids.length} decisiones pendientes.`
      })
      await cargar()
    } catch (e) {
      setToast({
        show: true,
        variant: 'danger',
        message: e?.message || 'No se pudo archivar después de exportar.'
      })
    } finally {
      setArchiveLoading(false)
      setShowArchiveModal(false)
    }
  }
  function onViewArchived() {
    setColaArchivada('archivadas')
    setActiveTab('cola')
    setTimeout(() => colaRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  // ===== UI =====
  return (
    <>
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg={toast.variant}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
          show={toast.show}
          delay={3500}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Decidir</strong>
          </Toast.Header>
          <Toast.Body className={toast.variant === 'warning' ? 'text-dark' : 'text-white'}>
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
      {uiMessage && (
        <Alert
          variant={uiMessage.variant || 'info'}
          dismissible
          onClose={() => setUiMessage(null)}
        >
          {uiMessage.text}
        </Alert>
      )}

      {/* Barra superior común */}
      <Card className="u-mb-16 u-density-comfortable">
        <Card.Body className="row g-2">
          <div className="col-md-3">
            <Form.Label>Campaña</Form.Label>
            <Form.Select value={campaniaId} onChange={e => setCampaniaId(e.target.value)}>
              {campanias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Form.Select>
          </div>

          {activeTab === 'revisiones' && (
            <>
              <div className="col-md-3">
                <Form.Label>SKU (contiene)</Form.Label>
                <Form.Control value={sku} onChange={e=>setSku(e.target.value)} placeholder="ABC" />
              </div>
              <div className="col-md-2">
                <Form.Label>Consenso</Form.Label>
                <Form.Select value={consenso} onChange={e=>setConsenso(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="true">Con consenso</option>
                  <option value="false">Sin consenso</option>
                </Form.Select>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <Form.Check type="switch" id="solo-dif"
                  label="Sólo diferencias"
                  checked={soloDif} onChange={e=>setSoloDif(e.target.checked)} />
              </div>
            </>
          )}

          <div className="col-md-2 d-flex align-items-end">
            <Button onClick={cargar} disabled={!authOK} className="w-100">Buscar</Button>
          </div>
        </Card.Body>
      </Card>

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k || 'revisiones')} className="u-mb-16">
        {/* ====== TAB: Revisiones (tarjetas) ====== */}
        <Tab eventKey="revisiones" title="Evaluar">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <ButtonGroup>
              <Button
                variant={activeEvalTab === 'pending' ? 'primary' : 'outline-primary'}
                onClick={() => setActiveEvalTab('pending')}
              >
                Pendientes ({evaluateQueue.length})
              </Button>
              <Button
                variant={activeEvalTab === 'unknown' ? 'warning' : 'outline-warning'}
                onClick={() => setActiveEvalTab('unknown')}
              >
                Desconocidos ({unknownQueue.length})
              </Button>
            </ButtonGroup>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                onClick={onPostponeEvaluar}
                disabled={!evaluateQueue.length || activeEvalTab !== 'pending'}
              >
                Posponer artículo
              </Button>
              <Button
                variant="outline-primary"
                onClick={onNextEvaluar}
                disabled={!evaluateQueue.length || activeEvalTab !== 'pending'}
              >
                Siguiente artículo
              </Button>
              <Button
                variant="success"
                onClick={() => onMarkReady(currentEvaluarItem)}
                disabled={!currentEvaluarItem || activeEvalTab !== 'pending'}
              >
                Listo para confirmar
              </Button>
            </div>
          </div>
          {evaluarNotice && (
            <Alert variant="info" onClose={() => setEvaluarNotice('')} dismissible>
              {evaluarNotice}
            </Alert>
          )}
          {activeEvalTab === 'pending' && !evaluateQueue.length && (
            <Alert variant="warning">
              No hay pendientes a evaluar. Los SKUs listos pasarán a Confirmación.
            </Alert>
          )}

          {activeEvalTab === 'pending' && currentEvaluarItem && (() => {
            const it = currentEvaluarItem
            const borde = it.hayConsenso ? 'border-success' : 'border-warning'
            const bordeWidth = 'border-start border-4'
            const acceptedCategoriaDecision = it?.decisionsByField?.categoria_cod || getAcceptedAttributeDecision(it.propuestas, 'categoria_cod')
            const acceptedCategoriaCode = acceptedCategoriaDecision?.code || getAcceptedAttributeCode(it.propuestas, 'categoria_cod')
            const acceptedTipoDecision = it?.decisionsByField?.tipo_cod || getAcceptedAttributeDecision(it.propuestas, 'tipo_cod')
            const acceptedTipoCode = acceptedTipoDecision?.code || getAcceptedAttributeCode(it.propuestas, 'tipo_cod')
            const acceptedClasifDecision = it?.decisionsByField?.clasif_cod || getAcceptedAttributeDecision(it.propuestas, 'clasif_cod')
            const acceptedClasifCode = acceptedClasifDecision?.code || getAcceptedAttributeCode(it.propuestas, 'clasif_cod')
            return (
              <Card
                key={it.sku}
                ref={(node) => {
                  if (node) cardRefs.current.set(it.sku, node)
                  else cardRefs.current.delete(it.sku)
                }}
                className={`mb-3 ${bordeWidth} ${borde}`}
              >
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <strong className="fs-5">{it.sku}</strong>
                    {it.hayConsenso
                      ? <Badge bg="success">Consenso {Math.round(it.consensoPct * 100)}%</Badge>
                      : <Badge bg="warning" text="dark">Sin consenso</Badge>}
                  </div>
                  <small className="text-muted">{it.totalVotos} votos</small>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={5}>
                      <h6>Original (maestro)</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr><td>Categoría</td><td>{etiquetaNombre(dic?.categorias, it.maestro?.categoria_cod)}</td></tr>
                          <tr><td>Tipo</td><td>{etiquetaNombre(dic?.tipos, it.maestro?.tipo_cod)}</td></tr>
                          <tr><td>Clasificación</td><td>{etiquetaNombre(dic?.clasif, it.maestro?.clasif_cod)}</td></tr>
                        </tbody>
                      </Table>
                      <h6 className="mt-3">Sugerido aceptado</h6>
                      <Table size="sm" bordered>
                        <tbody>
                          <tr>
                            <td>Categoría</td>
                            <td>{acceptedCategoriaCode ? etiquetaNombre(dic?.categorias, acceptedCategoriaCode) : '—'}</td>
                            <td className="text-end">
                              {acceptedCategoriaDecision && acceptedCategoriaDecision.estado !== 'aplicada' && (
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={() => onUndoAttributeDecision(acceptedCategoriaDecision.id, it.sku)}
                                  disabled={!authOK}
                                >
                                  Deshacer
                                </Button>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Tipo</td>
                            <td>{acceptedTipoCode ? etiquetaNombre(dic?.tipos, acceptedTipoCode) : '—'}</td>
                            <td className="text-end">
                              {acceptedTipoDecision && acceptedTipoDecision.estado !== 'aplicada' && (
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={() => onUndoAttributeDecision(acceptedTipoDecision.id, it.sku)}
                                  disabled={!authOK}
                                >
                                  Deshacer
                                </Button>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Clasificación</td>
                            <td>{acceptedClasifCode ? etiquetaNombre(dic?.clasif, acceptedClasifCode) : '—'}</td>
                            <td className="text-end">
                              {acceptedClasifDecision && acceptedClasifDecision.estado !== 'aplicada' && (
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={() => onUndoAttributeDecision(acceptedClasifDecision.id, it.sku)}
                                  disabled={!authOK}
                                >
                                  Deshacer
                                </Button>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={7}>
                      <h6 className="mb-2">Sugerencias por atributo</h6>
                      {(['categoria_cod', 'tipo_cod', 'clasif_cod']).map((field) => {
                        const maestroCode = field === 'categoria_cod'
                          ? it.maestro?.categoria_cod
                          : field === 'tipo_cod'
                            ? it.maestro?.tipo_cod
                            : it.maestro?.clasif_cod
                        const acceptedDecision = it?.decisionsByField?.[field] || getAcceptedAttributeDecision(it.propuestas, field)
                        const acceptedCode = acceptedDecision?.code || getAcceptedAttributeCode(it.propuestas, field)
                        const isLocked = Boolean(acceptedCode)
                        const meta = buildAttributeOptions(it.propuestas, field)
                        const filteredOptions = meta.options.filter((opt) => String(opt.code) !== String(maestroCode))
                        const label = field === 'categoria_cod' ? 'Categoría' : field === 'tipo_cod' ? 'Tipo' : 'Clasificación'
                        const maestroConsensus = meta.options.find((opt) => String(opt.code) === String(maestroCode))
                        const isVerified = maestroConsensus && maestroConsensus.share === 1
                        if (!filteredOptions.length && isVerified) {
                          return (
                            <Card key={field} className="mb-2 border-0 bg-light">
                              <Card.Body className="py-2 d-flex align-items-center justify-content-between">
                                <div className="fw-semibold">{label}</div>
                                <Badge bg="success">Verificado</Badge>
                              </Card.Body>
                            </Card>
                          )
                        }
                        if (!filteredOptions.length) {
                          return (
                            <Card key={field} className="mb-2 border-0 bg-light">
                              <Card.Body className="py-2 d-flex align-items-center justify-content-between">
                                <div className="fw-semibold">{label}</div>
                                <Badge bg="secondary">Sin sugerencias</Badge>
                              </Card.Body>
                            </Card>
                          )
                        }
                        return (
                          <Card key={field} className="mb-3 border-0 shadow-sm">
                            <Card.Body>
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="fw-semibold">{label}</div>
                                <div className="text-muted small">{meta.total} votos</div>
                              </div>
                              {isLocked && (
                                <div className="text-muted small mt-1">
                                  Deshacé la decisión para evaluar otra opción.
                                </div>
                              )}
                              <div className="mt-2 d-flex flex-column gap-2">
                                {filteredOptions.map((opt) => {
                                  const consensus = consensusLabel(opt.share)
                                  const isAccepted = Boolean(acceptedCode && opt.code === acceptedCode)
                                  const dicKey = field === 'categoria_cod' ? 'categorias' : field === 'tipo_cod' ? 'tipos' : 'clasif'
                                  return (
                                    <div key={`${field}-${opt.code}`} className="border rounded p-2">
                                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                        <div>
                                          <div className="fw-semibold">{etiquetaNombre(dic?.[dicKey], opt.code)}</div>
                                          <div className="small text-muted">
                                            {opt.count} votos ·
                                            <Badge bg={consensus.variant} className="ms-2">{consensus.text}</Badge>
                                            {isAccepted && <Badge bg="success" className="ms-2">Elegida</Badge>}
                                          </div>
                                          <Stack direction="horizontal" gap={2} className="mt-1 flex-wrap">
                                            {opt.usuarios.map((u) => (
                                              <OverlayTrigger
                                                key={`${field}-${opt.code}-${u}`}
                                                placement="top"
                                                overlay={<Tooltip>{u}</Tooltip>}
                                              >
                                                <Badge bg="secondary">{shortUserLabel(u)}</Badge>
                                              </OverlayTrigger>
                                            ))}
                                            {opt.sucursales.map((s) => (
                                              <Badge bg="info" key={`${field}-${opt.code}-${s}`}>{s}</Badge>
                                            ))}
                                          </Stack>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                          <Button
                                            variant={isAccepted ? 'success' : 'outline-success'}
                                            size="sm"
                                            onClick={() => onDecideAttribute(it.sku, field, opt.code, 'aceptar')}
                                            disabled={!authOK || isAccepted}
                                          >
                                            {isAccepted ? 'Seleccionada' : 'Aceptar'}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </Card.Body>
                          </Card>
                        )
                      })}

                      <Accordion className="mt-3">
                        <Accordion.Item eventKey="0">
                          <Accordion.Header>Detalle de propuestas (opcional)</Accordion.Header>
                          <Accordion.Body>
                            {it.propsFiltradas.map((p, idx) => (
                              <Card key={idx} className="mb-2">
                                <Card.Body>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <div><strong>{p.count}</strong> votos</div>
                                      <div className="small text-muted">
                                        Cat: {etiquetaNombre(dic?.categorias, p.categoria_cod)} ·
                                        Tipo: {etiquetaNombre(dic?.tipos, p.tipo_cod)} ·
                                        Clasif: {etiquetaNombre(dic?.clasif, p.clasif_cod)}
                                      </div>
                                      <Stack direction="horizontal" gap={2} className="mt-1 flex-wrap">
                                        {p.usuarios.map((u) => (
                                          <OverlayTrigger key={u} placement="top" overlay={<Tooltip>{u}</Tooltip>}>
                                            <Badge bg="secondary">{shortUserLabel(u)}</Badge>
                                          </OverlayTrigger>
                                        ))}
                                        {p.sucursales.map((s) => <Badge bg="info" key={s} title="Sucursal">{s}</Badge>)}
                                      </Stack>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                      {p.decision ? (
                                        <>
                                          {badgeDecision(p.decision.estado)}
                                          {p.decision.estado !== 'aplicada' && (
                                            <Button size="sm" variant="outline-secondary"
                                                    onClick={()=>onUndoRow({ id: p.decision.id, sku: it.sku })} disabled={!authOK}>
                                              Deshacer
                                            </Button>
                                          )}
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            ))}
                          </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )
          })()}
          {activeEvalTab === 'pending' && !currentEvaluarItem && (
            <Card body><EmptyState title="Sin resultados" subtitle="No hay resultados con los filtros actuales." ctaLabel="Ajustar filtros" onCta={() => { setFiltroDecision('pendientes'); setSku(''); setConsenso('') }} /></Card>
          )}

          {activeEvalTab === 'unknown' && (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <strong>SKUs desconocidos</strong>
                <small className="text-muted">Completá las 3 características para enviarlos a Confirmación.</small>
              </Card.Header>
              <Card.Body>
                <Table responsive bordered size="sm">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Categoría</th>
                      <th>Tipo</th>
                      <th>Clasificación</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unknownQueue.map((item) => {
                      const edits = unknownEdits[item.sku] || {}
                      const ready = isUnknownReady(item.sku)
                      const unknownId = resolveUnknownId(item)
                      const isRejected = String(item?.unknownStatus || '').toUpperCase() === 'REJECTED'
                      const categoriaLabel = buildAttributeOptions(item?.propuestas, 'categoria_cod').options[0]
                      const tipoLabel = buildAttributeOptions(item?.propuestas, 'tipo_cod').options[0]
                      const clasifLabel = buildAttributeOptions(item?.propuestas, 'clasif_cod').options[0]
                      return (
                        <tr key={item.sku}>
                          <td>{item.sku}</td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={edits.categoria_cod || ''}
                              onChange={(e) => onUpdateUnknown(item.sku, 'categoria_cod', e.target.value)}
                              disabled={isRejected}
                            >
                              <option value="">Seleccionar</option>
                              {(dic?.categorias || []).map((c) => (
                                <option key={c.cod} value={c.cod}>{c.nombre}</option>
                              ))}
                            </Form.Select>
                            {categoriaLabel?.code && (
                              <div className="small text-muted mt-1">
                                Sugerido: {etiquetaNombre(dic?.categorias, categoriaLabel.code)}
                              </div>
                            )}
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={edits.tipo_cod || ''}
                              onChange={(e) => onUpdateUnknown(item.sku, 'tipo_cod', e.target.value)}
                              disabled={isRejected}
                            >
                              <option value="">Seleccionar</option>
                              {(dic?.tipos || []).map((t) => (
                                <option key={t.cod} value={t.cod}>{t.nombre}</option>
                              ))}
                            </Form.Select>
                            {tipoLabel?.code && (
                              <div className="small text-muted mt-1">
                                Sugerido: {etiquetaNombre(dic?.tipos, tipoLabel.code)}
                              </div>
                            )}
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={edits.clasif_cod || ''}
                              onChange={(e) => onUpdateUnknown(item.sku, 'clasif_cod', e.target.value)}
                              disabled={isRejected}
                            >
                              <option value="">Seleccionar</option>
                              {(dic?.clasif || []).map((c) => (
                                <option key={c.cod} value={c.cod}>{c.nombre}</option>
                              ))}
                            </Form.Select>
                            {clasifLabel?.code && (
                              <div className="small text-muted mt-1">
                                Sugerido: {etiquetaNombre(dic?.clasif, clasifLabel.code)}
                              </div>
                            )}
                          </td>
                          <td>
                            {isRejected
                              ? <Badge bg="danger">Rechazado</Badge>
                              : (ready ? <Badge bg="success">Listo</Badge> : <Badge bg="secondary">Incompleto</Badge>)}
                            {unknownId ? (
                              <div className="small text-muted mt-1">Unknown ID: {unknownId}</div>
                            ) : null}
                          </td>
                          <td className="text-end">
                            <div className="d-flex flex-wrap justify-content-end gap-2">
                              <Button
                                size="sm"
                                variant={isRejected ? "outline-secondary" : "outline-danger"}
                                onClick={() => onRejectUnknown(item)}
                              >
                                {isRejected ? "Deshacer rechazo" : "Rechazar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => onMoveUnknownToConfirm(item)}
                              disabled={!ready || isRejected}
                            >
                              Enviar a Confirmación
                            </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {!unknownQueue.length && (
                      <tr>
                        <td colSpan={6}><EmptyState title="Sin SKUs desconocidos" subtitle="No hay pendientes de clasificación manual." ctaLabel="Cargar archivo maestro" onCta={() => window.scrollTo({ top: 0, behavior: 'smooth' })} /></td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Tab>

        <Tab eventKey="confirm" title="Confirmación">
          <Card>
            <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <strong>Confirmación de cambios</strong>
                <div className="text-muted small">
                  Ordenados por cantidad de cambios. Podés devolver a Evaluar si hace falta.
                </div>
              </div>
              <Button variant="primary" onClick={onApplyConfirmation} disabled={confirmLoading}>
                Mover seleccionados
              </Button>
            </Card.Header>
            <Card.Body>
              {confirmError && <Alert variant="danger">{confirmError}</Alert>}
              {confirmLoading ? (
                <div className="text-center text-muted">Cargando confirmaciones...</div>
              ) : (
                <Table responsive bordered size="sm">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Tipo</th>
                      <th>Cambios</th>
                      <th>Verificados</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmItems
                      .slice()
                      .sort((a, b) => Object.keys(b?.changes || {}).length - Object.keys(a?.changes || {}).length)
                      .map((item) => {
                      const isUnknown = String(item?.skuType || '').toUpperCase() === 'UNKNOWN' || Boolean(item?.unknown)
                      let changesEntries = Object.entries(item?.changes || {})
                      if (!changesEntries.length && item?.unknown) {
                        changesEntries = [
                          ['categoria_cod', item.unknown?.categoria_cod || ''],
                          ['tipo_cod', item.unknown?.tipo_cod || ''],
                          ['clasif_cod', item.unknown?.clasif_cod || ''],
                        ]
                      }
                      const verifiedEntries = Object.entries(item?.verified || {})
                      return (
                        <tr key={item.sku}>
                          <td>{item.sku}</td>
                          <td>
                            {changesEntries.length ? (
                              changesEntries.map(([field, value]) => {
                                const dicKey = field === 'categoria_cod' ? 'categorias' : field === 'tipo_cod' ? 'tipos' : 'clasif'
                                const label = field === 'categoria_cod' ? 'Categoría' : field === 'tipo_cod' ? 'Tipo' : 'Clasificación'
                                return (
                                  <Badge bg="light" text="dark" className="me-2" key={field}>
                                    {label}: {etiquetaNombre(dic?.[dicKey], value)}
                                  </Badge>
                                )
                              })
                            ) : (
                              <Badge bg="secondary">Sin cambios</Badge>
                            )}
                          </td>
                          <td>
                            {verifiedEntries.length ? (
                              verifiedEntries.map(([field, value]) => {
                                const dicKey = field === 'categoria_cod' ? 'categorias' : field === 'tipo_cod' ? 'tipos' : 'clasif'
                                const label = field === 'categoria_cod' ? 'Categoría' : field === 'tipo_cod' ? 'Tipo' : 'Clasificación'
                                return (
                                  <Badge bg="info" className="me-2" key={field}>
                                    {label}: {etiquetaNombre(dic?.[dicKey], value)}
                                  </Badge>
                                )
                              })
                            ) : (
                              <Badge bg="secondary">Sin verificados</Badge>
                            )}
                          </td>
                          <td>
                            {item?.decision?.estado ? (
                              <>
                                {badgeDecision(item.decision.estado)}
                                {item?.decision?.decidedBy && (
                                  <div className="text-muted small">{item.decision.decidedBy}</div>
                                )}
                              </>
                            ) : (
                              <Badge bg="secondary">Pendiente</Badge>
                            )}
                          </td>
                          <td>
                            <Form.Check
                              type="switch"
                              id={`confirm-target-${item.sku}`}
                              label={(confirmTargets[item.sku] || 'consolidate') === 'consolidate' ? 'Consolidar' : 'Evaluar'}
                              checked={(confirmTargets[item.sku] || 'consolidate') === 'consolidate'}
                              onChange={(e) =>
                                setConfirmTargets((prev) => ({
                                  ...prev,
                                  [item.sku]: e.target.checked ? 'consolidate' : 'evaluate',
                                }))
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {!confirmItems.length && (
                      <tr>
                        <td colSpan={6}><EmptyState title="Sin SKUs en confirmación" subtitle="No hay ítems listos para confirmar con los filtros actuales." ctaLabel="Volver a Evaluar" onCta={() => setActiveTab('revisiones')} /></td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="consolidate" title="Consolidación">
          <Card>
            <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <strong>Consolidación</strong>
                <div className="text-muted small">
                  Exportá TXT por cambios aplicados o desconocidos y cerrá la campaña cuando esté lista.
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  variant="outline-primary"
                  onClick={onDownloadAppliedTxts}
                  disabled={exportLoading || consolidateLoading}
                >
                  Descargar aplicados (3 TXT)
                </Button>
                <Button
                  variant="outline-warning"
                  onClick={onDownloadUnknownTxts}
                  disabled={exportLoading || consolidateLoading}
                >
                  Descargar desconocidos (3 TXT)
                </Button>
                <Button variant="success" onClick={onCloseCampaign} disabled={consolidateLoading || exportLoading}>
                  Cerrar campaña
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {consolidateError && <Alert variant="danger">{consolidateError}</Alert>}
              {consolidateLoading ? (
                <div className="text-center text-muted">Cargando consolidación...</div>
              ) : (
                <Table responsive bordered size="sm">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Tipo</th>
                      <th>Cambios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidateItems
                      .slice()
                      .sort((a, b) => Object.keys(b?.changes || {}).length - Object.keys(a?.changes || {}).length)
                      .map((item) => {
                      const changeEntries = Object.entries(item?.changes || {})
                      const isUnknown = String(item?.skuType || '').toUpperCase() === 'UNKNOWN'
                      return (
                        <tr key={item.sku}>
                          <td>{item.sku}</td>
                          <td>
                            {changeEntries.length ? (
                              changeEntries.map(([field, value]) => {
                                const dicKey = field === 'categoria_cod' ? 'categorias' : field === 'tipo_cod' ? 'tipos' : 'clasif'
                                const label = field === 'categoria_cod' ? 'Categoría' : field === 'tipo_cod' ? 'Tipo' : 'Clasificación'
                                return (
                                  <Badge bg="light" text="dark" className="me-2" key={field}>
                                    {label}: {etiquetaNombre(dic?.[dicKey], value)}
                                  </Badge>
                                )
                              })
                            ) : (
                              <Badge bg="secondary">Sin cambios</Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {!consolidateItems.length && (
                      <tr>
                        <td colSpan={3}><EmptyState title="Sin SKUs en consolidación" subtitle="Todavía no hay cambios para exportar o cerrar campaña." ctaLabel="Ir a Confirmación" onCta={() => setActiveTab('confirm')} /></td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      <Modal show={Boolean(closeSummary)} onHide={() => setCloseSummary(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cierre de campaña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {closeSummary ? (
            <>
              <p><strong>Campaña:</strong> {campaniaId || '—'}</p>
              <p><strong>Total SKUs:</strong> {closeSummary.totalSkus}</p>
              <p><strong>Actualizados:</strong> {closeSummary.updated}</p>
              <p><strong>Verificados:</strong> {closeSummary.verified}</p>
              <h6 className="mt-3">Estadísticas por usuario</h6>
              {closeSummary.statsByUser?.length ? (
                <ul className="mb-0">
                  {closeSummary.statsByUser.map((entry) => (
                    <li key={entry.user}>{entry.user}: {entry.count}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">Sin datos por usuario.</p>
              )}
              {closeSummary.skusWithChanges?.length ? (
                <>
                  <h6 className="mt-3">SKUs con cambios</h6>
                  <ul>
                    {closeSummary.skusWithChanges.map((item) => (
                      <li key={item.sku}>{item.sku}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCloseSummary(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}





