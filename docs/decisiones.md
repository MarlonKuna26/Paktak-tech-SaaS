# Decisiones técnicas

## Fase 1 — Setup, base de datos y RLS

- Se usa Next.js con App Router, TypeScript estricto, Tailwind CSS v4 y shadcn/ui.
- Supabase se integra con `@supabase/ssr`: el navegador usa únicamente la URL pública y la clave anon.
- No se crea un cliente con `service_role` en esta fase; esa clave quedará restringida a código de servidor cuando sea necesaria.
- Todas las tablas de negocio incluyen `restaurant_id` y tienen RLS habilitado.
- La autorización se centraliza en funciones SQL `security definer` que consultan `staff_members`.
- Las reservas públicas no tienen una política de inserción anónima; la futura ruta de reservas deberá validar, limitar frecuencia y aplicar captcha antes de insertar.
- Los identificadores de órdenes e ítems son UUID generados por el cliente y tienen claves primarias para permitir upsert idempotente durante la Fase 6.
- Los datos semilla contienen dos restaurantes aislados y datos operativos mínimos para pruebas locales.

## Fase 2 — Autenticación, roles y layout

- La sesión se valida con `supabase.auth.getUser()` en servidor; el proxy solo refresca cookies y protege `/admin`.
- Las rutas de autenticación usan el cliente de navegador y las rutas de callback usan el cliente de servidor.
- El restaurante activo se resuelve por la primera membresía activa ordenada por creación; la selección explícita de múltiples restaurantes queda para una iteración posterior.
- El panel no se renderiza para usuarios autenticados sin una membresía activa en `staff_members`.
- La navegación del panel se filtra por rol en la interfaz, pero la autorización real continúa en RLS.
- Se usa la convención `proxy.ts` de Next.js 16 y un límite dinámico dentro de `Suspense` para compatibilidad con Cache Components.

## Fases 3 y 4 — Menú y reservas

- Los precios se capturan y almacenan siempre en centavos enteros; la importación CSV requiere `name` y `price_cents`.
- El CRUD del menú usa el cliente de navegador y depende de las políticas RLS para autorizar owner/admin.
- Las reservas públicas se reciben en un Route Handler y se insertan mediante `create_public_reservation`; no existe `INSERT` anónimo directo sobre `reservations`.
- La función RPC valida restaurante activo, fecha futura, datos básicos, capacidad total y duplicados recientes por teléfono.
- El rate limit inicial es por IP en memoria del proceso; para producción debe migrarse a un almacenamiento distribuido.
- Cloudflare Turnstile se valida cuando existe `TURNSTILE_SECRET_KEY`; en local puede probarse sin captcha. Antes de producción se debe configurar el widget y sus variables.
- El flujo público es de pedido con carrito en `/[restaurant-slug]/pedir`; no reserva mesas.
- Las solicitudes públicas usan `public_order_requests` y `public_order_items`, porque las órdenes internas requieren mesa y mesero asignados.
- El total se recalcula en la función SQL con precios vigentes; el cliente nunca puede imponer precios.
- El API consolida líneas repetidas del mismo producto antes de enviarlas a la base; el carrito permite aumentar cantidades sin producir duplicados.

## Fases 5 y 6 — Host, Mesero Offline y Conexión de Flujo

- El panel de control de salón (`/admin/mesas`) se conecta en tiempo real por Supabase Realtime para reflejar instantáneamente mesas libres, ocupadas y asignaciones de reservas.
- La app del mesero (`/admin/mesero`) opera bajo arquitectura Outbox en Dexie.js (IndexedDB): genera UUIDs cliente idempotentes y cola local con reintentos y sondeo real de internet mediante `/api/mesero/ping`.
- Se implementó la unificación en `/admin/pedidos`: ahora se leen en paralelo tanto las solicitudes públicas (`public_order_requests`) como las comandas de mesa tomadas por meseros (`orders` + `order_items`), resolviendo la visibilidad del salón en tiempo real.
- Se implementó la pantalla de ajustes del restaurante en `/admin/ajustes` y la estación base en `/admin/cocina` para asegurar 0 rutas huérfanas (0 errores 404) en la barra de navegación.
- Se corrigieron los efectos asíncronos y ciclo de renderizado para compatibilidad con el compilador de React 19 y Next.js 16.

## Fase 7 — KDS (Cocina y Barra en Tiempo Real)

- Migración `20261020090000_kds_realtime_sync.sql`:
  - Se añadieron `station` y `status_changed_at` a `order_items`.
  - Se agregaron las tablas `orders` y `order_items` a la publicación `supabase_realtime`.
  - Se implementó la función RPC `waiter_sync_order` con advisory lock por restaurante para secuencias de número de orden sin colisión, cálculo estricto de precios en servidor desde `products` y actualización automática de estado de mesa a `ocupada`.
  - Se implementó la función RPC `kds_set_item_status` que valida transiciones permitidas por rol (`owner`, `admin`, `kitchen`, `waiter`) y solo sobre órdenes activas.
- KDS Board interactivo ([components/kds/kds-board.tsx]):
  - Tarjetas visuales de alto contraste ordenadas por tiempo de llegada (FIFO).
  - Semáforo de tiempo transcurrido (<10m normal, 10-20m advertencia amarilla, >20m rojo urgente).
  - Filtro por estación (Cocina, Barra, Todo el Salón).
  - Transiciones unitarias por ítem o masivas por comanda ("Marchar Todo", "Todo Listo").
  - Alerta sonora armónica sintetizada con Web Audio API para notificar nuevas comandas sin depender de archivos de audio externos.
  - Suscripción bidireccional a Supabase Realtime con reconexión automática y recarga en caliente.

## Fase 8 — Cierre de Cuenta, División, Propinas y Reportes Diarios

