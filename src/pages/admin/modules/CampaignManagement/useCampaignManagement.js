import { useCallback, useState } from 'react'
import { getCampaigns } from '../../../../services/api.js'
import { crearCampania, actualizarCampania, activarCampania } from '../../../../services/adminApi.js'

const emptyCampaign = {
  nombre: '',
  inicia: '',
  termina: '',
  categoria_objetivo_cod: '',
  tipo_objetivo_cod: '',
  clasif_objetivo_cod: '',
}

export function useCampaignManagement({ setError }) {
  const [campaigns, setCampaigns] = useState([])
  const [newCampaign, setNewCampaign] = useState(emptyCampaign)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editCampaign, setEditCampaign] = useState(null)
  const [campaignMessage, setCampaignMessage] = useState('')

  const loadCampaigns = useCallback(async () => {
    try {
      const list = await getCampaigns()
      setCampaigns(list)
      setError(null)
    } catch (error) {
      setError(/failed to fetch|networkerror/i.test(error?.message || '')
        ? 'No pudimos conectar con el servicio para cargar campañas. Verificá la conexión y reintentá.'
        : (error.message || 'No se pudieron cargar las campañas'))
      if (import.meta.env.DEV) {
        console.warn('[admin] campaign load failed', error)
      }
    }
  }, [setError])

  const createCampaign = useCallback(async () => {
    try {
      setError(null)
      setCampaignMessage('')
      const response = await crearCampania({ ...newCampaign, activa: false })
      setCampaignMessage(`Campaña creada correctamente (ID ${response.id}). Podés revisarla y activarla cuando esté lista.`)
      setNewCampaign(emptyCampaign)
      loadCampaigns()
    } catch (error) {
      setCampaignMessage('')
      setError(error.message || 'Error creando campaña')
    }
  }, [loadCampaigns, newCampaign, setError])

  const activateCampaign = useCallback(async (id) => {
    try {
      await activarCampania(id)
      setCampaignMessage('Campaña activada correctamente.')
      loadCampaigns()
    } catch (error) {
      setCampaignMessage('')
      setError(error.message || 'No se pudo activar')
    }
  }, [loadCampaigns, setError])

  function openEditCampaign(campaign) {
    setEditCampaign({
      id: campaign.id,
      nombre: campaign.nombre || '',
      inicia: campaign.inicia ? String(campaign.inicia).slice(0, 10) : '',
      termina: campaign.termina ? String(campaign.termina).slice(0, 10) : '',
      categoria_objetivo_cod: campaign.categoria_objetivo_cod || '',
      tipo_objetivo_cod: campaign.tipo_objetivo_cod || '',
      clasif_objetivo_cod: campaign.clasif_objetivo_cod || '',
    })
    setShowEditModal(true)
  }

  const saveCampaignEdition = useCallback(async () => {
    if (!editCampaign?.id) return

    try {
      await actualizarCampania(editCampaign.id, {
        nombre: editCampaign.nombre,
        inicia: editCampaign.inicia,
        termina: editCampaign.termina,
        categoria_objetivo_cod: editCampaign.categoria_objetivo_cod,
        tipo_objetivo_cod: editCampaign.tipo_objetivo_cod,
        clasif_objetivo_cod: editCampaign.clasif_objetivo_cod,
      })
      setShowEditModal(false)
      setEditCampaign(null)
      setCampaignMessage('Cambios de campaña guardados correctamente.')
      loadCampaigns()
    } catch (error) {
      setCampaignMessage('')
      setError(error.message || 'No se pudo actualizar la campaña')
    }
  }, [editCampaign, loadCampaigns, setError])

  return {
    campaigns,
    loadCampaigns,
    newCampaign,
    setNewCampaign,
    createCampaign,
    activateCampaign,
    showEditModal,
    setShowEditModal,
    editCampaign,
    campaignMessage,
    setEditCampaign,
    openEditCampaign,
    saveCampaignEdition,
  }
}
