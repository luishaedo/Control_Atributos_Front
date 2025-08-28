# Control de Campaña (Front React + Bootstrap)

MVP para auditar SKUs durante campañas, con flujo "modo pistola" y API mock.

## Requisitos
- Node 18+
- NPM

## Instalación
```bash
npm install
npm run dev
```

## Stack
- React 18 (Vite)
- Bootstrap 5 + react-bootstrap
- Sin router ni estado global

## Estructura
```
src/
  App.jsx
  main.jsx
  utils/sku.js
  services/api.js
  components/
    Topbar.jsx
    StatusBadge.jsx
    CampaignSelector.jsx
    ScanBox.jsx
    SuggestionForm.jsx
  pages/
    Home.jsx
```

## Notas
- Identificación (email/sucursal) guardada en `localStorage`.
- API mock separada para reemplazar por `fetch('/api/...')`.
- Diccionarios y campañas de ejemplo incluidas.
- SKUs de prueba: `THJ00406207`, `ABC123`, `ZZTOP1`.
