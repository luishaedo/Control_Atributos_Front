# Engineering Quality Gates

Este documento define una base mínima de validaciones automáticas para reducir regresiones en el frontend.

## Objetivo

Pasar de una validación 100% manual a un flujo con feedback rápido en local y en CI.

## Scripts disponibles

- `npm run lint`: valida errores de JavaScript/React Hooks con ESLint.
- `npm run lint:fix`: corrige automáticamente problemas simples de estilo.
- `npm run test`: ejecuta pruebas unitarias con Vitest.
- `npm run test:watch`: ejecuta Vitest en modo watch para desarrollo.
- `npm run test:coverage`: genera reporte de cobertura sobre utilidades críticas.
- `npm run quality:check`: ejecuta lint + test + build como gate único.

## Política recomendada para PR

1. Todo PR debe pasar `npm run quality:check` localmente.
2. El pipeline de CI debe ejecutar al menos `npm run quality:check`.
3. Si un módulo crítico no tiene pruebas, agregar al menos una prueba de regresión en el mismo PR.

## Roadmap sugerido (siguiente iteración)

1. Aumentar cobertura en `src/services` para validar contratos API y manejo de errores.
2. Añadir tests de componentes críticos (escaneo, discrepancias, flujos de revisión).
3. Integrar check de cobertura mínima por carpeta crítica.
4. Incorporar validación de accesibilidad básica en componentes principales.
