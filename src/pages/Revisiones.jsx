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
  // Revisiones
  getRevisiones, decidirRevision,
  importarMaestroJSON, getMissingMaestro,
  getConfirmaciones, getConsolidacionCambios, cerrarCampania,
  // Cola
  listarActualizaciones, exportActualizacionesCSV, aplicarActualizaciones,
  archivarActualizaciones, undoActualizacion, revertirActualizacion,
  // TXT
  exportTxtCategoria, exportTxtTipo, exportTxtClasif,
} from '../services/adminApi'

// ===== Helpers =====
function etiqueta(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr || []).find(x => x.cod === c)
  return it ? `${c} · ${it.nombre}` : c
}
function etiquetaNombre(dicArr, cod) {
  if (!cod) return '—'
  const c = pad2(cod)
  const it = (dicArr || []).find(x => x.cod === c)
  return it ? it.nombre : c
}
function shortUserLabel(value = '') {
  const str = String(value || '')
  if (!str) return '—'
  const [name] = str.split('@')
  return name || str
}
function badgeDecision(estado) {
  if (estado === 'aplicada')   return <Badge bg="success">APLICADA</Badge>
  if (estado === 'pendiente')  return <Badge bg="warning" text="dark">ACEPTADA (pend.)</Badge>
  if (estado === 'rechazada')  return <Badge bg="danger">RECHAZADA</Badge>
  return <Badge bg="secondary">—</Badge>
}
const CONSENSUS_THRESHOLD = 0.6
function buildAttributeOptions(propuestas = [], field) {
  const map = new Map()
  for (const p of propuestas) {
    const code = p?.[field]
    if (!code) continue
    const entry = map.get(code) || { code, count: 0, usuarios: new Set(), sucursales: new Set() }
    entry.count += Number(p.count || 0)
    ;(p.usuarios || []).forEach(u => entry.usuarios.add(u))
    ;(p.sucursales || []).forEach(s => entry.sucursales.add(s))
    map.set(code, entry)
  }
  const list = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .map(item => ({
      ...item,
      usuarios: Array.from(item.usuarios),
      sucursales: Array.from(item.sucursales),
    }))
  const total = list.reduce((acc, it) => acc + it.count, 0)
  return {
    total,
    options: list.map(item => ({
      ...item,
      share: total ? item.count / total : 0
    }))
  }
}
function consensusLabel(share) {
  const pct = Math.round(share * 100)
  if (share >= CONSENSUS_THRESHOLD) return { text: `Consenso ${pct}%`, variant: 'success' }
  if (share > 0) return { text: `${pct}%`, variant: 'warning' }
  return { text: 'Sin votos', variant: 'secondary' }
}
function getAcceptedAttributeCode(propuestas = [], field) {
  const accepted = propuestas.find((p) => p?.decision && p?.decision?.estado !== 'rechazada' && p?.[field])
  return accepted?.[field] || ''
}
function getAcceptedAttributeDecision(propuestas = [], field) {
  const accepted = propuestas.find((p) => p?.decision && p?.decision?.estado !== 'rechazada' && p?.[field])
  return accepted?.decision || null
}
function hasValidCode(dicArr, code) {
  if (!code) return false
  const normalized = pad2(code)
  return (dicArr || []).some((item) => item.cod === normalized)
}
function getNewAttributeValue(item, field) {
  const accepted = getAcceptedAttributeCode(item?.propuestas, field)
  if (accepted) return accepted
  if (field === 'categoria_cod') return item?.maestro?.categoria_cod || ''
  if (field === 'tipo_cod') return item?.maestro?.tipo_cod || ''
  return item?.maestro?.clasif_cod || ''
}
function descargarBlobDirecto(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
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
  const [confirmItems, setConfirmItems] = useState([])
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState('')
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
        const missingMaestro = !item?.maestro?.categoria_cod && !item?.maestro?.tipo_cod && !item?.maestro?.clasif_cod
        if (missingMaestro) {
          next[item.sku] = 'unknown'
          return
        }
        const changes = getChangeCountForItem(item)
        next[item.sku] = changes === 0 ? 'confirm' : 'evaluate'
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
        if (getChangeCountForItem(item) === 0) next[item.sku] = 'confirm'
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
    return getNewAttributeValue(item, field)
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

  function onMarkReady(item) {
    if (!item?.sku) return
    setStageBySku((prev) => ({ ...prev, [item.sku]: 'confirm' }))
    setConfirmFlags((prev) => ({ ...prev, [item.sku]: true }))
  }

  function onMoveUnknownToConfirm(item) {
    if (!item?.sku) return
    if (!isUnknownReady(item.sku)) return
    setStageBySku((prev) => ({ ...prev, [item.sku]: 'confirm' }))
    setConfirmFlags((prev) => ({ ...prev, [item.sku]: true }))
  }

  function onToggleConfirmFlag(sku, value) {
    setConfirmFlags((prev) => ({ ...prev, [sku]: value }))
  }

  function onApplyConfirmation() {
    setStageBySku((prev) => {
      const next = { ...prev }
      confirmQueue.forEach((item) => {
        const shouldConfirm = confirmFlags[item.sku] !== false
        next[item.sku] = shouldConfirm ? 'consolidate' : 'evaluate'
      })
      return next
    })
    setActiveTab('consolidate')
    loadConsolidacion()
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
    await decidirRevision({
      campaniaId: Number(campaniaId),
      sku,
      propuesta,
      decision,
      decidedBy: 'admin@local',
      aplicarAhora: false
    })
    await cargar()
    setLastActionSku(sku)
    setCurrentSku(sku)
  }
  async function onRechazar(sku, prop) {
    await decidirRevision({
      campaniaId: Number(campaniaId), sku,
      propuesta: prop, decision: 'rechazar',
      decidedBy: 'admin@local'
    })
    await cargar()
    setLastActionSku(sku)
    setCurrentSku(sku)
  }
  async function onUndoAttributeDecision(decisionId, sku) {
    if (!decisionId) return
    await undoActualizacion(decisionId)
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
    setUiMessage({
      variant: 'info',
      text: 'Decisión deshecha. Quedó como pendiente nuevamente.'
    })
    messageTimeoutRef.current = setTimeout(() => {
      setUiMessage(null)
      messageTimeoutRef.current = null
    }, 4000)
    await cargar()
    if (sku) setLastActionSku(sku)
    setCurrentSku(sku)
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
  async function onExportTxtCat(estado='aceptadas', incluirArchivadas=false) {
    const b = await exportTxtCategoria(Number(campaniaId), estado, incluirArchivadas)
    descargarBlobDirecto(b, `categoria_${campaniaId}_${estado}${incluirArchivadas?'_inclArch':''}.txt`)
    setLastExportKind('TXT Categoría')
    setShowArchiveModal(true)
  }
  async function onExportTxtTipo(estado='aceptadas', incluirArchivadas=false) {
    const b = await exportTxtTipo(Number(campaniaId), estado, incluirArchivadas)
    descargarBlobDirecto(b, `tipo_${campaniaId}_${estado}${incluirArchivadas?'_inclArch':''}.txt`)
    setLastExportKind('TXT Tipo')
    setShowArchiveModal(true)
  }
  async function onExportTxtClasif(estado='aceptadas', incluirArchivadas=false) {
    const b = await exportTxtClasif(Number(campaniaId), estado, incluirArchivadas)
    descargarBlobDirecto(b, `clasif_${campaniaId}_${estado}${incluirArchivadas?'_inclArch':''}.txt`)
    setLastExportKind('TXT Clasif')
    setShowArchiveModal(true)
  }
  function onExportTxtSeleccion(campo) {
    const mapNew = { categoria: 'new_categoria_cod', tipo: 'new_tipo_cod', clasif: 'new_clasif_cod' }
    const mapOld = { categoria: 'old_categoria_cod', tipo: 'old_tipo_cod', clasif: 'old_clasif_cod' }
    const chosen = cola.filter(a => seleccion.includes(a.id))
    const lines = []
    for (const a of chosen) {
      const newCode = a[mapNew[campo]]
      const oldCode = a[mapOld[campo]]
      if (!newCode) continue
      if (oldCode && String(oldCode) === String(newCode)) continue
      lines.push(`${a.sku}\t${newCode}`)
    }
    const body = '\ufeff' + lines.join('\n') + (lines.length ? '\n' : '')
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    descargarBlobDirecto(blob, `${campo}_seleccion_camp_${campaniaId}.txt`)
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

      {/* Barra superior común */}
      <Card className="mb-3">
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

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k || 'revisiones')} className="mb-3">
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
            const acceptedCategoriaCode = getAcceptedAttributeCode(it.propuestas, 'categoria_cod')
            const acceptedTipoCode = getAcceptedAttributeCode(it.propuestas, 'tipo_cod')
            const acceptedClasifCode = getAcceptedAttributeCode(it.propuestas, 'clasif_cod')
            const acceptedCategoriaDecision = getAcceptedAttributeDecision(it.propuestas, 'categoria_cod')
            const acceptedTipoDecision = getAcceptedAttributeDecision(it.propuestas, 'tipo_cod')
            const acceptedClasifDecision = getAcceptedAttributeDecision(it.propuestas, 'clasif_cod')
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
                        const acceptedCode = getAcceptedAttributeCode(it.propuestas, field)
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
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => onDecideAttribute(it.sku, field, opt.code, 'rechazar')}
                                            disabled={!authOK}
                                          >
                                            Rechazar
                                          </Button>
                                          <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => onDecideAttribute(it.sku, field, opt.code, 'aceptar')}
                                            disabled={!authOK}
                                          >
                                            Aceptar
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
                                      ) : (
                                        <Button variant="outline-danger" size="sm"
                                                onClick={()=>onRechazar(it.sku, p)} disabled={!authOK}>
                                          Rechazar
                                        </Button>
                                      )}
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
            <Card body className="text-center text-muted">No hay resultados con los filtros actuales.</Card>
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unknownQueue.map((item) => {
                      const edits = unknownEdits[item.sku] || {}
                      const ready = isUnknownReady(item.sku)
                      return (
                        <tr key={item.sku}>
                          <td>{item.sku}</td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={edits.categoria_cod || ''}
                              onChange={(e) => onUpdateUnknown(item.sku, 'categoria_cod', e.target.value)}
                            >
                              <option value="">Seleccionar</option>
                              {(dic?.categorias || []).map((c) => (
                                <option key={c.cod} value={c.cod}>{c.nombre}</option>
                              ))}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={edits.tipo_cod || ''}
                              onChange={(e) => onUpdateUnknown(item.sku, 'tipo_cod', e.target.value)}
                            >
                              <option value="">Seleccionar</option>
                              {(dic?.tipos || []).map((t) => (
                                <option key={t.cod} value={t.cod}>{t.nombre}</option>
                              ))}
                            </Form.Select>
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={edits.clasif_cod || ''}
                              onChange={(e) => onUpdateUnknown(item.sku, 'clasif_cod', e.target.value)}
                            >
                              <option value="">Seleccionar</option>
                              {(dic?.clasif || []).map((c) => (
                                <option key={c.cod} value={c.cod}>{c.nombre}</option>
                              ))}
                            </Form.Select>
                          </td>
                          <td>
                            {ready ? <Badge bg="success">Listo</Badge> : <Badge bg="secondary">Incompleto</Badge>}
                          </td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => onMoveUnknownToConfirm(item)}
                              disabled={!ready}
                            >
                              Enviar a Confirmación
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {!unknownQueue.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted">
                          No hay SKUs desconocidos.
                        </td>
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
                Ir a Consolidación
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
                      const changesEntries = Object.entries(item?.changes || {})
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
                        </tr>
                      )
                    })}
                    {!confirmItems.length && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          No hay SKUs en confirmación.
                        </td>
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
                  Exportá solo cambios reales y cerrá la campaña cuando esté lista.
                </div>
              </div>
              <Button variant="success" onClick={onCloseCampaign} disabled={consolidateLoading}>
                Cerrar campaña
              </Button>
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
                      <th>Cambios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidateItems
                      .slice()
                      .sort((a, b) => Object.keys(b?.changes || {}).length - Object.keys(a?.changes || {}).length)
                      .map((item) => {
                      const changeEntries = Object.entries(item?.changes || {})
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
                        <td colSpan={2} className="text-center text-muted">
                          No hay SKUs en consolidación.
                        </td>
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
