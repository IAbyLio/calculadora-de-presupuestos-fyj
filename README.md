# Calculadora de Presupuesto Publicitario — Flor y Julio Agencia

Vite + React + TypeScript + Tailwind + shadcn/ui. Distribuye un presupuesto publicitario por bloques (con estrategia de aumento o reducción), calcula anuncios por conjunto y distribución entre cuentas, y exporta a PDF / CSV.

Producción: [adscelerator.es/calculadora-de-presupuestos](https://adscelerator.es/calculadora-de-presupuestos) (deploy via GHL Sites + bundle servido por JSDelivr desde este repo).

## Servir desde JSDelivr

GHL Media Library no permite subir `.js` por seguridad. Para que el bundle sea consumible desde GHL, este repo lo aloja y JSDelivr lo cachea con MIME types correctos:

- **JS bundle**: `https://cdn.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.js`
- **CSS bundle**: `https://cdn.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.css`

JSDelivr cachea ~12h por default. Para purge manual tras un push nuevo:

```
curl https://purge.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.js
curl https://purge.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.css
```

## Desarrollo

```sh
npm install
npm run dev   # http://localhost:8080
```

## Build production

```sh
npm run build
# dist/calc-app.js + dist/calc-app.css → commit + push para que JSDelivr los sirva
```

`vite.config.ts` está configurado con `inlineDynamicImports` y filenames deterministas (`calc-app.js`, `calc-app.css`) para que el bundle entre como 2 archivos sin imports cruzados.

## Backend

Lead capture: el modal POSTea al webhook n8n `Calc-Presupuesto-Leads-Webhook` (`/webhook/calc-lead-v2`) con schema canonical Landing Lead Capture. Frontend hooks: [`src/lib/leadCapture.ts`](src/lib/leadCapture.ts) + [`src/lib/utmCapture.ts`](src/lib/utmCapture.ts) + [`src/lib/metaCookies.ts`](src/lib/metaCookies.ts).

## Stack

- Vite 5 + React 18 + TypeScript 5.8
- Tailwind 3 + shadcn/ui
- jsPDF + jspdf-autotable (export PDF)
- react-hook-form + zod (modal de captura)
- Framer Motion (animaciones)
