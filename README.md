# Calculadora de Presupuesto Publicitario — F&J

Lead magnet de Flor y Julio Agencia: distribuye un presupuesto de publicidad por bloques y días, calcula anuncios por conjunto y exporta el plan en PDF/CSV.

- **Live**: `https://adscelerator.es/calculadora-de-presupuestos/app#/` (GHL Sites; el Custom Code element carga el bundle desde JSDelivr, ver `UPSTREAM.md`).
- **Stack**: Vite + React + TypeScript + shadcn/ui + Tailwind. Hash router (`#/`, `#/libre`, `#/gracias`).
- **Backend**: webhook n8n `/webhook/calc-lead-v2` (Workflow A `3nFERJj2WVCXk3SW` → Data Table `Calc-Presupuesto-Leads-v2` `5jqghi1rp6K5W2Qu`; Workflow B `sjid60AWSgNOzEjA` sincroniza a GHL cada hora). Detalle en `context/infra-n8n.md`.

## Desarrollo

```sh
npm i
cp .env.example .env.local   # rellenar VITE_LEAD_WEBHOOK_URL (se hornea en el bundle al compilar)
npm run dev                  # http://localhost:8080
npm run build                # dist/calc-app.js + dist/calc-app.css
npx vite preview --port 4173 # sirve dist/ para la QA
```

`.env.local` no se commitea. Sin `VITE_LEAD_WEBHOOK_URL` la captura corre en modo mock (console.info).

## Captura de leads

No hay gate al entrar: el modal de captura (`src/components/LeadCaptureModal.tsx`) salta **al exportar** PDF/CSV si no hay registro previo. Esa decisión está tomada: no es un gate de scroll.

Al registrarse por email se manda `lead_submitted` con `contact: {email, name}`; si el webhook no responde OK el modal muestra el error y la exportación no arranca. Tras el registro se navega a `#/gracias` (dispara `CompleteRegistration` del píxel) y desde ahí a `#/libre` (sin modal). El registro se recuerda en `localStorage` (`fyj_calc_lead_submitted_v1`); se sigue leyendo la misma clave en `sessionStorage`, donde vivía antes.

## Contacto conocido: el contrato de identidad (`?k=` / `fyj_cid`)

Contrato común a todos los lead magnets de F&J (checklist, 50 formatos, hub de recursos). Implementado en `src/lib/contactIdentity.ts`, compatible byte a byte con esas páginas:

| Regla | Detalle |
|---|---|
| Entrada | Los enlaces internos llegan con `?k=<contact_id>` de GHL. |
| Validación | `^[A-Za-z0-9_-]{1,64}$` (mismo regex que n8n). Un id inválido **no** se guarda. |
| Persistencia | `localStorage.fyj_cid = {"id","ts"}` (JSON). Caduca a 90 días; un valor corrupto o caducado se limpia al leer. |
| URL | `k` se quita con `history.replaceState` conservando el resto de la query y el hash (`/app?k=X&utm_source=…#/` → `/app?utm_source=…#/`). Se captura antes que las UTMs, así `landing_url` no lleva el id. |
| Sin `localStorage` | Todo en try/catch: la app funciona igual. |

Con `k` válido o `fyj_cid` vigente, **y sin registro previo**, al exportar:

- no se abre el modal;
- se manda **un único** `lead_submitted` por id (`fyj_calc_lead_identity_v1` recuerda el último id enviado), con `contact_id` en la raíz, `contact: {email: "", name: ""}`, `consent: true`, `custom_fields` como siempre (`landing_variant: "v1"`, `lead_magnet`, `valor_presupuesto_calculado`), atribución, `event_id`, `fbp`/`fbc`;
- el envío es fire-and-forget (`keepalive`): la exportación sigue aunque el webhook esté caído;
- no se navega a `#/gracias`: no es un lead nuevo, así que no dispara `CompleteRegistration`.

El camino sin identidad no cambia. El webhook acepta `lead_submitted` sin email cuando trae `contact_id` (responde `resolved:false` si el contacto no existe).

## QA

`pw-stories/calc-identity/identity.e2e.mjs` (raíz del monorepo) cubre los cinco escenarios (sin identidad, `?k=`, `k` inválido, `fyj_cid` sembrado, webhook caído) en Chromium desktop y Webkit iPhone, con las peticiones a n8n y Facebook bloqueadas por `page.route`:

```sh
node pw-stories/calc-identity/identity.e2e.mjs --base http://localhost:4173
node pw-stories/calc-identity/identity.e2e.mjs --prod --base https://adscelerator.es/calculadora-de-presupuestos/app
```

## Publicación

Ver `UPSTREAM.md` (build → repo aparte → JSDelivr → purge → verificación en producción). Auditoría histórica en `AUDIT.md`.
