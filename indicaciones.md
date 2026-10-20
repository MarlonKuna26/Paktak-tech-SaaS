# 🚀 MASTER PLAN v2: "Paktak Tech – SaaS Gastronómico"

> Este archivo es la fuente de verdad del proyecto. Guárdalo en la raíz del repo como `MASTER_PLAN.md` y dile al agente que lo lea al inicio de CADA sesión.

---

## 0. ROL Y FORMA DE TRABAJO DEL AGENTE

Actúas como **CTO + Product Owner** de Paktak Tech. Tu trabajo no es solo escribir código: es ayudarme a construir un **negocio que genere ingresos recurrentes**, no un proyecto de universidad.

Reglas de trabajo:
1. **Una fase a la vez.** Yo te digo qué fase ejecutar. Al terminar: resumen de lo hecho, cómo probarlo, y **esperas mi confirmación**.
2. **Antes de codear cada fase**, escribe un plan de 5–10 líneas (archivos que tocarás, decisiones, riesgos) y espera mi "ok".
3. **Si algo es ambiguo, pregunta** (máximo 3 preguntas). No asumas en silencio.
4. **Todo supuesto de negocio se marca como `[HIPÓTESIS]`** y se agrega a `docs/validaciones.md` para comprobarlo con restaurantes reales. No inventes cifras de mercado: si no tienes fuente, dilo.
5. **Cada fase termina con un commit** con mensaje convencional (`feat:`, `fix:`, `chore:`) y con `docs/decisiones.md` actualizado (qué decidimos y por qué).

---

## 1. VISIÓN DE NEGOCIO (a completar y validar en Fase 0)

**Problema:** Los restaurantes pequeños y medianos de Ecuador manejan reservas por WhatsApp/llamadas, comandas en papel y cobro manual. Pierden pedidos, se confunden entre mesa y cocina, y los sistemas existentes fallan cuando se cae el internet o la luz.

**Propuesta de valor:** Un sistema que conecta reserva → mesa → mesero → cocina y **sigue funcionando cuando falla la red**. Soporte local por WhatsApp, precio en dólares accesible, sin hardware especial (cualquier celular/tablet).

**Cliente objetivo inicial (ICP):** restaurantes y cafeterías de 8–25 mesas en Ambato y ciudades cercanas, con 3–10 empleados, dueño presente en el local. `[HIPÓTESIS]`

**Diferenciadores:**
- Offline-first real en el módulo del mesero.
- Onboarding en menos de 1 día (el equipo de Paktak carga el menú por el cliente).
- Soporte humano por WhatsApp.
- Precio por restaurante (no por usuario ni por transacción). `[HIPÓTESIS]`

**Modelo de ingresos (a validar):**

| Plan | Precio mensual (USD) | Incluye |
|---|---|---|
| Básico | 19–25 | 1 local, hasta 10 mesas, reservas, mesero, cocina |
| Pro | 39–49 | Hasta 30 mesas, reportes, múltiples usuarios, soporte prioritario |
| Cadena | A medida | Varios locales, reportes consolidados |

Más cobro único de implementación (carga de menú + capacitación): 30–60 USD. `[HIPÓTESIS]`

**Costos fijos estimados al tener clientes pagando:** Supabase Pro + hosting de Next.js + dominio + monitoreo. Calcular punto de equilibrio en Fase 0 (cuántos restaurantes necesito para cubrir costos y para vivir de esto). Revisar los términos de los planes gratuitos: algunos prohíben uso comercial y Supabase pausa proyectos inactivos, así que el plan gratuito sirve solo para desarrollo y piloto.

---

## 2. CONTEXTO OPERATIVO

- **Flujo:** Cliente reserva por web → Host asigna mesa → Mesero toma orden en tablet/celular → KDS en cocina recibe la comanda → Mesero cierra cuenta.
- **No hay QR en mesa** (decisión tomada; no proponer).
- **Condición crítica Offline-First:** el módulo del mesero DEBE funcionar sin internet (IndexedDB/Dexie.js). Si se cae la red, guarda local; al volver, sincroniza en silencio con Supabase.
- **Límite honesto del offline:** si el local pierde internet, la comanda queda guardada pero **no llega a la cocina hasta que haya conexión**. Por eso el mesero debe ver un estado claro por comanda ("Guardada en este dispositivo / Enviada a cocina"), y en Fase 6 se documenta un plan B para cocina (ticket impreso o aviso verbal). Evaluar sincronización por red local solo después del MVP.

---

## 3. STACK TECNOLÓGICO ESTRICTO

