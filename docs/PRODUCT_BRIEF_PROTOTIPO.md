# Control de Atributos — brief integral para prototipo frontend

Fecha de corte: 01/10/2026  
Audiencia: product designer, UX/UI designer y desarrollador frontend  
Objetivo: permitir la creación de un prototipo navegable completo, fiel a las reglas aprobadas y suficientemente expresivo para validar el producto con operadores, revisores y administradores.

## 1. Resumen ejecutivo

Control de Atributos es una aplicación interna para verificar y corregir la clasificación de artículos de una empresa con aproximadamente siete sucursales.

El sistema parte de un **maestro de artículos** que contiene, por SKU, una descripción y tres atributos codificados:

- categoría;
- tipo;
- clasificación.

Durante una **campaña**, operadores de distintas sucursales escanean artículos y registran lo que observan. Esas observaciones no modifican inmediatamente el maestro. El sistema las reúne, calcula consenso por atributo y las presenta a un revisor. El revisor decide qué propuestas aceptar, rechazar o devolver. Un administrador confirma el conjunto final, cierra la campaña de manera atómica y obtiene archivos de exportación estables para actualizar el sistema externo.

La idea central puede expresarse así:

> Convertir observaciones distribuidas de las sucursales en correcciones trazables, revisadas y exportables, sin perder el estado original ni confundir una observación con un cambio aplicado.

No es una app de inventario, stock, precios ni ventas. Su foco es la **calidad de los atributos del catálogo** y la trazabilidad del proceso de corrección.

## 2. Problema que resuelve

La clasificación central de un artículo puede estar desactualizada, incompleta o ser discutible. Las sucursales conocen el producto físico, pero sus observaciones pueden repetirse, contradecirse o ser erróneas. Actualizar el maestro directamente desde cada sucursal sería riesgoso.

La aplicación crea una cadena de control:

1. el administrador define qué se va a revisar;
2. cada sucursal registra evidencia operativa;
3. el sistema agrupa la última observación válida de cada sucursal;
4. un revisor resuelve diferencias por atributo;
5. un administrador confirma y cierra;
6. el resultado queda aplicado, auditado y exportable.

El valor del producto no está solamente en “escanear rápido”, sino en sostener estas garantías:

- no perder cambios de un atributo al decidir otro;
- no duplicar observaciones por reintentos de red;
- no permitir que una sucursal suplante a otra;
- no aplicar propuestas rechazadas o anuladas;
- no ocultar conflictos entre sucursales;
- conservar el maestro de inicio de la campaña como referencia;
- poder explicar quién observó, quién decidió, qué se aplicó y cuándo;
- producir exportaciones repetibles y coherentes con el resultado final.

## 3. Modelo mental del producto

El prototipo debe enseñar esta secuencia, aunque internamente existan más estados técnicos:

```text
Maestro vigente
      ↓
Campaña en borrador
      ↓ activar y congelar snapshot
Campaña activa
      ↓ observaciones de sucursales
Evaluación por SKU y atributo
      ↓ decisiones del revisor
Confirmación
      ↓ conjunto final listo
Consolidación
      ↓ cierre administrativo atómico
Maestro actualizado + historial + exportaciones finales
```

Conceptos esenciales:

| Concepto | Significado para el usuario |
|---|---|
| Maestro | Catálogo vigente de artículos y sus tres atributos. |
| Diccionarios | Listas válidas de categorías, tipos y clasificaciones. |
| Campaña | Período organizado de revisión de una parte o de todo el maestro. |
| Snapshot | Copia inmutable del maestro al activar la campaña; es la referencia “antes”. |
| Observación | Lo que un operador registra al escanear; no es una modificación del maestro. |
| Consenso | Señal informativa calculada por atributo desde la última observación válida de cada sucursal. |
| Decisión | Resolución del revisor sobre una propuesta concreta. |
| Confirmación | Habilitación de las decisiones vigentes para el cierre. |
| Consolidación | Vista previa del resultado que se aplicará. |
| Cierre | Operación única que aplica el conjunto final y deja la campaña cerrada. |
| Reversión | Nueva decisión compensatoria trazable; nunca borra el evento original. |
| SKU desconocido | Artículo observado que no estaba en el snapshot de la campaña. |

## 4. Usuarios, responsabilidades y permisos

### Operador de sucursal

Trabaja principalmente con lector de códigos o teclado. Tiene una cuenta individual y una sucursal asignada por el servidor.

Puede:

- iniciar y cerrar sesión;
- ver la campaña activa y su alcance;
- consultar lo necesario del maestro y los diccionarios;
- validar un SKU;
- registrar una observación para su propia sucursal;
- completar los tres atributos si el SKU es desconocido;
- ver confirmación inmediata de que la observación fue registrada.

