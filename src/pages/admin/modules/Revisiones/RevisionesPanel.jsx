import React from 'react'
import Revisiones from '../../../Revisiones.jsx'

export default function RevisionesPanel({ campaigns, authOK }) {
  return (
    <div className="mb-3">
      <Revisiones
        campanias={campaigns}
        campaniaIdDefault={(campaigns.find((campaign) => campaign.activa)?.id || campaigns[0]?.id)}
        authOK={authOK}
      />
    </div>
  )
}