- Migración `20261020100000_table_checkout_and_reports.sql`:
  - Se implementó la función RPC `checkout_table_order` con seguridad transaccional:
    - Valida que la orden no esté previamente pagada o cancelada.
    - Aplica propina opcional (`p_tip_cents`) e inserta registro en la tabla `payments` asociando `restaurant_id`, `order_id`, `method`, `amount_cents` y `tip_cents`.
    - Actualiza el estado de la orden a `pagada` y fecha `closed_at = now()`.
    - Libera automáticamente la mesa asociada (`tables.status = 'libre'`) en una sola transacción atómica.
  - Se implementó la función RPC `get_daily_sales_report`:
    - Valida roles gerenciales (`owner`, `admin`).
    - Agrega ventas consolidadas del día en zona horaria local (`America/Guayaquil`).
    - Devuelve ticket promedio, desglose por método de pago (`efectivo`, `transferencia`, `tarjeta`), top 5 productos más vendidos y ritmo horario de comandas.
- Modal de Cobro de Mesa ([components/tables/table-checkout-modal.tsx]):
  - Calculadora interactiva de propinas (0%, 5%, 10%, 15%, o monto personalizado en dólares).
  - División equitativa de cuenta por número de personas (2 a 12 comensales) mostrando la cuota exacta por persona.
  - Calculadora de cambio en efectivo al ingresar el monto entregado por el cliente.
  - Impresión directa de ticket térmico/comprobante de consumo de 80mm tras confirmar el cobro.
- Panel de Reportes y Cierre ([components/reports/daily-report-view.tsx] y `/admin/reportes`):
  - KPIs de venta total, número de órdenes, ticket promedio y dinero físico esperado en caja.
  - Gráfico horario visual de actividad para análisis de turnos pico.
  - Exportación de corte diario a archivo CSV y compatibilidad nativa con impresión en papel (`window.print()`).

## Fase 9 — Onboarding SaaS, Landing Comercial y Control de Suscripciones

- Migración `20261020120000_saas_onboarding.sql`:
  - Se implementó la función RPC `onboard_new_restaurant`:
    - Ejecución atómica y transaccional: crea el restaurante, asigna membresía `owner` al usuario autenticado, genera el plano inicial de mesas del salón (1 a N) y crea las categorías base del menú.
    - Asigna automáticamente el estado `trial`, plan `basic` y 14 días de prueba gratuita (`trial_ends_at = now() + interval '14 days'`).
  - Se implementó la función RPC `get_restaurant_subscription_status`:
    - Calcula en tiempo real los días restantes de prueba gratuita y el estado activo/suspendido.
- Landing Page Comercial ([app/page.tsx]):
  - Propuesta de valor clara para restaurantes en Ecuador/Latinoamérica con branding en dorado cálido (`#f3a806`) y modo oscuro.
  - Secciones interactivas: Hero, demostración en vivo de la tienda, módulos del sistema (Menú QR, KDS, Mesero Offline, Caja), tabla de precios (Básico $29, Pro $59, Multi-sucursal $99) y botón directo de contacto por WhatsApp.
- Asistente de Alta Interactiva ([components/onboarding/onboarding-wizard.tsx] y `/onboarding`):
  - Flujo guiado en 4 pasos: Datos del restaurante (nombre y slug autogenerado), selector visual de mesas, categorías iniciales del menú y activación de la cuenta de administrador con período de prueba sin tarjeta.
- Control de Suscripciones y Avisos de Vencimiento:
  - Integrado en [lib/auth/get-current-staff.ts] y [components/admin/admin-shell.tsx]:
  - Banner dinámico superior que notifica los días restantes de la prueba gratuita y muestra alerta preventiva si el período ha concluido con enlace directo a renovación.

## Separación Estricta de Roles y Flujo Operativo Cocina-Mesero

- **Aislamiento por Rol en Navegación y Páginas:**
  - `owner` / `admin`: Acceso completo a todos los módulos, creación y edición de mesas y menú.
  - `waiter`: Menú lateral restringido exclusivamente a **Mesas & Salón** y **App Mesero**. Al iniciar sesión es redirigido automáticamente a `/admin/mesero`.
  - `kitchen`: Menú lateral restringido únicamente a **KDS Cocina**. Al iniciar sesión es redirigido automáticamente a `/admin/cocina`.
  - `cashier`: Acceso a **Mesas & Salón**, **Pedidos & Cobros** y **Reportes & Cierre** para arqueo de caja.
  - Todas las páginas (`/admin/menu`, `/admin/ajustes`, `/admin/cocina`, `/admin/mesero`, `/admin/pedidos`, `/admin/reportes`) validan estrictamente el rol en el servidor para evitar accesos indebidos por URL.
- **Flujo de Comanda y Cobro por el Mesero:**
  - El mesero puede agendar la comanda para una mesa (offline/online) y enviarla directamente a cocina.
  - Se integró `TableCheckoutModal` dentro de la App del Mesero: al seleccionar una mesa ocupada, el mesero puede cobrar la cuenta directamente en salón (efectivo, transferencia, tarjeta), aplicar propinas y dividir la cuenta.
- **Alertas en Tiempo Real de Cocina a Mesero y Salón:**
  - Cuando el cocinero en el KDS avanza platos o comandas a estado `listo`:
    - En el mapa de mesas (`/admin/mesas`): la tarjeta de la mesa parpadea con borde esmeralda y muestra un badge animado `🔔 ¡Comida Lista para Servir!` con contador de platos listos.
    - En la App del Mesero (`/admin/mesero`): se dispara una alerta sonora armónica con Web Audio API (`playWaiterChime()`) y un banner persistente en la cabecera indicando la comanda lista para retirar y servir.