No puede:

- cambiar su identidad o sucursal desde un formulario;
- decidir propuestas;
- importar catálogos;
- activar o cerrar campañas;
- administrar usuarios;
- aplicar cambios al maestro.

### Revisor

Trabaja sobre el conjunto de observaciones de todas las sucursales. Su tarea es reducir incertidumbre y preparar un resultado confiable.

Puede:

- filtrar y priorizar SKUs pendientes;
- comparar snapshot, observaciones y propuesta dominante;
- decidir por categoría, tipo y clasificación de forma independiente;
- aceptar, rechazar o mantener un atributo sin cambio;
- clasificar, rechazar o fusionar SKUs desconocidos;
- enviar ítems a confirmación o devolverlos a evaluación;
- consultar métricas de consenso y discrepancias.

No debe poder ejecutar acciones exclusivas de administración, como cerrar la campaña, importar el maestro o gestionar usuarios.

### Administrador

Configura la operación y asume las acciones de mayor impacto.

Puede:

- realizar todo lo disponible para un revisor;
- crear, editar y activar campañas;
- importar diccionarios y maestro;
- gestionar sucursales y usuarios;
- confirmar el cierre y aplicar el resultado;
- descargar exportaciones y resúmenes finales;
- consultar auditoría global.

### Principio de interfaz por rol

El prototipo no debe presentar todos los controles deshabilitados a todos los usuarios. La navegación y las acciones deben adaptarse al rol. Un permiso insuficiente se representa con una explicación sólo cuando el usuario llega mediante un enlace válido o su rol cambia durante la sesión; no como ruido permanente en cada pantalla.

## 5. Reglas de negocio que el diseño debe respetar

### SKU y códigos

- El primer `#` o `$` separa un sufijo de etiqueta del SKU base.
- La identidad usa la base alfanumérica en mayúsculas.
- Ejemplo: `abc123#lote9` se interpreta como `ABC123` y se avisa antes de guardar.
- El valor leído completo se conserva para auditoría cuando corresponde.
- Los códigos de atributos admiten uno o dos dígitos y se muestran con dos dígitos: `1` se convierte en `01`.
- Un valor contaminado, de más de dos dígitos o ausente del diccionario debe rechazarse completo; nunca truncarse silenciosamente.

### Campañas

- Sólo puede existir una campaña activa.
- Una campaña nace como borrador.
- El snapshot se congela al activar.
- Después de la primera activación no se edita la definición normal de la campaña.
- Una campaña cerrada no se reactiva por el flujo normal.
- Las fechas deben ser válidas y mantener `inicia <= termina`.
- En la versión actual, las fechas son informativas: no abren, cierran ni bloquean el escaneo automáticamente.
- Los filtros objetivo de categoría, tipo y clasificación son opcionales.

### Observaciones y consenso

- Registrar una observación nunca significa “aplicar un cambio”.
- Un reintento del mismo intento lógico debe recuperar el mismo resultado y no crear duplicados.
- La sucursal y el actor provienen de la sesión del servidor.
- Para consenso cuenta la última observación válida por sucursal, SKU y atributo.
- Cada sucursal pesa una vez por atributo.
- El porcentaje se calcula sólo sobre sucursales que observaron ese atributo y nunca supera 100%.
- Los estados de consenso son: sin observación, consenso, conflicto y empate.
- El consenso ayuda a priorizar; no reemplaza la decisión humana.

### Decisiones, cierre y reversión

- Aceptar registra una decisión; confirmar la habilita; cerrar la aplica.
- Las decisiones se toman por atributo. Aceptar categoría no debe sobrescribir tipo o clasificación.
- Rechazos y anulaciones permanecen en el historial.
- El cierre aplica únicamente decisiones vigentes y confirmadas.
- El cierre es una operación atómica e idempotente: doble clic o repetición no deben duplicar efectos.
- Una reversión crea un evento compensatorio y conserva el original.
- Un conflicto por cambios concurrentes debe mostrarse como conflicto recuperable, no como fallo genérico.

### Importación y exportación

- La importación del maestro es un upsert por SKU; la ausencia de un artículo no implica baja.
- CSV y JSON siguen la misma validación.
- Una fila inválida, duplicada o fuera de diccionario rechaza el lote completo.
- La exportación final sólo existe para una campaña cerrada.
- Descargar varias veces debe producir el mismo contenido y no modificar datos.
- Los cambios aplicados y las altas desconocidas se exportan por separado.
- El resultado actual son tres TXT de atributos más un resumen. Un paquete ZIP único es una posibilidad futura, no una capacidad comprometida.

