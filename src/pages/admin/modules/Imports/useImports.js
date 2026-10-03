import { useState } from 'react'
import { uploadDiccionarios, uploadMaestro } from '../../../../services/adminImportApi.js'
import { importarDiccionariosJSON, importarMaestroJSON } from '../../../../services/adminApi.js'
import { buildActionableError } from '../../../../utils/uiFeedback.js'

export function useImports({ setError, refreshPreview }) {
  const [dictionaryFiles, setDictionaryFiles] = useState({ categorias: null, tipos: null, clasif: null })
  const [masterFile, setMasterFile] = useState(null)
  const [importMessage, setImportMessage] = useState('')
  const [omittedRows, setOmittedRows] = useState({})
  const [isUploadingDic, setIsUploadingDic] = useState(false)
  const [isUploadingMae, setIsUploadingMae] = useState(false)
  const [dictionaryUploadButtonState, setDictionaryUploadButtonState] = useState('default')
  const [masterUploadButtonState, setMasterUploadButtonState] = useState('default')

  function resetButtonState(setter, ms = 1800) {
    window.setTimeout(() => setter('default'), ms)
  }

  async function importDictionaries() {
    if (isUploadingDic) return

    const hasFiles = Boolean(dictionaryFiles.categorias || dictionaryFiles.tipos || dictionaryFiles.clasif)
    if (!hasFiles) {
      setError(buildActionableError({ what: 'No pudimos iniciar la importación.', why: 'No se seleccionó ningún archivo de diccionario.', how: 'Seleccioná al menos un archivo y reintentá.' }))
      return
    }

    let hasError = false
    try {
      setDictionaryUploadButtonState('loading')
      setIsUploadingDic(true)
      setError(null)
      setImportMessage('')
      setOmittedRows({})
      const response = await uploadDiccionarios(dictionaryFiles)
      setImportMessage(`Se actualizaron diccionarios: categorías=${response.categorias}, tipos=${response.tipos}, clasif=${response.clasif}`)
      setOmittedRows(Object.fromEntries(Object.entries(response.omittedRows || {}).map(([name, rows]) => [name, rows.map(row => ({ ...row, file: name }))])))
      const omittedCount = Object.values(response.omittedRows || {}).reduce((total, rows) => total + rows.length, 0)
      if (omittedCount) setImportMessage(previous => `${previous}; ${omittedCount} fila(s) omitida(s). Revisá el detalle por archivo.`)
      setDictionaryUploadButtonState('success')
      resetButtonState(setDictionaryUploadButtonState)
      refreshPreview()
    } catch (error) {
      hasError = true
      setError(buildActionableError({ what: 'No pudimos importar diccionarios.', why: error.message || 'El archivo no pudo procesarse.', how: 'Validá formato/encabezados y reintentá.' }))
      setDictionaryUploadButtonState('error')
      resetButtonState(setDictionaryUploadButtonState, 2200)
    } finally {
      setIsUploadingDic(false)
      if (!hasError) setDictionaryFiles({ categorias: null, tipos: null, clasif: null })
    }
  }

  async function importMaster() {
    if (isUploadingMae) return
    if (!masterFile) {
      setError(buildActionableError({ what: 'No pudimos iniciar la importación.', why: 'No se seleccionó archivo maestro.', how: 'Seleccioná un CSV de maestro y reintentá.' }))
      return
    }

    let hasError = false
    try {
      setMasterUploadButtonState('loading')
      setIsUploadingMae(true)
      setError(null)
      setImportMessage('')
      setOmittedRows({})
      const response = await uploadMaestro({ maestro: masterFile })
      const suffixNotice = response.warningCount
        ? `. Aviso: ${response.warningCount} SKU(s) tenían sufijo #/$; se importó únicamente la base informada por la respuesta`
        : ''
      const omittedNotice = response.omittedCount ? `; ${response.omittedCount} fila(s) omitida(s)` : ''
      setImportMessage(`Se cargó archivo maestro con ${response.count} registros${omittedNotice}${suffixNotice}`)
      setOmittedRows(response.omittedRows?.length ? { maestro: response.omittedRows.map(row => ({ ...row, file: 'maestro' })) } : {})
      setMasterUploadButtonState('success')
      resetButtonState(setMasterUploadButtonState)
      refreshPreview()
    } catch (error) {
      hasError = true
      setError(buildActionableError({ what: 'No pudimos importar el maestro.', why: error.message || 'El archivo no pudo procesarse.', how: 'Validá formato/encabezados y reintentá.' }))
      setMasterUploadButtonState('error')
      resetButtonState(setMasterUploadButtonState, 2200)
    } finally {
      setIsUploadingMae(false)
      if (!hasError) setMasterFile(null)
    }
  }

  async function importOmittedRow(fileKey, sourceRow, row) {
    if (['categorias', 'tipos', 'clasif'].includes(fileKey)) {
      await importarDiccionariosJSON({ [fileKey]: [{ cod: row.cod, nombre: row.nombre }] })
    } else {
      const result = await importarMaestroJSON([row])
      if (!result.count) {
        throw new Error(result.omittedRows?.[0]?.message || result.skippedMessage || 'La fila continúa teniendo errores.')
      }
    }
    setOmittedRows(current => {
      const remaining = (current[fileKey] || []).filter(item => item !== sourceRow)
      if (remaining.length) return { ...current, [fileKey]: remaining }
      const next = { ...current }
      delete next[fileKey]
      return next
    })
    setImportMessage(`Fila ${sourceRow.row} de ${FILE_NAME[fileKey]} corregida y cargada.`)
    refreshPreview()
  }

  return {
    dictionaryFiles,
    setDictionaryFiles,
    masterFile,
    setMasterFile,
    importMessage,
    omittedRows,
    isUploadingDic,
    isUploadingMae,
    isUploading: isUploadingDic || isUploadingMae,
    dictionaryUploadButtonState,
    masterUploadButtonState,
    importDictionaries,
    importMaster,
    importOmittedRow,
  }
}

const FILE_NAME = { categorias: 'categorías', tipos: 'tipos', clasif: 'clasificaciones', maestro: 'maestro' }
