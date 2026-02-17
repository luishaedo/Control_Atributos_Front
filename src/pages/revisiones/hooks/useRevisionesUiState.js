import { useRef, useState } from 'react'

export default function useRevisionesUiState(campaniaIdDefault) {
  const [activeTab, setActiveTab] = useState('revisiones')
  const [dic, setDic] = useState(null)
  const [uiMessage, setUiMessage] = useState(null)
  const messageTimeoutRef = useRef(null)

  const [campaniaId, setCampaniaId] = useState(String(campaniaIdDefault || ''))
  const [sku, setSku] = useState('')
  const [consenso, setConsenso] = useState('')
  const [soloDif, setSoloDif] = useState(true)
  const [items, setItems] = useState([])
  const [filtroDecision, setFiltroDecision] = useState('pendientes')

  const [cola, setCola] = useState([])
  const [seleccion, setSeleccion] = useState([])
  const [colaEstado, setColaEstado] = useState('')
  const [colaArchivada, setColaArchivada] = useState('activas')
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

  return {
    activeTab, setActiveTab, dic, setDic, uiMessage, setUiMessage, messageTimeoutRef,
    campaniaId, setCampaniaId, sku, setSku, consenso, setConsenso, soloDif, setSoloDif, items, setItems,
    filtroDecision, setFiltroDecision, cola, setCola, seleccion, setSeleccion, colaEstado, setColaEstado,
    colaArchivada, setColaArchivada, exportIncludeArchived, setExportIncludeArchived, toast, setToast,
    showArchiveModal, setShowArchiveModal, archiveLoading, setArchiveLoading, lastExportKind, setLastExportKind,
    lastActionSku, setLastActionSku, currentSku, setCurrentSku, evaluarOrder, setEvaluarOrder,
    evaluarNotice, setEvaluarNotice, stageBySku, setStageBySku, confirmFlags, setConfirmFlags,
    activeEvalTab, setActiveEvalTab, closeSummary, setCloseSummary, unknownEdits, setUnknownEdits,
    missingItems, setMissingItems, missingLoading, setMissingLoading, missingError, setMissingError,
    exportLoading, setExportLoading, confirmItems, setConfirmItems, confirmLoading, setConfirmLoading,
    confirmError, setConfirmError, confirmTargets, setConfirmTargets, consolidateItems, setConsolidateItems,
    consolidateLoading, setConsolidateLoading, consolidateError, setConsolidateError,
    fSKU, setFSKU, fEstado, setFEstado, fOldCat, setFOldCat, fNewCat, setFNewCat,
    fOldTipo, setFOldTipo, fNewTipo, setFNewTipo, fOldCla, setFOldCla, fNewCla, setFNewCla,
    fDecideBy, setFDecideBy, colaRef, cardRefs,
  }
}
