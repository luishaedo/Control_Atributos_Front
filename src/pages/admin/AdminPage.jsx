import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Container } from 'react-bootstrap'
import Topbar from '../../components/Topbar.jsx'
import IdentityModal from '../../components/IdentityModal.jsx'
import {
  exportMaestroCSV,
  exportCategoriasCSV,
  exportTiposCSV,
  exportClasifCSV,
} from '../../services/adminApi.js'
import { clearUserFromLocalStorage, getUserFromLocalStorage, setUserInLocalStorage } from './shared/adminStorage.js'
import { useAdminAuth } from './modules/AdminAuth/useAdminAuth.js'
import AdminAuthPanel from './modules/AdminAuth/AdminAuthPanel.jsx'
import { useCampaignManagement } from './modules/CampaignManagement/useCampaignManagement.js'
import CampaignManagementPanel from './modules/CampaignManagement/CampaignManagementPanel.jsx'
import CampaignEditModal from './modules/CampaignManagement/CampaignEditModal.jsx'
import { useImports } from './modules/Imports/useImports.js'
import ImportsPanel from './modules/Imports/ImportsPanel.jsx'
import { useExports } from './modules/Exports/useExports.js'
import ExportsPanel from './modules/Exports/ExportsPanel.jsx'
import RevisionesPanel from './modules/Revisiones/RevisionesPanel.jsx'

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeAdminTab, setActiveAdminTab] = useState('revisiones')
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [user, setUser] = useState(getUserFromLocalStorage() || { email: 'admin@local', sucursal: 'Admin' })

  const {
    token,
    setToken,
    authOK,
    error,
    setError,
    login,
  } = useAdminAuth()

  const {
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
  } = useCampaignManagement({ setError })

  const {
    dictionaryPreview,
    masterPreview,
    masterQuery,
    setMasterQuery,
    masterPage,
    setMasterPage,
    masterPageSize,
    previewError,
    loadPreview,
  } = useExports()

  const {
    dictionaryFiles,
    setDictionaryFiles,
    masterFile,
    setMasterFile,
    importMessage,
    isUploading,
    dictionaryUploadButtonState,
    masterUploadButtonState,
    importDictionaries,
    importMaster,
  } = useImports({ setError, refreshPreview: loadPreview })

  useEffect(() => {
    loadCampaigns()
    loadPreview()
  }, [])

  function saveIdentity(nextUser) {
    setUser(nextUser)
    setUserInLocalStorage(nextUser)
    setShowIdentityModal(false)
  }

  function downloadBlobDirect(blob, fileName) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function downloadBlob(promiseBlobFn, fileName) {
    try {
      const blob = await promiseBlobFn()
      downloadBlobDirect(blob, fileName)
    } catch (downloadError) {
      setError(downloadError.message || 'No se pudo descargar CSV')
    }
  }

  return (
    <div>
      <Topbar
        user={user}
        onChangeUser={() => setShowIdentityModal(true)}
        onClearUser={() => {
          clearUserFromLocalStorage()
          setUser({ email: '', sucursal: '' })
          setShowIdentityModal(true)
        }}
      />

      <Container className="pb-5 u-section-stack">
        <AdminAuthPanel
          token={token}
          authOK={authOK}
          error={error}
          onTokenChange={setToken}
          onSubmit={login}
        />

        <div className={!authOK ? 'admin-content-locked' : ''}>
          <div className="d-flex justify-content-end u-mb-16 gap-2">
            <Button variant={activeAdminTab === 'campanias' ? 'primary' : 'outline-secondary'} onClick={() => setActiveAdminTab('campanias')}>
              Campaña
            </Button>
            <Button variant={activeAdminTab === 'import' ? 'primary' : 'outline-secondary'} onClick={() => setActiveAdminTab('import')}>
              Maestro
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate('/auditoria')}>
              Auditoría
            </Button>
          </div>

          {activeAdminTab === 'revisiones' && <RevisionesPanel campaigns={campaigns} authOK={authOK} />}

          {activeAdminTab === 'import' && (
            <>
              <ImportsPanel
                authOK={authOK}
                isUploading={isUploading}
                dictionaryFiles={dictionaryFiles}
                onDictionaryFilesChange={setDictionaryFiles}
                onImportDictionaries={importDictionaries}
                dictionaryUploadButtonState={dictionaryUploadButtonState}
                masterFile={masterFile}
                onMasterFileChange={setMasterFile}
                onImportMaster={importMaster}
                masterUploadButtonState={masterUploadButtonState}
                importMessage={importMessage}
              />

              <div className="d-flex justify-content-end u-mb-16">
                <Button variant="outline-secondary" size="sm" onClick={loadPreview}>
                  Actualizar vista
                </Button>
              </div>

              <ExportsPanel
                authOK={authOK}
                dictionaryPreview={dictionaryPreview}
                masterPreview={masterPreview}
                masterQuery={masterQuery}
                onMasterQueryChange={setMasterQuery}
                masterPage={masterPage}
                onMasterPageChange={setMasterPage}
                masterPageSize={masterPageSize}
                previewError={previewError}
                onExportCategories={() => downloadBlob(exportCategoriasCSV, 'categorias.csv')}
                onExportTypes={() => downloadBlob(exportTiposCSV, 'tipos.csv')}
                onExportClassifications={() => downloadBlob(exportClasifCSV, 'clasif.csv')}
                onExportMaster={() => downloadBlob(exportMaestroCSV, 'maestro.csv')}
              />
            </>
          )}

          {activeAdminTab === 'campanias' && (
            <CampaignManagementPanel
              authOK={authOK}
              campaigns={campaigns}
              newCampaign={newCampaign}
              onNewCampaignChange={setNewCampaign}
              onCreateCampaign={createCampaign}
              onRefreshCampaigns={loadCampaigns}
              onEditCampaign={openEditCampaign}
              onActivateCampaign={activateCampaign}
            />
          )}
        </div>
      </Container>

      <CampaignEditModal
        show={showEditModal}
        authOK={authOK}
        campaign={editCampaign}
        onClose={() => setShowEditModal(false)}
        onChange={setEditCampaign}
        onSave={saveCampaignEdition}
      />

      <IdentityModal
        show={showIdentityModal}
        initialEmail={user?.email || ''}
        initialSucursal={user?.sucursal || ''}
        onSave={saveIdentity}
        onClose={() => setShowIdentityModal(false)}
      />
    </div>
  )
}
