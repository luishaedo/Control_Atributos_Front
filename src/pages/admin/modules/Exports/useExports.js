import { useEffect, useState } from 'react'
import { getDictionaries, getMaestroList } from '../../../../services/api.js'

export function useExports() {
  const [dictionaryPreview, setDictionaryPreview] = useState(null)
  const [masterPreview, setMasterPreview] = useState({ items: [], total: 0 })
  const [masterQuery, setMasterQuery] = useState('')
  const [masterPage, setMasterPage] = useState(1)
  const [previewError, setPreviewError] = useState(null)
  const masterPageSize = 20

  useEffect(() => {
    loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterQuery, masterPage])

  async function loadPreview() {
    try {
      setPreviewError(null)
      const [dic, master] = await Promise.all([
        getDictionaries(),
        getMaestroList({ q: masterQuery, page: masterPage, pageSize: masterPageSize }),
      ])

      setDictionaryPreview(dic)
      setMasterPreview({
        items: master?.items || [],
        total: master?.total || 0,
      })
    } catch (error) {
      setPreviewError('No se pudo cargar la vista previa de diccionarios/maestro. Reintentá.')
      if (import.meta.env.DEV) {
        console.warn('[admin] exports preview load failed', error)
      }
    }
  }

  return {
    dictionaryPreview,
    masterPreview,
    masterQuery,
    setMasterQuery,
    masterPage,
    setMasterPage,
    masterPageSize,
    previewError,
    loadPreview,
  }
}