## 6. Arquitectura de información propuesta

La app debería tener un shell común con marca, estado de campaña, identidad de sesión, sucursal y salida. Dentro de ese shell, la navegación cambia por rol.

### Navegación del operador

1. Escanear
2. Ayuda breve / estado de conexión

El catálogo completo puede estar disponible si se confirma que el operador lo necesita; no debe distraer del circuito de escaneo.

### Navegación del revisor

1. Bandeja de revisión
2. Desconocidos
3. Confirmación
4. Consolidación
5. Auditoría

### Navegación del administrador

1. Resumen operativo
2. Revisión
3. Campañas
4. Maestro y diccionarios
5. Usuarios y sucursales
6. Auditoría
7. Cierres y exportaciones

En desktop conviene una barra lateral persistente. En 360–390 px conviene navegación inferior para los destinos principales y un menú de “Más” para administración. La pantalla de escaneo debe priorizar el contenido y no perder espacio vertical con navegación sobredimensionada.

## 7. Inventario de pantallas del prototipo

### P01 — Inicio de sesión

**Objetivo:** autenticar una cuenta individual y llevarla a su espacio según rol.

Contenido:

- marca y explicación de una línea;
- usuario y contraseña;
- acción “Ingresar”;
- estado enviando;
- error de credenciales;
- error de conexión diferenciado;
- aviso de sesión vencida cuando corresponda.

No pedir sucursal: se deriva de la cuenta. No usar email como requisito visual si el identificador real es username.

### P02 — Escaneo operativo

**Objetivo:** registrar muchos artículos con mínima fricción y máxima claridad.

Jerarquía recomendada:

1. campaña activa y sucursal;
2. campo de SKU con foco;
3. acción de validar;
4. resultado del artículo;
5. comparación de atributos;
6. edición de observación cuando aplica;
7. acción “Registrar observación”;
8. confirmación y regreso automático al foco.

Estados del SKU:

| Estado | Presentación y acción |
|---|---|
| Coincide con alcance | Mostrar ficha compacta y permitir registrar verificación. |
| Requiere revisión | Resaltar atributos actuales y permitir proponer uno o varios cambios. |
| No está en el snapshot | Explicar que es un SKU desconocido y exigir los tres atributos. |
| Sufijo `#/$` | Avisar qué parte se usará como SKU base y pedir confirmación implícita antes de guardar. |
| Inválido | Explicar la regla alfanumérica sin borrar el valor ingresado. |
| Modificado después de validar | Bloquear guardado y exigir revalidación. |

Comportamientos críticos:

- aceptar Enter desde lector;
- foco inicial y posterior a cada guardado;
- botones grandes y alcanzables;
- no abrir un modal después de cada escaneo exitoso;
- conservar los datos editados ante un error recuperable;
- evitar doble envío mientras se guarda;
- mostrar “observación registrada”, nunca “cambio aplicado”;
- informar si el backend está despertando o tarda, sin convertirlo en “sin datos”.

### P03 — Resumen operativo

**Objetivo:** dar al revisor o administrador una lectura rápida de la campaña.

Tarjetas posibles:

- campaña y estado;
- sucursales participantes / esperadas;
- SKUs observados;
- SKUs verificados sin cambio;
- SKUs con propuestas;
- pendientes de decisión;
- desconocidos pendientes;
- conflictos y empates;
- listos para confirmar;
- fecha/hora de última actividad.

Agregar accesos contextuales: “Revisar pendientes”, “Resolver desconocidos”, “Ver conflictos”. Las métricas de productividad deben evitar rankings punitivos como foco principal; los conteos por usuario pertenecen a auditoría operativa.

### P04 — Bandeja de revisión

**Objetivo:** priorizar y recorrer SKUs que requieren decisión.

Filtros:

- campaña;
- SKU o descripción;
- estado de decisión;
- sólo diferencias;
- estado de consenso;
- atributo afectado;
- sucursales participantes;
- desconocidos / conocidos.

Cada fila o tarjeta debe mostrar:

- SKU y descripción;
- cantidad de atributos con diferencia;
- estado general;
- consenso resumido por atributo;
- cantidad de sucursales observantes;
- última actividad;
- señal de conflicto, empate o falta de observación;
- acción “Revisar”.

Usar paginación o carga controlada. El diseño no debe asumir que toda la campaña cabe en memoria ni en una tabla única.

### P05 — Detalle de revisión de un SKU

**Objetivo:** decidir cada atributo con suficiente evidencia y sin mezclar unidades.

Encabezado:

