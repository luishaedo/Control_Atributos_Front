Auditoría — UX Mejorada (React + Bootstrap)

Copiar carpetas/archivos dentro de tu Front:

src/pages/AuditoriaPage.jsx
src/components/auditoria/DiscrepanciasTabla.jsx
src/components/auditoria/DiscrepanciasSucursalesTabla.jsx
src/components/auditoria/ui.jsx
src/api/auditoria.js

Requisitos: tener Bootstrap cargado y endpoints /api/admin/* disponibles.

Uso:
- Agregá una ruta a AuditoriaPage (React Router).
- Pasar adminToken si usás Bearer en el back: <AuditoriaPage adminToken={token}/>.
- Botón “Actualizar” consulta ambos endpoints y pinta las tablas.
- Exportar CSV abre /api/admin/export/discrepancias.csv con el campaniaId ingresado.
