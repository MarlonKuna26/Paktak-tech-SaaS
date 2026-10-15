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