- SKU, descripción, campaña y estado;
- snapshot original;
- indicador de SKU conocido/desconocido;
- navegación anterior/siguiente que respete los filtros.

Para cada atributo —categoría, tipo, clasificación— mostrar un bloque independiente:

- valor del snapshot;
- propuestas disponibles;
- nombre y código de cada valor;
- cantidad de sucursales que sostienen la propuesta;
- porcentaje sobre observantes;
- estado consenso/conflicto/empate;
- lista de sucursales y última observación, accesible bajo detalle;
- decisión vigente;
- acciones “Aceptar propuesta”, “Mantener original” y “Rechazar cambio”.

Acciones de página:

- guardar decisión;
- guardar y abrir siguiente;
- enviar a confirmación cuando los tres atributos estén resueltos;
- devolver o dejar pendiente con nota opcional.

Si el dato cambió después de abrir la pantalla, mostrar un conflicto con opciones de recargar y volver a decidir. No sobrescribir silenciosamente.

### P06 — Gestión de SKUs desconocidos

**Objetivo:** resolver artículos que no estaban en el snapshot.

Vista de bandeja con:

- SKU normalizado y lectura original;
- cantidad de apariciones;
- primera y última observación;
- sucursales observantes;
- propuesta de los tres atributos;
- estado: pendiente, aprobado, rechazado o fusionado.

Detalle y acciones:

- completar categoría, tipo y clasificación con selectores buscables;
- aprobar como alta;
- rechazar con motivo;
- fusionar con un SKU existente, mostrando claramente el destino;
- conservar historial de decisiones terminales.

No permitir que una acción genérica de “mover” convierta un rechazado o fusionado en aprobado.

### P07 — Confirmación

**Objetivo:** revisar el conjunto que está por quedar habilitado para el cierre.

Mostrar por SKU:

- tipo de caso: cambio, verificación o alta;
- atributos que cambian, con antes y después;
- atributos verificados sin cambio;
- estado de completitud;
- quién tomó la última decisión;
- acción explícita “Confirmar” o “Volver a evaluación”.

Evitar controles ambiguos como switches que parezcan selección múltiple si en realidad eligen destino. Si hay selección masiva, incluir checkbox real, contador y alcance de la acción.

### P08 — Consolidación y cierre

**Objetivo:** hacer visible exactamente qué ocurrirá antes de la acción irreversible de negocio.

Resumen previo:

- campaña;
- cantidad de SKUs y atributos a actualizar;
- verificaciones sin cambio;
- altas desconocidas;
- pendientes excluidos;
- rechazos preservados;
- conflictos que bloquean;
- desglose por categoría/tipo/clasificación.

La acción “Cerrar campaña y aplicar” es exclusiva de ADMIN y requiere confirmación fuerte. La confirmación debe explicar:

- sólo se aplicarán decisiones vigentes y confirmadas;
- la campaña quedará cerrada y no podrá reactivarse normalmente;
- el cierre no debe repetirse aunque la respuesta de red se demore;
- las exportaciones se habilitarán al finalizar.

Durante el cierre, no sugerir reintento automático. Si hay timeout, mostrar estado “Resultado incierto: consultando estado de la campaña” y verificar antes de ofrecer otra acción.

### P09 — Resultado de cierre y exportaciones

**Objetivo:** entregar una evidencia clara, repetible y descargable.

Contenido:

- campaña cerrada, fecha/hora y actor;
- resumen de aplicados, altas, pendientes, rechazos y fusionados;
- descargas de categoría TXT, tipo TXT, clasificación TXT y resumen TXT;
- descarga de CSV de auditoría si corresponde;
- explicación de que volver a descargar no modifica el cierre;
- historial de reversión o enlace a decisiones aplicadas.

Las altas desconocidas aplicadas deben distinguirse de los cambios sobre artículos existentes.

### P10 — Campañas

**Objetivo:** configurar y gobernar el ciclo de revisión.

Listado:

- nombre;
- estado: borrador, activa, cerrando o cerrada;
- fechas informativas;
- filtros objetivo;
- tamaño del snapshot cuando exista;
- progreso operativo;
- acciones permitidas según estado.

Creación/edición:

- nombre;
- fecha de inicio y fin;
- filtros opcionales usando diccionarios, no campos libres;
- vista previa del alcance estimado;
- guardar borrador.

Activación:

- confirmar que se congelará el snapshot;
- advertir si ya hay otra campaña activa;
- mostrar resultado y fecha de activación.

Una campaña activada no debe ofrecer edición normal de sus reglas. Una campaña cerrada debe ser de consulta.

### P11 — Maestro y diccionarios

