import { useState } from 'react'
import { uploadDiccionarios, uploadMaestro } from '../../../../services/adminImportApi.js'
import { buildActionableError } from '../../../../utils/uiFeedback.js'

export function useImports({ setError, refreshPreview }) {
  const [dictionaryFiles, setDictionaryFiles] = useState({ categorias: null, tipos: null, clasif: null })
  const [masterFile, setMasterFile] = useState(null)
  const [importMessage, setImportMessage] = useState('')
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
      const response = await uploadDiccionarios(dictionaryFiles)
      setImportMessage(`Se actualizaron diccionarios: categorías=${response.categorias}, tipos=${response.tipos}, clasif=${response.clasif}`)
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
      const response = await uploadMaestro({ maestro: masterFile })
      setImportMessage(`Se cargó archivo maestro con ${response.count} registros`)
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

  return {
    dictionaryFiles,
    setDictionaryFiles,
    masterFile,
    setMasterFile,
    importMessage,
    isUploadingDic,
    isUploadingMae,
    isUploading: isUploadingDic || isUploadingMae,
    dictionaryUploadButtonState,
    masterUploadButtonState,
    importDictionaries,
    importMaster,
  }
}