- **Framework:** Next.js (App Router) + React 18+ + TypeScript (`strict: true`).
- **UI:** Tailwind CSS + shadcn/ui + Lucide Icons.
- **Backend y BD:** Supabase (PostgreSQL, RLS, Auth, Realtime).
- **Estado/Offline:** React Query (caché y reintentos) + Zustand + Dexie.js (IndexedDB).
- **Formularios:** React Hook Form + Zod.
- **Pruebas:** Vitest + Testing Library (unitarias) y Playwright (flujos críticos, incluido modo offline).
- **Monitoreo de errores:** Sentry (a partir de la Fase 11).
- **PWA/Service Worker:** necesitará una librería o un `sw.js` manual. **Propónme la opción y espera aprobación antes de instalar.**

Cualquier paquete fuera de esta lista requiere mi aprobación explícita, con justificación de por qué es necesario.

---

## 4. REGLAS ESTRICTAS DE CÓDIGO Y SEGURIDAD

1. **TypeScript estricto.** Prohibido `any`. Tipos en `types/` generados desde el esquema de Supabase (`supabase gen types`) cuando sea posible.
2. **Componentes pequeños y reutilizables** en `/components`. Lógica de datos en `/lib` y hooks en `/hooks`. Nada de lógica de negocio dentro de componentes de UI.
3. **Migraciones versionadas** en `/supabase/migrations/` (un archivo por cambio). Nunca cambios manuales en producción sin migración.
4. **Multi-tenant:** toda tabla de negocio tiene `restaurant_id` y **RLS activada**. El RLS es la ley: el frontend nunca es la barrera de seguridad.
5. **Secretos:** la `service_role` key JAMÁS va al cliente ni a variables `NEXT_PUBLIC_`. Solo en servidor (Route Handlers / Server Actions). `.env.local` nunca se commitea; mantener `.env.example`.
6. **Validación doble:** Zod en el cliente y validación/constraints en la base de datos.
7. **Dinero:** siempre en **centavos enteros** (`integer`), nunca `float`. Fechas en `timestamptz` (UTC) y mostradas en zona `America/Guayaquil`.
8. **Textos de interfaz en español** (Ecuador), código y nombres técnicos en inglés.
9. **Accesibilidad y móvil primero:** botones grandes (uso con una mano, manos mojadas), contraste alto, probar en pantalla de 360 px.
10. **Manejo de errores visible:** nada de fallos silenciosos; toasts claros y logs útiles.
11. **Definition of Done por tarea:** compila sin errores ni warnings de TS, lint limpio, probado manualmente, pruebas añadidas cuando hay lógica crítica (sync offline, RLS, cálculo de totales), README/decisiones actualizados.

---

## 5. MODELO DE DATOS v2 (SUPABASE)

Cambios respecto al borrador inicial: se agregan roles de personal, menú, pagos, auditoría y suscripciones; `order_items.product_id` ahora tiene tabla real; el `sync_status` **no vive en el servidor** (es un estado local de Dexie).

**Tenancy y usuarios**
- `restaurants`: id, name, slug (único), logo_url, timezone, currency, settings (JSONB), plan, status (`trial|active|suspended`), trial_ends_at, created_at.
- `staff_members`: id, user_id (FK auth.users), restaurant_id, role (`owner|admin|host|waiter|kitchen`), active, created_at. Un usuario puede pertenecer a más de un restaurante.

**Operación**
- `tables`: id, restaurant_id, table_number, capacity, status (`libre|ocupada|reservada`), zone (opcional). Único: (restaurant_id, table_number).
- `categories`: id, restaurant_id, name, sort_order, active.
- `products`: id, restaurant_id, category_id, name, description, price_cents, active, station (`cocina|barra`), created_at.
- `reservations`: id, restaurant_id, customer_name, customer_phone, date_time, guests, status (`pendiente|confirmada|cancelada|no_show|completada`), table_id (nullable), notes, source, created_at.
- `orders`: id (**UUID generado en el cliente**, para que funcione offline y sea idempotente), restaurant_id, table_id, waiter_id, order_number, subtotal_cents, tax_cents, tip_cents, total_cents, status (`abierta|pagada|cancelada`), opened_at, closed_at, device_id.
- `order_items`: id (UUID cliente), restaurant_id, order_id, product_id, product_name (copia), unit_price_cents (copia, para que cambios de precio no alteren cuentas pasadas), quantity, notes, status (`pendiente|preparando|listo|entregado`), created_at.
- `payments`: id, restaurant_id, order_id, method (`efectivo|transferencia|tarjeta|otro`), amount_cents, created_at.

**Negocio SaaS y control**
- `subscriptions`: restaurant_id, plan, status, current_period_end, payment_reference.
- `audit_log`: id, restaurant_id, user_id, action, entity, entity_id, payload (JSONB), created_at.