**Objetivo:** consultar y preparar la fuente de datos.

Subsecciones:

- catálogo maestro paginado, con búsqueda por SKU o descripción;
- categorías;
- tipos;
- clasificaciones;
- importación;
- exportación de copia.

La tabla del maestro muestra código y nombre legible de cada atributo, no sólo badges numéricos.

### P12 — Importación

**Objetivo:** cargar archivos con seguridad y previsibilidad.

Flujo de prototipo recomendado:

1. elegir archivos;
2. analizar;
3. mostrar resumen de validación;
4. confirmar importación;
5. mostrar resultado.

Aunque la implementación actual pre-valida y rechaza el lote, el frontend todavía necesita una experiencia de preview rica. El prototipo debe mostrar:

- archivo, tamaño, encoding/delimitador detectado;
- cantidad total, válidas, inválidas y duplicadas;
- errores por fila con exportación del informe;
- aviso de que los ausentes no se eliminarán;
- indicación “todo o nada”;
- bloqueo de confirmación si hay errores;
- resumen de altas y actualizaciones antes de ejecutar.

Formatos canónicos:

- maestro: `sku,descripcion,categoria_cod,tipo_cod,clasif_cod`;
- diccionarios: `cod,nombre`.

La app también acepta variantes legibles heredadas. La exportación CSV usa UTF-8 con BOM; la entrada admite UTF-8, UTF-8 con BOM y Latin-1, con coma, punto y coma o tabulador.

### P13 — Auditoría

**Objetivo:** explicar discrepancias, participación y decisiones.

Vistas:

- discrepancias contra snapshot/maestro;
- conflictos entre sucursales;
- actividad por usuario y sucursal;
- decisiones y actores;
- evolución del SKU;
- exportación CSV.

KPIs existentes y válidos como base:

- SKUs escaneados;
- SKUs verificados;
- SKUs con sugerencias;
- atributos aceptados;
- discrepancias contra maestro;
- conflictos entre sucursales.

Toda tasa debe mostrar su unidad y base. Ejemplo: “6 de 7 sucursales observantes · 86%”, no sólo “86%”. Un empate 1 contra 1 debe ser visible.

### P14 — Usuarios y sucursales

**Objetivo:** administrar identidad y alcance operativo. El backend ya ofrece esta capacidad; la interfaz actual todavía no tiene el módulo.

Sucursales:

- código único;
- nombre;
- activa/inactiva;
- cantidad de usuarios.

Usuarios:

- username;
- nombre visible;
- rol;
- sucursal;
- estado activo/inactivo;
- restablecer contraseña;
- revocar sesiones como consecuencia del cambio de contraseña.

Reglas visuales:

- OPERADOR requiere sucursal;
- distinguir desactivar de eliminar;
- advertir que restablecer contraseña cerrará sesiones activas;
- no mostrar ni registrar contraseñas existentes.

### P15 — Catálogo de consulta

**Objetivo:** permitir búsqueda segura del maestro sin entrar al flujo de importación.

Estados completos:

- carga;
- resultados;
- sin coincidencias;
- maestro realmente vacío;
- error de servicio;
- reintento.

Nunca representar un error como “Total: 0”.

## 8. Estados transversales obligatorios

Cada pantalla que obtiene datos debe diseñar explícitamente:

| Estado | Requisito |
|---|---|
| Inicial | Explicar qué debe hacer el usuario. |
| Cargando | Skeleton o indicador localizado; evitar bloquear toda la app sin necesidad. |
| Vacío | Explicar que la consulta fue exitosa y no encontró datos. |
| Sin resultados | Mantener filtros visibles y ofrecer limpiarlos. |
| Error recuperable | Decir qué falló, conservar datos y ofrecer reintento. |
| Sin conexión | Indicar conectividad; no prometer que la acción no llegó al servidor. |
| Sesión vencida | Preservar contexto seguro, pedir reingreso y volver al destino. |
| Sin permiso | Explicar el rol requerido sin revelar información sensible. |
| Conflicto 409 | Informar que otro actor o estado cambió; recargar antes de decidir. |
| Validación 4xx | Asociar el error con el campo o fila. |
| Éxito | Confirmar el efecto real y el siguiente paso. |
| Respuesta obsoleta | Ignorarla; nunca reemplazar datos de la selección actual. |

No implementar una cola offline en el prototipo como si fuera una capacidad real. Puede explorarse como concepto separado, porque aún falta definir conflictos, expiración de campaña y comunicación del estado de sincronización.

## 9. Dirección UX/UI sugerida

### Personalidad

La interfaz debe sentirse operativa, sobria y confiable. Es una herramienta de trabajo repetitivo y decisiones auditables, no un dashboard decorativo.

