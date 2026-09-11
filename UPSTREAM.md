# Upstream

| Campo | Valor |
|---|---|
| Repo upstream actual | https://github.com/IAbyLio/calculadora-de-presupuestos-fyj |
| Origen historico | https://github.com/IAbyLio/agency-hue-site (build inicial Lovable, abandonado el 2026-05-07) |
| Commit SHA del clone Lovable original | `c1ad0ad7ec81e770def2aad7ae89bb1a35516260` (fecha upstream 2025-12-24) |
| Modo | vendored en monorepo F&J + repo standalone propio |

## Como funciona hoy

El codigo vive en el monorepo F&J (`web/agencia/calculadora-de-presupuestos-fyj/`). El repo standalone de GitHub (`IAbyLio/calculadora-de-presupuestos-fyj`) sirve dos propositos:

1. **JSDelivr CDN** para el bundle production que GHL Sites consume:
   - JS: `https://cdn.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.js`
   - CSS: `https://cdn.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.css`
2. **Source of truth publico** del proyecto.

Lovable y el repo viejo `agency-hue-site` quedaron deprecated el 2026-05-07. Ya no se sincroniza con Lovable.

## Workflow para actualizar el bundle production

Cada vez que se cambia codigo de la calc en el monorepo y queremos que GHL Sites refleje el cambio:

1. `npm run build` desde `web/agencia/calculadora-de-presupuestos-fyj/` (con `.env.local` presente: `VITE_LEAD_WEBHOOK_URL` se hornea en el bundle; comprobar con `grep -c calc-lead-v2 dist/calc-app.js`).
2. QA local con el bundle compilado (`npx vite preview --port 4173` + `node pw-stories/calc-identity/identity.e2e.mjs`).
3. Clonar el repo standalone en `.tmp/calc-standalone/` (no hay clon permanente; `.tmp/` esta en .gitignore) y **comparar antes de copiar** (`diff -rq` excluyendo `node_modules`, `.env*`, `.git`, `dist`): si el repo aparte tiene cambios que el monorepo no tiene, parar.
4. Copiar el contenido del monorepo al clon (incluido `dist/`, excluyendo `node_modules` + `.env.local`), commit + push.
5. JSDelivr cachea hasta 12h. Purge inmediato y comprobar que sirve el hash nuevo:
   ```
   curl https://purge.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.js
   curl https://purge.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.css
   curl -s https://cdn.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.js | shasum -a 256
   ```
6. Verificar en produccion: `node pw-stories/calc-identity/identity.e2e.mjs --prod --base https://adscelerator.es/calculadora-de-presupuestos/app` (bloquea n8n y Facebook con `page.route`; no crea contactos).

## Contrato de identidad (`?k=` / `fyj_cid`)

Desde la publicacion del 2026-09-11 la calculadora reconoce al contacto conocido con el mismo contrato que la checklist, los 50 formatos y el hub de recursos (`src/lib/contactIdentity.ts`, detalle en `README.md`): `?k=<contact_id>` valido (`^[A-Za-z0-9_-]{1,64}$`) → `localStorage.fyj_cid = {id, ts}` (90 dias), `k` fuera de la URL conservando query y hash. Con identidad y sin registro previo, exportar no abre el modal y manda un unico `lead_submitted` por id con `contact_id` en la raiz (fire-and-forget, sin evento de conversion del pixel). El webhook `/calc-lead-v2` acepta ese POST sin email desde el 2026-09-11 (`resolved:false` si el contacto no existe).

## Historial de publicaciones

| Fecha | Commit repo aparte | Cambio |
|---|---|---|
| 2026-09-11 | ver `git log` del repo aparte | Contrato de identidad `?k=` / `fyj_cid`; registro recordado en `localStorage`. |
| 2026-05-10 | `a0c2f43` | Campo Nombre, sin evento Lead del pixel, nombre → `firstName` en GHL. |

## Auditoria historica

Ver `AUDIT.md` en esta misma carpeta para el informe priorizado de codigo, performance, publicacion actual y plan de la v2 (escrito 2026-05-01, varias recomendaciones ya aplicadas).