**RLS (obligatorio en cada tabla)**
- Función SQL auxiliar (`security definer`) que devuelva los `restaurant_id` del usuario autenticado a partir de `staff_members`.
- Políticas por rol (ej.: `kitchen` solo lee/actualiza `order_items`; `waiter` crea órdenes e items; `host` gestiona mesas y reservas; `owner/admin` todo su restaurante).
- **Reservas públicas:** NO abrir `INSERT` anónimo directo a la tabla. Pasar por un Route Handler o función RPC con validación Zod, límite de frecuencia (rate limit) y captcha (Cloudflare Turnstile u otro aprobado por mí).
- Entregar con el SQL un **script de pruebas de RLS** que demuestre que el restaurante A no puede leer ni escribir datos del restaurante B.

---

## 6. REGLAS DEL MODO OFFLINE (Fase 6, la más crítica)

1. IDs (UUID) generados en el cliente. El servidor usa `upsert` por `id` → reenviar una orden nunca la duplica.
2. Patrón **outbox**: cada acción (crear orden, agregar item, cambiar estado) se guarda en una cola en Dexie con `status: pending|sending|failed`, intentos y timestamp.
3. Reintentos con backoff exponencial; el evento `online` es una señal adicional, no la única (la red puede "estar conectada" sin internet real → verificar con una petición real).
4. **Política de conflictos:** los items son append-only; el estado de mesa lo decide el servidor ("server wins"); si dos meseros abren la misma mesa offline, mostrar aviso y pedir resolución al host.
5. Caché local del menú, mesas y del usuario para poder abrir la app sin conexión (PWA instalada).
6. Indicador permanente en UI: 🟢 en línea / 🔴 sin conexión / ⏳ N pendientes por enviar. Nunca perder datos sin avisar.
7. **Pruebas obligatorias** con Playwright simulando: sin red al crear orden, reconexión, cierre del navegador con cola pendiente, doble envío.
8. Antes de construir la UI completa, hacer un **spike técnico** (prototipo mínimo de 1 pantalla) para validar la sincronización. Es el mayor riesgo técnico del proyecto.

---

## 7. HOJA DE RUTA (ROADMAP)

### FASE 0: Documentación del negocio (SIN CÓDIGO) — HACER PRIMERO
Genera en `/docs/` estos documentos, claros y accionables, marcando como `[HIPÓTESIS]` todo lo no verificado:
- [ ] `01-vision-y-propuesta-de-valor.md` — problema, cliente, propuesta, diferenciadores.
- [ ] `02-mercado-y-competencia.md` — competidores en Ecuador y la región (tabla: precio, fortalezas, debilidades, si funcionan offline). Indica qué debo verificar yo en campo.
- [ ] `03-cliente-y-entrevistas.md` — perfil del cliente ideal + guion de 10 preguntas para entrevistar a 5–10 dueños de restaurantes.
- [ ] `04-modelo-de-negocio-y-precios.md` — planes, precios, costos fijos y variables, punto de equilibrio, proyección a 6 y 12 meses (escenario pesimista/base/optimista).
- [ ] `05-estrategia-go-to-market.md` — cómo conseguir los primeros 3 clientes piloto, luego 10: visitas presenciales, demo, WhatsApp, referidos; oferta de piloto con condiciones claras.
- [ ] `06-producto-mvp-y-alcance.md` — qué entra al MVP y qué NO (lista explícita de "fuera de alcance").
- [ ] `07-requisitos-legales-y-fiscales.md` — facturación electrónica SRI (la mayoría de restaurantes la necesita), protección de datos personales (LOPDP), términos y condiciones, política de privacidad, contrato de servicio. Señala qué debo consultar con un contador/abogado; no des esto como asesoría legal definitiva.
- [ ] `08-operacion-y-soporte.md` — onboarding de un restaurante paso a paso, horarios y canal de soporte, tiempos de respuesta, plan de contingencia si algo falla en hora pico.
- [ ] `09-riesgos.md` — matriz de riesgos (técnicos, de mercado, legales, de equipo) con mitigación.
- [ ] `10-metricas.md` — métricas clave: restaurantes activos, MRR, churn, comandas por día, tiempo de onboarding, % de comandas sincronizadas sin error.
- [ ] `11-plan-90-dias.md` — plan semana a semana hasta el primer cliente pagando.
- [ ] `validaciones.md` — lista viva de hipótesis por comprobar.

### FASE 1: Setup, Base de Datos y RLS
- [ ] Inicializar Next.js (TS strict) con Tailwind y shadcn/ui; ESLint + Prettier.
- [ ] Variables de entorno y `.env.example`.
- [x] Instalar `@supabase/supabase-js` y `@supabase/ssr`; clientes para servidor y navegador.
- [x] Migración SQL: esquema v2 completo + RLS por rol + datos semilla de 2 restaurantes de prueba.
- [x] Script de pruebas de aislamiento entre tenants.