Palabras guía:

- clara;
- rápida;
- precisa;
- trazable;
- serena ante errores;
- densa sólo cuando la tarea lo exige.

### Sistema visual

- Base neutra de alto contraste.
- Un color primario para navegación y acciones normales.
- Verde sólo para éxito o coincidencia confirmada.
- Ámbar para revisión, atención o estado incompleto.
- Rojo para rechazo, conflicto bloqueante o acción destructiva.
- Azul/gris para información y estados neutrales.
- No comunicar estado sólo por color: sumar texto e icono.
- Tipografía sans serif legible; números y códigos con variante monoespaciada cuando ayude a comparar.
- Espaciado compacto en tablas y cómodo en acciones de escaneo.

### Componentes clave

- app shell por rol;
- selector/indicador de campaña;
- input de escaneo persistente;
- ficha de SKU;
- bloque comparador “antes / propuesta / decisión”;
- badge de estado con texto;
- medidor de consenso con base numérica;
- tabla responsive con versión tarjeta móvil;
- filtros persistentes;
- banner de conexión/sesión;
- timeline de auditoría;
- diálogo de confirmación de alto impacto;
- toast para éxito no bloqueante;
- panel de error accionable.

### Responsive

- Escaneo: mobile-first en 360–390 px y usable con una mano o lector.
- Revisión, auditoría e importación: desktop-first, con versión tablet funcional.
- Las tablas complejas no deben comprimirse hasta ser ilegibles: en mobile usar tarjetas, detalle progresivo o scroll con primera columna fija.

### Accesibilidad

- operación completa por teclado;
- foco visible;
- orden de tabulación lógico;
- labels persistentes, no sólo placeholders;
- mensajes anunciables con `aria-live` según prioridad;
- contraste WCAG AA como mínimo;
- targets táctiles de al menos 44 × 44 px;
- confirmaciones que devuelvan foco al lugar correcto;
- no secuestrar el foco salvo en el modo de escaneo intencional.

## 10. Microcopy y terminología

Usar consistentemente:

- “Registrar observación” en la pantalla de escaneo.
- “Aceptar propuesta” o “Mantener valor actual” en revisión.
- “Enviar a confirmación” al avanzar el flujo.
- “Cerrar campaña y aplicar” sólo en el cierre administrativo.
- “Anular propuesta” para descartar una pendiente.
- “Revertir cambio aplicado” para crear una compensación.
- “SKU desconocido” para un artículo fuera del snapshot.

Evitar:

- “Aplicar cambios” durante escaneo;
- “Deshacer” si no se explica si anula, archiva o revierte;
- “Sin datos” ante timeout o error;
- “Votos” sin aclarar que representan sucursales observantes en las métricas de consenso;
- “Activo/inactivo” como único estado visible de campaña, porque existen borrador, cerrando y cerrada.

Formato de errores recomendado:

1. qué no se pudo hacer;
2. por qué, si es seguro explicarlo;
3. qué puede hacer ahora el usuario;
4. ID de solicitud en detalle técnico cuando exista.

## 11. Flujos que debe cubrir el prototipo navegable

### Flujo A — Operador, SKU conocido sin cambios

1. login como OPERADOR de Sucursal Centro;
2. campaña activa visible;
3. escanear `CAM1001`;
4. ver atributos actuales coincidentes;
5. registrar verificación;
6. recibir éxito y foco listo para el próximo SKU.

### Flujo B — Operador propone cambio con etiqueta

1. escanear `cam1002#LOTE9`;
2. aviso: se usará `CAM1002`;
3. el artículo requiere revisión;
4. proponer categoría `03`, mantener tipo y clasificación;
5. registrar observación;
6. simular pérdida de respuesta y reintento idempotente sin duplicado.

### Flujo C — SKU desconocido

1. escanear `NUEVO900`;
2. indicar que no estaba en el snapshot;
3. exigir categoría, tipo y clasificación válidas;
4. registrar;
5. mostrar estado “Pendiente de revisión como alta”.

### Flujo D — Revisor resuelve consenso y empate

1. abrir bandeja con dos pendientes;
2. SKU A: 6 de 7 sucursales coinciden en categoría;
3. SKU B: empate 1 contra 1 en tipo;
4. aceptar categoría de A;
5. decidir manualmente el tipo de B;
6. enviar ambos a confirmación.

### Flujo E — Revisor resuelve desconocido

1. abrir `NUEVO900`;
2. completar o corregir atributos;
3. aprobar como alta;
4. abrir otro desconocido y fusionarlo con `CAM1003`;
5. comprobar que ambos historiales quedan visibles.

