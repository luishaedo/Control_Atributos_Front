import { useState } from 'react'
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

  async function loadCampaigns() {
    try {
      const list = await getCampaigns()
      setCampaigns(list)
    } catch (_) {
      // noop
    }
  }

  async function createCampaign() {
    try {
      setError(null)
      const response = await crearCampania({ ...newCampaign, activa: false })
      alert(`Campaña creada: ${response.id}`)
      setNewCampaign(emptyCampaign)
      loadCampaigns()
    } catch (error) {
      setError(error.message || 'Error creando campaña')
    }
  }

  async function activateCampaign(id) {
    try {
      await activarCampania(id)
      loadCampaigns()
    } catch (error) {
      setError(error.message || 'No se pudo activar')
    }
  }

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

  async function saveCampaignEdition() {
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
      loadCampaigns()
    } catch (error) {
      setError(error.message || 'No se pudo actualizar la campaña')
    }
  }

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
    setEditCampaign,
    openEditCampaign,
    saveCampaignEdition,
  }
}
