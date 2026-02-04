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

## Variables de entorno
- `VITE_API_URL` (requerida en producciÃ³n): URL base del backend, por ejemplo `https://mi-backend.ejemplo.com`.

## Deploy (Vercel)
- Este proyecto usa React Router con `BrowserRouter`.
- Para evitar 404 al refrescar rutas como `/admin`, se requiere rewrite a `index.html`.
- Se incluye `vercel.json` con el rewrite catch-all.

## Admin auth (cookie)
- El login admin guarda el token en cookie `HttpOnly` (no localStorage).
- Requiere `credentials: 'include'` en fetch (ya configurado).
- Si el backend estÃ¡ en otro dominio, configurÃ¡ CORS en el backend.

## Bootstrap
- Se carga vÃ­a CDN para reducir el tamaÃ±o del bundle.

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