### Flujo F — Conflicto concurrente

1. abrir detalle de `CAM1004`;
2. simular que otro revisor decide primero;
3. al guardar, mostrar conflicto 409;
4. recargar evidencia y volver a decidir;
5. no perder una nota todavía no enviada sin advertencia.

### Flujo G — Administrador crea y activa campaña

1. crear borrador con fechas y filtro de categoría;
2. ver vista previa de alcance;
3. guardar;
4. activar confirmando congelación del snapshot;
5. bloquear edición normal;
6. mostrarla como única campaña activa.

### Flujo H — Importación rechazada y corregida

1. seleccionar CSV de maestro;
2. análisis detecta un SKU duplicado y un código fuera de diccionario;
3. bloquear importación y descargar errores;
4. cargar archivo corregido;
5. mostrar altas/actualizaciones;
6. confirmar importación completa.

### Flujo I — Cierre y exportación

1. abrir consolidación;
2. revisar cambios, altas y exclusiones;
3. cerrar como ADMIN;
4. mostrar progreso sin habilitar doble envío;
5. recibir resultado cerrado;
6. descargar tres TXT y resumen;
7. descargar otra vez y explicar que el resultado es idéntico.

### Flujo J — Sesión vencida y API lenta

1. sesión vence durante una consulta;
2. pedir reingreso y restaurar el destino;
3. simular API fría/lenta;
4. diferenciar “conectando” de “campaña vacía”;
5. permitir reintento seguro sólo en lecturas.

## 12. Datos de demostración recomendados

Crear fixtures puramente ficticios:

- 1 campaña activa: “Revisión Primavera 2026”;
- 1 campaña borrador y 1 cerrada;
- 7 sucursales: Centro, Norte, Sur, Este, Oeste, Depósito y Outlet;
- 3 usuarios demo: operador, revisor y administrador;
- 12–20 SKUs conocidos;
- 3 SKUs desconocidos;
- casos de sin cambio, un atributo cambiado, tres atributos cambiados, consenso 7/7, consenso 6/7, conflicto 4/3, empate 1/1 y sin observación;
- una decisión concurrente simulada;
- una campaña cerrada con exportaciones disponibles.

No reutilizar credenciales productivas ni datos reales. Las contraseñas del prototipo deben ser claramente ficticias.

## 13. Mapa de integración disponible

El prototipo puede usar mocks con la misma forma conceptual que la API actual.

### Sesión y operación

| Capacidad | Método y ruta actual |
|---|---|
| Login | `POST /api/session/login` |
| Sesión actual | `GET /api/session` |
| Logout | `POST /api/session/logout` |
| Campañas | `GET /api/campanias` |
| Diccionarios | `GET /api/diccionarios` |
| Maestro paginado | `GET /api/maestro` |
| SKU en snapshot | `GET /api/campanias/:id/maestro/:sku` |
| Registrar observación | `POST /api/escaneos` |

### Revisión y administración

| Capacidad | Ruta base actual |
|---|---|
| Revisiones y decisión | `/api/admin/revisiones` |
| Confirmaciones y etapas | `/api/admin/confirmaciones`, `/api/admin/etapas/mover` |
| Desconocidos | `/api/admin/desconocidos`, `/api/admin/unknowns` |
| Consolidación y cierre | `/api/admin/consolidacion/*`, `/api/admin/campanias/:id/cerrar` |
| Campañas | `/api/admin/campanias` |
| Importación | `/api/admin/diccionarios/import-file`, `/api/admin/maestro/import-file` |
| Exportaciones | `/api/admin/export/*` |
| Auditoría | `/api/admin/discrepancias*`, `/api/admin/auditoria/resumen` |
| Usuarios | `/api/admin/usuarios` |
| Sucursales | `/api/admin/sucursales` |

Las mutaciones usan cookie de sesión `HttpOnly`; el frontend no debe guardar tokens en `localStorage` ni enviar actor/sucursal como fuente de verdad.

## 14. Capacidad actual, oportunidad de prototipo y futuro no comprometido

### Ya implementado o respaldado por API

- cuentas, roles, sucursales, sesión revocable y logout;
- campañas con snapshot, activación única y cierre;
- escaneo idempotente;
- SKU conocido/desconocido;
- decisiones por atributo y detección de conflictos;
- confirmación, consolidación, cierre y reversión;
- importación atómica validada;
- exportaciones finales repetibles;
- consenso por última observación válida de cada sucursal;
- métricas y auditoría;
- catálogo paginado;
- manejo de respuestas obsoletas en escaneo y revisiones.

### Existe en backend pero falta o está incompleto en frontend

