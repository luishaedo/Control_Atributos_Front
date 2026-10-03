import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Container } from 'react-bootstrap'
import Topbar from '../../components/Topbar.jsx'
import {
  exportMaestroCSV,
  exportCategoriasCSV,
  exportTiposCSV,
  exportClasifCSV,
} from '../../services/adminApi.js'
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
import AccountsPanel from './modules/Accounts/AccountsPanel.jsx'

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeAdminTab, setActiveAdminTab] = useState('revisiones')

  const {
    credentials,
    setCredentials,
    user,
    authOK,
    error,
    setError,
    login,
    logout,
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
    campaignMessage,
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
    omittedRows,
    isUploading,
    dictionaryUploadButtonState,
    masterUploadButtonState,
    importDictionaries,
    importMaster,
    importOmittedRow,
  } = useImports({ setError, refreshPreview: loadPreview })

  useEffect(() => {
    loadCampaigns()
    loadPreview()
  }, [loadCampaigns, loadPreview])

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
        onChangeUser={logout}
        onClearUser={logout}
      />

      <Container className="pb-5 u-section-stack app-page">
        <AdminAuthPanel
          credentials={credentials}
          authOK={authOK}
          error={error}
          user={user}
          onCredentialsChange={setCredentials}
          onSubmit={login}
          onLogout={logout}
        />

        <div className={!authOK ? 'admin-content-locked' : ''}>
          <div className="app-page-heading">
            <div><div className="app-eyebrow">Panel de gestión</div><h1>Administración</h1><p>Revisá observaciones, gestioná campañas y consultá el maestro.</p></div>
          </div>
          <div className="admin-navigation u-mb-16" role="navigation" aria-label="Secciones de administración">
            <Button variant={activeAdminTab === 'revisiones' ? 'primary' : 'outline-secondary'} onClick={() => setActiveAdminTab('revisiones')} aria-current={activeAdminTab === 'revisiones' ? 'page' : undefined}>Revisiones</Button>
            <Button variant={activeAdminTab === 'campanias' ? 'primary' : 'outline-secondary'} onClick={() => setActiveAdminTab('campanias')} aria-current={activeAdminTab === 'campanias' ? 'page' : undefined}>Campañas</Button>
            <Button variant={activeAdminTab === 'import' ? 'primary' : 'outline-secondary'} onClick={() => setActiveAdminTab('import')} aria-current={activeAdminTab === 'import' ? 'page' : undefined}>Maestro e importaciones</Button>
            {user?.rol === 'ADMIN' && <Button variant={activeAdminTab === 'cuentas' ? 'primary' : 'outline-secondary'} onClick={() => setActiveAdminTab('cuentas')} aria-current={activeAdminTab === 'cuentas' ? 'page' : undefined}>Cuentas</Button>}
            <Button variant="outline-secondary" onClick={() => navigate('/auditoria')}>Auditoría</Button>
          </div>

          {activeAdminTab === 'revisiones' && <RevisionesPanel campaigns={campaigns} authOK={authOK} />}
          {activeAdminTab === 'cuentas' && user?.rol === 'ADMIN' && <AccountsPanel />}

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
                omittedRows={omittedRows}
                onImportOmittedRow={importOmittedRow}
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
              campaignMessage={campaignMessage}
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
    </div>
  )
}
