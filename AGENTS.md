# Frontend — guía para agentes

Repositorio hermano backend: `../Control_Atributos_Back`. La coordinación canónica está en `../Control_Atributos_Back/docs/development/{ROADMAP,STATUS,DECISIONS,CHANGELOG}.md`. Leer además `../AGENTS.md` si existe.

Si el backend no está disponible en este checkout, consultar esos documentos en el repositorio `luishaedo/Control_Atributos_Back` al ref de trabajo confirmado por el coordinador. Si el plan aún no fue publicado, solicitarlo; no asumir que `main` contiene los últimos avances ni inventar el estado. Evitar una copia divergente.

- React/Vite con API Express/PostgreSQL. Front y back son repositorios Git distintos; preservar cambios ajenos.
- Identificación en localStorage no es autenticación. No tratar el blur visual como autorización ni autores enviados en body como identidad verificada.
- No confundir registrar escaneo, aprobar propuesta, aplicar al maestro y exportar. Mantener mensajes fieles al efecto real.
- No modificar contratos SKU/códigos o exportación sin coordinar con la tarea backend correspondiente.
- Validar `npm run lint`, `npm run test` y `npm run build` cuando corresponda; pruebas actuales de utilidades no cubren el circuito completo.
- No apuntar pruebas de escritura a producción ni poner tokens secretos en VITE_*.
- Reservar alcance de tarea con el coordinador y reportar pruebas/cambios/límites para actualizar el STATUS y CHANGELOG canónicos. No crear subagentes automáticamente.