- administración de usuarios y sucursales;
- experiencia clara de estados y permisos por rol;
- preview completo de importación con errores por fila;
- navegación coherente y shell unificado;
- tratamiento visual completo de campañas borrador/cerrando/cerradas;
- recuperación de sesión expirada;
- vista de cierre/exportación como resultado durable;
- paginación y filtros server-side completos para revisión;
- auditoría visual responsive y accesible.

### Posibilidades futuras que pueden explorarse, sin presentarlas como construidas

- paquete ZIP único de exportación;
- cola offline de escaneos con resolución de conflictos;
- lectura por cámara móvil;
- notificaciones de campaña o pendientes;
- comparación histórica entre campañas;
- metas y cobertura por sucursal;
- soporte PWA;
- dominios frontend/API bajo el mismo sitio;
- actualización en tiempo real de colas;
- escaneo de múltiples códigos o lotes.

### Riesgos y límites todavía relevantes

- no hay prueba visual completa en 360–390 px;
- no se probó un lector físico;
- no se midió aún carga objetivo con 7.594 SKUs, aproximadamente 53.158 observaciones y 14–21 sesiones concurrentes;
- el hosting gratuito puede tener demora de arranque;
- faltan cierre de runtime/dependencias/CI y operación de backup/restore;
- falta validar cookies/sesión en todos los navegadores y dispositivos reales;
- no se debe afirmar preparación completa para las siete sucursales hasta completar piloto y criterios P0/P1.

## 15. Decisiones de producto aún abiertas

El prototipo puede presentar alternativas, pero debe marcarlas como hipótesis:

- ¿El operador necesita consultar el catálogo completo o sólo el SKU actual?
- ¿Se requiere agregar una nota del operador a la observación?
- ¿Qué información puede ver una sucursal sobre observaciones de otras sucursales?
- ¿La confirmación se hará por SKU, en lote o con ambos modos?
- ¿Qué permisos exactos tiene REVISOR dentro de auditoría?
- ¿Se necesita un paquete ZIP además de las cuatro descargas actuales?
- ¿Se necesita operación offline? Si sí, ¿cuánto tiempo puede quedar pendiente un escaneo?
- ¿Qué navegadores, lectores y tamaños de pantalla usarán realmente las sucursales?
- ¿Cuál es el procedimiento cuando una campaña vence por fecha pero sigue activa, dado que hoy las fechas son informativas?
- ¿Qué nombres y códigos reales usarán las siete sucursales?

## 16. Criterios de aceptación del prototipo

El prototipo se considera completo cuando:

- permite recorrer los diez flujos de la sección 11;
- diferencia claramente OPERADOR, REVISOR y ADMIN;
- incluye las quince pantallas o una justificación de consolidación;
- representa carga, vacío, error, sin conexión, sesión vencida, permiso insuficiente, conflicto y éxito;
- usa observación, decisión, confirmación, aplicación y exportación como acciones distintas;
- representa decisiones por atributo;
- muestra consenso con cantidad de sucursales y base del porcentaje;
- conserva el dato ingresado ante errores recuperables;
- permite operar el escaneo por teclado en viewport móvil;
- evita tablas ilegibles en 360–390 px;
- presenta el cierre como acción administrativa de alto impacto;
- separa capacidad actual de ideas futuras;
- no usa datos ni credenciales reales;
- incluye anotaciones para que desarrollo identifique componentes, permisos y contratos requeridos.

## 17. Entregables sugeridos al desarrollador frontend

1. mapa de navegación por rol;
2. prototipo navegable desktop y mobile de los flujos prioritarios;
3. librería de componentes y estados;
4. tabla de permisos por ruta/acción;
5. fixtures y respuestas mock por escenario;
6. inventario de errores y microcopy;
7. especificación responsive;
8. checklist de accesibilidad;
9. matriz pantalla → endpoint → estado;
10. lista separada de hipótesis y decisiones pendientes.

## 18. Prioridad recomendada de diseño

### Núcleo P0 del prototipo

- login y sesión;
- escaneo operativo;
- bandeja y detalle de revisión;
- desconocidos;
- confirmación;
- consolidación/cierre;
- resultado y exportaciones.

### Administración P1

- campañas;
- maestro/diccionarios e importación;
- auditoría;
- usuarios/sucursales.

### Exploración P2

- resumen ejecutivo avanzado;
- históricos entre campañas;
- ZIP, PWA, cámara y offline;
- personalización de métricas y notificaciones.

Esta priorización mantiene visible el propósito real de la app: capturar evidencia rápidamente y convertirla, mediante revisión y control, en un cambio de catálogo confiable.