### FASE 2: Autenticación, Roles y Layout
- [x] Login Email/Password (Supabase Auth); recuperación de contraseña.
- [x] Resolución del restaurante activo del usuario; protección de rutas por rol (middleware).
- [x] Layout del panel con sidebar según rol (Mesas, Menú, Cocina, Mesero, Reservas, Ajustes) — Cero errores 404.

### FASE 3: Gestión de Menú
- [x] CRUD de categorías y productos (precio en USD y centavos, activar/desactivar).
- [x] Importación inicial por CSV (para cargar el menú del cliente rápido).

### FASE 4: Reservas Públicas
- [x] Ruta `/[restaurant-slug]/reservar` con React Hook Form + Zod.
- [x] Validación de horarios y capacidad; protección anti-spam (rate limit + captcha).
- [x] Panel del restaurante para confirmar/cancelar reservas y asignación directa a mesas.

### FASE 5: Panel del Anfitrión (Host)
- [x] `/admin/mesas`: grid en tiempo real (Supabase Realtime filtrado por `restaurant_id`).
- [x] Cambiar estado de mesa (libre, ocupada), sentar clientes y asignar reserva a mesa.

### FASE 6: App del Mesero (Offline-First) — CRÍTICO
- [x] Spike técnico de sincronización (ver sección 6) y validación.
- [x] `/admin/mesero`: seleccionar mesa, agregar productos con notas, enviar comanda con UUIDs cliente.
- [ ] PWA instalable (service worker pendiente de aprobación). Caché de menú y mesas en Dexie: listo.
- [x] Outbox en Dexie, reintentos, indicador de estado, integración con el panel unificado de pedidos.

### FASE 7: KDS (Cocina)
- [x] `/admin/cocina`: tarjetas por mesa/orden en tiempo real, filtradas por `restaurant_id`.
- [x] Estados pendiente → preparando → listo, con tiempo transcurrido y alerta visual por demora.
- [x] Reconexión automática de Realtime y recarga del estado actual al reconectar.
- [x] Sonido/alerta al llegar una comanda nueva (Web Audio API sin dependencias externas).

### FASE 8: Cierre de Cuenta y Reportes Básicos
- [x] Ver cuenta de la mesa, división simple, propina opcional, registrar pago (efectivo/transferencia/tarjeta externa).
- [x] Reporte diario: ventas totales, por método de pago, productos más vendidos, comandas por hora.

### FASE 9: Onboarding SaaS y Landing
- [ ] Alta de nuevo restaurante (wizard: datos, mesas, menú, usuarios) con periodo de prueba.
- [ ] Landing comercial de Paktak Tech (propuesta, precios, formulario de contacto, botón WhatsApp).
- [ ] Control de plan y estado de suscripción (suspender acceso por impago, con aviso previo).

### FASE 10: Facturación Electrónica (post-MVP)
- [ ] Evaluar integración con un proveedor autorizado de facturación SRI vs. desarrollo propio. Entregar comparación de costo/riesgo antes de decidir.

### FASE 11: Piloto, Calidad y Salida a Producción
- [ ] Piloto con 2–3 restaurantes reales (con acuerdo claro de duración y feedback semanal).
- [ ] Sentry, respaldos de BD verificados, checklist de seguridad (RLS, secretos, headers), prueba de carga básica.
- [ ] Manual de usuario corto por rol (mesero, cocina, host) con capturas o video.
- [ ] Plan de contingencia: qué hace el restaurante si el sistema cae.

---

## 8. RIESGOS PRINCIPALES (vigilar siempre)

| Riesgo | Mitigación |
|---|---|
| El offline falla o duplica órdenes | IDs cliente + upsert idempotente + spike temprano + pruebas Playwright |
| Fuga de datos entre restaurantes | RLS en todas las tablas + pruebas de aislamiento por fase |
| Nadie paga por el producto | Entrevistas y piloto antes de construir todo; validar precio |
| Cocina sin ver comandas cuando no hay red | Plan B documentado; evaluar red local post-MVP |
| Requisitos fiscales (SRI) bloquean ventas | Documentar en Fase 0; Fase 10 con proveedor autorizado |
| Soporte consume todo mi tiempo | Onboarding estandarizado, manuales, horarios de soporte |
| Spam/abuso en reservas públicas | Rate limit + captcha + validación en servidor |

---

## 9. PRIMERA INSTRUCCIÓN

Lee este documento completo. Luego responde SOLO con:
1. Un resumen de lo que entendiste en máximo 10 líneas.
2. Las dudas o inconsistencias que detectes (máximo 5).
3. Confirmación de que ejecutarás **la Fase 0** cuando yo lo indique.

No escribas código ni documentos hasta que yo apruebe.