# Auditoria — Calculadora de Presupuestos (agency-hue-site)

Fecha: 2026-05-01
Stack: Vite 5 + React 18 + TS 5.8 + Tailwind 3 + shadcn/ui + jsPDF + Framer Motion
Repo vendored en `web/agencia/agency-hue-site/` (sin `.git`)
Produccion actual: iframe en `floryjulioagencia.com/calculadora-de-presupuestos` apuntando a `agency-hue-site.lovable.app`

---

## TL;DR

- Codebase del build de Lovable, funcional pero con bastante grasa: **`BudgetCalculator.tsx` con 962 lineas**, **19 useState sueltos**, **TS strict desactivado a tres niveles** (`tsconfig.json`, `tsconfig.app.json`), **49 componentes shadcn** instalados de los cuales solo ~17 se usan, y **~10 dependencias de runtime** (~40% del package.json) que solo viven dentro de los componentes shadcn no usados.
- Publicacion via iframe Lovable arrastra **3 problemas serios**: SEO=0 (el contenido no se indexa bajo el slug del WP), GTM del padre no rastrea nada del hijo, y la pagina padre tiene HTML mal encodeado (triple `&amp;amp;amp;` en titulo y OG).
- v2 tiene **dos cambios de paleta no triviales**: el rojo `#FB4B2D` solo cumple WCAG AA-large sobre verde lima/blanco hueso (ratio 2.56-3.04). En textos pequenos sobre el CTA hace falta ajustar (texto blanco sobre rojo da 3.42:1 — limite). Verde Botella sobre Verde Lima da 9.74:1, sobrado.
- **Top 3 prioridades v2**: (1) reescribir `BudgetCalculator` en 4-5 piezas + hook de calculo, (2) dark mode default + repaint del light, (3) modal de captura de leads con webhook GHL antes del export.
- **Recomendacion hosting v2**: opcion 1 — same-origin estatico en `/calculadora/` del hosting WP. Cero CORS, GTM funciona, SEO real, sin doble scroll. Plan B Vercel solo si el WP no sirve assets estaticos.

---

## A) Codigo (calidad + arquitectura + dependencias)

### A1. Mega-componente `BudgetCalculator.tsx`

- **BLOCKER** — `src/components/BudgetCalculator.tsx:1-962` mezcla en un solo archivo: estado del formulario, calculo de bloques/dias, calculo de ads/CPM, distribucion por cuentas, render de tablas, render de toggles. **19 useState** y **5 useEffect** sueltos.
- Impacto: cualquier cambio de UI obliga a leer 962 lineas. Imposible testear el calculo aislado. Re-renders por cualquier interaccion menor.
- Recomendacion (M): split en `InputForm`, `ResultsView`, `AdCalculator`, `AccountDistribution` + hook `useBudgetCalculation` que reciba inputs y devuelva `{blocksData, daysData, accountDistributions}`. Migrar estado de inputs a `useReducer` (un solo dispatch en vez de 19 setters).

### A2. TypeScript strict desactivado

- **BLOCKER** — `tsconfig.app.json:18-22` y `tsconfig.json:9-14` desactivan `strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `strictNullChecks`. Es decir: TS configurado como JS con tipos opcionales.
- Impacto: el tipado del calculo (`BlockData`, `DayData`, `AccountDistribution`) no se aplica realmente. Bugs por `undefined`/`null` no detectados en build.
- Recomendacion (S): activar al menos `strict: true` + `strictNullChecks: true` en v2 desde el inicio. Va a tirar errores en el split de A1, mejor verlos ahi.

### A3. ESLint relajado

- **HIGH** — `eslint.config.js:23` desactiva `@typescript-eslint/no-unused-vars`. Junto con `noUnusedLocals: false` en TS, no hay nada que avise de imports/vars muertos.
- Impacto: el repo acumula codigo zombi (e.g. `NavLink.tsx` no se importa en ninguna parte, `App.css` con boilerplate Vite).
- Recomendacion (XS): quitar la linea `"@typescript-eslint/no-unused-vars": "off"` y subir a `"warn"`. Correr `eslint .` y limpiar lo que salga.

### A4. Dependencias instaladas pero solo usadas por componentes shadcn no usados

Verificacion: cada una de estas deps **solo** aparece en su componente shadcn ui, y el componente shadcn **no se importa** en ninguna parte de `src/components/` ni `src/pages/`:

| Dep | Solo referenciada en | Estado |
|---|---|---|
| `@tanstack/react-query` | `src/App.tsx` (provider montado pero sin queries) | **No usada** |
| `react-hook-form` | `src/components/ui/form.tsx` | No usada (reservar para v2: modal de captura) |
| `zod` | (no aparece en src) | **No usada** (reservar para v2: validar form) |
| `cmdk` | `src/components/ui/command.tsx` | No usada |
| `embla-carousel-react` | `src/components/ui/carousel.tsx` | No usada |
| `vaul` | `src/components/ui/drawer.tsx` | No usada |
| `recharts` | `src/components/ui/chart.tsx` | No usada |
| `react-day-picker` | `src/components/ui/calendar.tsx` | No usada (los date inputs son `<Input type="date">`) |
| `react-resizable-panels` | `src/components/ui/resizable.tsx` | No usada |
| `input-otp` | `src/components/ui/input-otp.tsx` | No usada |
| `next-themes` | `src/components/ui/sonner.tsx` (consumido por toaster) | Theme handcoded en `ThemeToggle.tsx`, no la usa |
| `date-fns` | (no aparece en src) | **No usada** |

- **HIGH** — ~10 deps efectivamente muertas. Aproximadamente 30-40% del bundle del runtime de los `node_modules` se va en codigo que nadie ejecuta.
- Recomendacion (S): en v2, instalar shadcn componente a componente segun necesidad (con `npx shadcn add ...`) en vez de copiar el directorio completo. `react-hook-form` + `zod` se reactivan cuando llegue el modal de leads (seccion H).

### A5. Sin code-splitting ni lazy loading

- **HIGH** — `vite.config.ts` no define `manualChunks`. `jspdf` (~150 KB minified) y `jspdf-autotable` se importan estaticamente en `src/lib/exportUtils.ts:1-2`, que a su vez se importa en `src/components/ExportSection.tsx:8` (cargado en el primer render de la app).
- Impacto: jsPDF carga aunque el usuario nunca pulse "Exportar PDF". El TTI se castiga sin necesidad.
- Recomendacion (S): convertir el import a dynamic dentro de `handleExportPDF`:
  ```ts
  const { exportToPDF } = await import("@/lib/exportUtils");
  await exportToPDF(data, options);
  ```
  El logo PNG embebido (`@/assets/logo-flor-y-julio.png`, 3.7K) tambien se va con el chunk dinamico.

### A6. Estado disperso en `useState` × 19

- **HIGH** — Confirmado: 19 `useState` y 5 `useEffect` en `BudgetCalculator.tsx`. Los useEffect tienen dependencias cruzadas (`startDate`/`endDate`/`totalDays`/`isManualDaysEdit`) — patron clasico de "el flag para evitar el loop infinito del propio efecto" (linea 57: `isManualDaysEdit`).
- Impacto: lectura dificil. Imposible serializar el estado para deep-link o persistencia.
- Recomendacion (M): `useReducer` con un solo `state` + `dispatch` en el split de A1. El calculo (no el estado) se puede memo-izar con `useMemo` desde los inputs.

### A7. Theme implementado a mano teniendo `next-themes` instalado

- **MEDIUM** — `src/components/ThemeToggle.tsx:5-22` reimplementa la logica de tema (lee `localStorage`, escucha `prefers-color-scheme`, alterna `.dark` en el `<html>`). `next-themes` esta en `package.json:53` pero solo lo consume `ui/sonner.tsx`.
- Impacto: dos sistemas que pueden divergir (sonner usa theme de next-themes, el resto usa el handcoded). Sin SSR no hay flash, pero igual es deuda.
- Recomendacion (XS): en v2 montar `<ThemeProvider defaultTheme="dark">` de `next-themes` en el root y reemplazar el handcoded.

### A8. Sin tests

- **MEDIUM** — Confirmado: no hay `__tests__/`, no hay archivos `*.test.*`, no hay `vitest`/`jest` en deps.
- Impacto: cualquier refactor del calculo de bloques/dias es ciego. Esto es un calculator, la logica numerica deberia tener tests.
- Recomendacion (S): en el split de A1, despues de extraer `useBudgetCalculation`, agregar Vitest con 5-10 tests sobre `calculate(inputs)` cubriendo: bloques iguales (changePercent=0), progresion ascendente, descendente, redondeo a centavos, distribucion por cuentas con porcentajes que no suman 100. Es una tarde.

### A9. Lockfiles duplicados

- **MEDIUM** — Conviven `bun.lockb` y `package-lock.json` en root. El proyecto declara `npm` implicitamente (los scripts del package.json son universales).
- Impacto: si un dev usa bun y otro npm, los lockfiles divergen y se pelean en PRs.
- Recomendacion (XS): elegir uno (recomendacion: npm — ya tenemos package-lock.json y es lo que corre en Vercel/Easypanel sin friccion). Borrar `bun.lockb`.

### A10. Codigo zombi

- **LOW** — `src/components/NavLink.tsx`: confirmado que no se importa en ningun lado. La app usa `<a href>` directo o `<Link>` de react-router-dom donde lo necesita. Este componente es un wrapper compat de `react-router-dom@6` que no aporta nada.
- **LOW** — `src/App.css`: no esta vacio (contiene boilerplate Vite — `.logo`, `@keyframes logo-spin`, `.read-the-docs`) pero **no se importa en ningun lado**. Codigo muerto.
- **LOW** — 49 componentes en `src/components/ui/`, solo ~17 referenciados desde `src/components/` y `src/pages/`. Los otros 32 son shells shadcn instalados por defecto.
- Recomendacion (XS): en v2 limpiar el directorio `ui/` a los 17 que se usan. Borrar `NavLink.tsx` y `App.css`.

---

## B) Performance + Core Web Vitals

### B1. cache-control: no-cache en lovable.app

- **HIGH** — Verificado por el agente Explore que audito el HTML servido. Afecta solo a la version actual (iframe a Lovable). En v2 self-hosteada no aplica.
- Recomendacion (XS): cuando montemos v2 en `/calculadora/` del WP, configurar `Cache-Control: public, max-age=31536000, immutable` para los assets con hash en el nombre (Vite ya los emite asi).

### B2. Logo PNG sin optimizar

- **MEDIUM** — `src/assets/logo-flor-y-julio.png` pesa **3.7 KB**. Que es chico, pero (a) se embebe en cada PDF que se exporta (loadImageAsBase64 en `src/lib/exportUtils.ts:215-234`) y (b) se renderiza en el header en `h-12`/`h-16`.
- Impacto: bajo, pero un SVG seria mas limpio (escala perfecta en cualquier tamano del header, en el PDF lo carga jsPDF como vector).
- Recomendacion (S): pedir el logo en SVG al departamento de branding (`departments/marketing/branding/assets/logos/`) y reemplazar. Si se mantiene PNG, exportar a 2x = 200×200 para que el watermark del PDF (80mm) se vea nitido en imprenta.

### B3. Framer Motion para animaciones triviales

- **MEDIUM** — Tres archivos lo usan: `BudgetCalculator.tsx`, `ExportSection.tsx`, `Index.tsx`. Las animaciones que hacen son: fade-in al montar (`initial={{opacity:0, y:20}}`), slide del header. Todo eso es CSS transition + `@keyframes fade-in` (que ya existe en `tailwind.config.ts:83-92`).
- Impacto: framer-motion 12.x pesa ~50 KB gzipped. Para 3 fade-ins.
- Recomendacion (S): reemplazar los `<motion.div>` por `<div>` con clase `animate-fade-in` (la animacion ya esta declarada en Tailwind config). Si en v2 se quiere conservar Framer para cosas mas serias (transiciones del modal de leads, page transitions), dejar pero auditar uso.

### B4. Sin bundle analyzer

- **MEDIUM** — No hay `rollup-plugin-visualizer` ni similar. Volar a ciegas sobre que esta inflando el bundle.
- Recomendacion (XS): `npm i -D rollup-plugin-visualizer` y agregarlo al `vite.config.ts`. Una corrida de build te dice que mover a chunks dinamicos.

### B5. Vite sin manualChunks

- **LOW** — `vite.config.ts:7-18` no define `build.rollupOptions.output.manualChunks`. Vite agrupa por defecto, pero con jsPDF + framer-motion + 17 radix-ui en juego, vale la pena dividir vendor en al menos `react-vendor`, `radix-vendor`, `pdf-vendor`.
- Recomendacion (S): hacerlo en v2 cuando ya este aplicado el dynamic import del B5/A5.

---

## C) Publicacion (iframe + WP padre)

Estos findings se basan en la auditoria del HTML del WP padre (no esta en el clone). En v2 self-hosteada en el WP, todos estos quedan obsoletos.

### C1. Cross-origin sin postMessage handshake

- **HIGH** — `iframe src="https://agency-hue-site.lovable.app"` en `floryjulioagencia.com`. El iframe tiene `height: 100%` por CSS pero el contenido del calculador puede crecer (al expandir AdCalculator + AccountDistribution). Sin postMessage, el padre no sabe la altura real y el contenido se corta o aparece doble scroll.
- Impacto: la UX en mobile especialmente sufre — `scrolling="yes"` + `body { overflow: hidden }` del WP genera doble scrollbar en algunos browsers.
- Recomendacion: no aplica en v2 (same-origin sin iframe).

### C2. GTM no rastrea nada del hijo

- **HIGH** — GTM-MMTPRQJB en el WP padre, pero el iframe es cross-origin → 0 eventos del calculador llegan al GTM. Hoy no se puede medir uso, conversion del export, ni atribuir UTMs.
- Impacto: es justo lo que el modal de leads de v2 (seccion H) viene a resolver — pero hoy no hay tracking de nada.
- Recomendacion: en v2 montar el GTM directamente en el index.html del calculador (mismo container o hijo). Asi capturamos pageview, click en exportar, submit del modal.

### C3. Sin loading="lazy" en el iframe

- **HIGH** — El iframe se carga inmediatamente con la pagina. Es la unica cosa visible (el WP padre esta "en blanco") asi que en este caso el lazy no ayudaria mucho, pero suma latencia perceptiva.
- Recomendacion (XS, **bandaid sobre v1**): mientras no se haga el switch a v2, agregar `loading="lazy"` y `importance="low"` al iframe en el WP. No mueve la aguja pero es free.

### C4. SEO=0 sobre el slug

- **HIGH** — Google no indexa el contenido de un iframe cross-origin como contenido del padre. La URL `floryjulioagencia.com/calculadora-de-presupuestos` no rankea por ningun termino del calculador (solo por el title del WP, que ademas esta roto — ver C7).
- Impacto: una herramienta gratis pensada para captar trafico organico no rankea por "calculadora presupuesto publicitario meta ads". Perdida directa.
- Recomendacion: en v2 same-origin, todo el contenido es texto del DOM padre, indexable. Agregar meta description y schema.org `SoftwareApplication`.

### C5. Sin sandbox; allow muy permisivo

- **MEDIUM** — El `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` no aporta nada al calculador (no usa nada de eso) y sin `sandbox` el iframe puede ejecutar JS arbitrario contra Lovable.
- Recomendacion: no aplica en v2.

### C6. Doble scrollbar en mobile

- **MEDIUM** — `scrolling="yes"` + `body { overflow: hidden }` del WP + altura dinamica del calculador → en mobile aparecen 2 scrollbars en algunos navegadores (iOS Safari especialmente).
- Recomendacion: no aplica en v2.

### C7. (descubierto durante validacion) Triple HTML-encoding en `index.html`

- **HIGH** — `index.html` del proyecto Vite, lineas 5 y 25-27:
  ```html
  <title>Calculadora de Presupuesto - Flor &amp;amp;amp; Julio</title>
  <meta property="og:title" content="Calculadora de Presupuesto - Flor &amp;amp;amp; Julio">
  ```
  El `&` de "Flor & Julio" esta **triple-encodeado**. Se ve renderizado en el browser como literal `Flor &amp;amp; Julio` en la pestana del navegador y en cualquier preview de OG.
- Impacto: en cualquier share de la URL (WhatsApp, Slack, Twitter, FB) el preview muestra "Flor &amp;amp; Julio". Imagen profesional al piso.
- Recomendacion (XS): cambiar a `Flor &amp; Julio` (encoding correcto) o usar el caracter directo `Flor & Julio` y dejar que el parser HTML lo encodee. Aplicar en `index.html:5,25,26`.

### C8. (descubierto durante validacion) Favicon apunta a Google Cloud Storage de Lovable

- **MEDIUM** — `index.html:18-19`:
  ```html
  <link rel="icon" type="image/x-icon" href="https://storage.googleapis.com/gpt-engineer-file-uploads/.../Logo-principal_sin-tagline_rojo_FloryJulio.png">
  ```
  El favicon vive en infra de Lovable. Si Lovable lo borra, el favicon desaparece. Ademas el `public/favicon.ico` (7.5K) que viene en el repo no se esta usando.
- Recomendacion (XS): reemplazar por `<link rel="icon" type="image/png" href="/favicon.png">` y poner el logo correcto en `public/favicon.png` (32×32 o 48×48).

### C9. (descubierto durante validacion) OG image apunta a `lovable.dev/opengraph-image-p98pqg.png`

- **MEDIUM** — `index.html:13,15`. El share preview muestra el OG default de Lovable, no el de Flor y Julio.
- Recomendacion (XS): generar un OG card 1200×630 con el logo + "Calculadora de Presupuesto Publicitario" y subir a `public/og-card.png`. Cambiar las dos lineas.

### C10. (descubierto durante validacion) `lang="en"` en el HTML

- **LOW** — `index.html:2`: `<html lang="en">`. La app esta 100% en espanol. Afecta accesibilidad (screen readers leen con voz inglesa) y SEO.
- Recomendacion (XS): cambiar a `<html lang="es">`.

### C11. (descubierto durante validacion) Twitter site sigue siendo `@Lovable`

- **LOW** — `index.html:14`: `<meta name="twitter:site" content="@Lovable" />`.
- Recomendacion (XS): borrar la linea o cambiar al @ de Flor y Julio si tienen.

---

## D) Hosting de la v2 — opciones

### Opcion 1 — Same-origin estatico en `/calculadora/` del hosting WP (RECOMENDADA)

- **Como**: `npm run build` produce `dist/`, se sube a `/wp-content/uploads/calculadora/` o se monta en `/calculadora/` directo en el doc-root del WP. La pagina del WP sirve el `index.html` de la SPA en vez del shortcode con iframe.
- **Pros**:
  - Cero CORS, GTM del WP captura todo del calculador automaticamente
  - SEO real bajo el slug — el contenido se indexa
  - Sin doble scroll, sin postMessage
  - Sin dependencia de Lovable
  - Cache-control bajo nuestro control
- **Contras**:
  - Requiere acceso FTP/SSH al hosting del WP (o via plugin tipo "File Manager" si no hay shell)
  - Si el WP-theme usa rewrites agresivos en `.htaccess`, hay que excluir `/calculadora/` para que no caiga al index.php de WP
- **Esfuerzo**: M (1 dia: build, upload, config de htaccess, QA)

### Opcion 2 — Subdominio en Vercel (`calculadora.floryjulioagencia.com`)

- **Como**: deploy a Vercel, apuntar el CNAME del subdominio. Mantener el iframe en el WP pero apuntando al subdominio propio.
- **Pros**:
  - CI/CD automatico (push a main → deploy)
  - Edge cache
  - Preview deployments por PR
- **Contras**:
  - Sigue siendo iframe → mismos problemas de C1, C2, C4 que con Lovable
  - Una infra mas que mantener (Vercel)
  - **Preferencia del stack interno F&J**: ya hay infra Easypanel al lado de n8n (ver memoria persistente del usuario). Antes de optar por Vercel, confirmar con Lio si encaja con el resto de la infra interna o se prefiere autohostear en Easypanel.
- **Esfuerzo**: S — pero peor UX que opcion 1.

### Opcion 3 — WP plugin/shortcode (DESCARTADA)

- Reescribir como plugin de WP en PHP/Vue. Costo altisimo, beneficio nulo.
- Descartada.

**Recomendacion final**: Opcion 1. Si por alguna razon politica del hosting el WP no permite servir un `/calculadora/` estatico, pasar a Opcion 2 con el iframe sustituido por una redirect 301 (perdiendo SEO pero ganando atribucion via subdominio propio).

---

## E) Quick wins (sobre la v2 local — orden de impacto/esfuerzo)

1. **(XS) Dark mode default** — cambiar `ThemeToggle.tsx:7` `useState<"light" | "dark">("light")` por `("dark")` y leer `prefers-color-scheme` con default a `dark` si no hay `localStorage`. Las HSL del `.dark` ya estan en `index.css:72-114`.
2. **(XS) Repaint del modo claro con la paleta de marca** — ver seccion G abajo, valores HSL ya calculados.
3. **(XS) Borrar deps muertas** — `npm rm @tanstack/react-query cmdk embla-carousel-react vaul recharts react-day-picker react-resizable-panels input-otp date-fns` y borrar los componentes shadcn correspondientes en `src/components/ui/`. `react-hook-form`, `zod`, `next-themes` SE QUEDAN — los necesitamos para v2 (modal de captura + theming).
4. **(XS) Borrar `NavLink.tsx`, `App.css`, `bun.lockb`**.
5. **(XS) Fix de `index.html`** — lang=es, encoding correcto, OG image propio, favicon local (C7-C11).
6. **(XS) Logo PNG → SVG** si esta disponible en branding. Si no, dejar para v2.
7. **(XS) Bandaid sobre v1**: agregar `loading="lazy"` al iframe del WP. Free, mientras no se haga el switch.

---

## F) Refactor profundo (antes del switch)

1. **(M) Split `BudgetCalculator.tsx` en 5 piezas** + `useBudgetCalculation` hook puro. Estructura propuesta:
   ```
   src/components/calculator/
     CalculatorLayout.tsx        // contenedor + tabs
     InputForm.tsx               // budget, fechas, bloques, CDAs, % cambio
     ResultsView.tsx             // toggle bloques/dias + tabla
     AdCalculator.tsx            // CPM + sets de anuncios
     AccountDistribution.tsx     // distribucion N cuentas
   src/hooks/
     useBudgetCalculation.ts     // (inputs) => results, pure, testable
   ```
2. **(S) Migrar estado de inputs a `useReducer`** dentro de `CalculatorLayout`. Un solo state object, un solo dispatch.
3. **(M) Modal de captura con `react-hook-form` + `zod`** usando `Dialog` de shadcn (ya esta en `ui/dialog.tsx`). Detalle en seccion H.
4. **(S) Test suite minimo con Vitest** sobre `useBudgetCalculation`. 8-10 tests cubriendo casos numericos.
5. **(XS) `rollup-plugin-visualizer`** para auditar bundle size despues del refactor.
6. **(S) Reemplazar Framer Motion por CSS** en los 3 fade-ins existentes. Mantener Framer solo si en v2 se decide animar el modal con presence transitions.
7. **(S) Activar TS strict** + correr `tsc --noEmit` y arreglar lo que salte (probablemente null-checks en `accountDistributions` y similares).

---

## G) Cambios de paleta (v2)

### Variables HSL listas para pegar en `src/index.css`

Conversion verificada de los HEX del manual de marca (`departments/marketing/branding/README.md`) a HSL formato Tailwind/shadcn (`H S% L%`):

| Token | HEX | HSL (Tailwind) |
|---|---|---|
| Verde Botella | `#14372E` | `165 47% 15%` |
| Rojo | `#FB4B2D` | `9 96% 58%` |
| Verde Lima | `#D4E6AE` | `79 53% 79%` |
| Ocre | `#CFB93A` | `51 61% 52%` |
| Beige | `#EFEAD5` | `48 45% 89%` |
| Blanco hueso | `#F4F2E8` | `50 35% 93%` |

### Mapeo a tokens del modo claro (`:root` en `src/index.css:10-69`)

```css
:root {
  --background: 79 53% 79%;        /* Verde Lima — fondo de pagina */
  --foreground: 165 47% 15%;       /* Verde Botella — texto principal */

  --card: 50 35% 93%;              /* Blanco hueso — cards */
  --card-foreground: 165 47% 15%;  /* Verde Botella sobre Blanco hueso (11.58:1) */

  --popover: 50 35% 93%;
  --popover-foreground: 165 47% 15%;

  --primary: 9 96% 58%;            /* Rojo — CTAs */
  --primary-foreground: 0 0% 100%; /* Blanco sobre Rojo (3.42:1 — limite, ver nota) */

  --secondary: 165 47% 15%;        /* Verde Botella */
  --secondary-foreground: 50 35% 93%; /* Blanco hueso */

  --accent: 79 53% 79%;            /* Verde Lima */
  --accent-foreground: 165 47% 15%;

  --muted: 48 45% 89%;             /* Beige — fondos suaves */
  --muted-foreground: 165 30% 35%; /* Verde botella claro */

  --border: 165 25% 65%;           /* Verde botella desaturado */
  --input: 50 35% 93%;             /* Blanco hueso para inputs */
  --ring: 9 96% 58%;               /* Rojo */
}
```

### Validacion de contraste WCAG (calculo verificado)

| Combinacion | Ratio | Nivel |
|---|---|---|
| Verde Botella sobre Verde Lima (texto sobre fondo pagina) | **9.74:1** | AAA |
| Verde Botella sobre Blanco hueso (texto en cards) | **11.58:1** | AAA |
| Verde Botella sobre Blanco puro (referencia paleta actual) | 13.00:1 | AAA |
| Blanco sobre Rojo (texto del boton CTA) | **3.42:1** | AA solo en texto grande (>18px o 14px bold) |
| Rojo sobre Blanco hueso (CTA en cards, texto chico) | 3.04:1 | AA solo grande |
| Rojo sobre Verde Lima (CTA sobre fondo pagina, texto chico) | 2.56:1 | **FAIL** |

**Hallazgo critico (descubierto durante validacion)**: el rojo de marca `#FB4B2D` no cumple WCAG AA-normal contra ninguno de los fondos (verde lima ni blanco hueso). Esto **ya** es un problema en la version actual con fondo blanco puro: 3.04:1 contra blanco. La marca asume CTAs grandes (>=18px / 14px bold), que es el caso del calculador (los botones de exportar son `text-lg` o equivalente).

**Recomendaciones G**:
- Asegurar que TODOS los textos sobre rojo (botones primarios) sean `font-semibold text-base` minimo, idealmente `text-lg`. Verificar `Button` variant default en `src/components/ui/button.tsx`.
- Si en algun momento hace falta texto chico sobre rojo, usar verde botella oscuro como background en vez de rojo (e.g. tooltips, badges informativos no-CTA).
- El rojo se mantiene como CTA — alternativa seria oscurecer a `#D63D24` (ratio 4.5:1 contra blanco) pero perdemos identidad de marca. **Decision recomendada**: aceptar el limite, forzar texto grande/bold sobre rojo siempre.

**Checklist concreto antes del switch** (no opcional — todos los items deben estar verificados):

- [ ] `src/components/ui/button.tsx` variant `default` (o `primary`) tiene `font-semibold text-base` minimo en sus clases base. Si no, agregar.
- [ ] Cualquier `<Button variant="default">` (o equivalente) en `src/components/BudgetCalculator.tsx`, `src/components/ExportSection.tsx` y futuros componentes de v2 NO contiene un `<span>` o texto hijo que sobreescriba el peso/tamano (ej: `<span className="text-sm">` dentro). Grep: `rg -n 'variant="default"|bg-primary' src/`.
- [ ] Cualquier badge / pill / link con `bg-primary` que no sea CTA grande debe migrar a `bg-secondary` (verde botella) o `bg-muted` (beige). Grep: `rg -n 'bg-primary' src/components/`.
- [ ] Iconos sobre rojo (lucide-react `<Download />`, `<FileText />` etc) tienen contraste color implicit OK cuando el icono tiene >=18px (default es 24px) — verificar que ningun icono dentro de boton primario usa `size={12}` o `h-3 w-3`.

---

## H) Lead capture + UTMs + GHL

### H1. Trigger del modal

- **v1 (lo que se implementa)**: gating estricto sobre el export. El click en "Exportar PDF" o "Exportar CSV" abre el modal si `sessionStorage.getItem('lead_submitted') !== 'true'`. Submit del modal → guarda flag → ejecuta `exportToPDF`/`exportToCSV`. Solo este trigger entra en v1.
- **Backlog post-launch**: trigger secundario al completar el primer calculo valido (totalBudget > 0 + fechas + click en "Calcular"), con boton "saltar" (cookie `lead_skipped=1` TTL 24h). Solo se considera implementarlo si las metricas de conversion del trigger principal son bajas y se ve claro que el usuario llega al export sin haber visto valor de la calculadora antes.

### H2. UTMs + tracking IDs

- Al cargar la app: parsear `URLSearchParams` de `window.location.search` y persistir en `sessionStorage` keys: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`. Si la key ya existe, no sobreescribir (primera atribucion gana).
- En el submit: leer todas las keys + agregar `referrer: document.referrer`, `landing_url: window.location.href`, `calc_budget_value: totalBudget` (numero), `lead_magnet: 'calculadora-presupuesto'`.

### H3. Form (campos + UX)

- **nombre** (required, min 2)
- **email** (required, regex email)
- **telefono** (optional con codigo pais — el cliente es ES principalmente)
- **consent** (checkbox required, link al aviso de privacidad de F&J)
- **website** honeypot (input hidden, name="website", si llega con valor → discard)
- **load_timestamp** (hidden, set en mount; al submit verificar `Date.now() - load_timestamp > 1500ms` — anti-bot minimo)
- Validacion con `zod` + `react-hook-form` (ambas ya en deps).

### H4. Envio webhook GHL

- **Variable env**: `VITE_GHL_LEAD_WEBHOOK_URL` en `.env.local` (no commitear). Plumbing en `src/lib/ghlWebhook.ts`.
- **Workflow GHL**: revisar primero el draft `5c660fe1-...` v22 "Setter/Qualifyier Lead Magnet" (en `context/infra-ghl.md`). Si tiene Inbound Webhook trigger, reusarlo. Si no, crear uno nuevo en GHL UI (con Trigger → Inbound Webhook).
- **Custom fields a validar/crear** en GHL antes de hacer el switch:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (text)
  - `gclid`, `fbclid` (text)
  - `lead_magnet` (text, valor: `calculadora-presupuesto`)
  - `calc_budget_value` (number — el budget que ingreso el lead, util para qualifying)
  - `landing_url` (text)
  - `referrer` (text)
- **Tag automatico**: `lead-magnet:calculadora-presupuesto` (workflow GHL puede agregarlo en el inbound).

### H5. UX post-submit

- Submit success → cerrar modal → `sessionStorage.setItem('lead_submitted', 'true')` → arrancar el export que disparo el modal automaticamente.
- Toast con sonner: "Te enviamos el PDF en breve" (aunque el download sea local — sirve para que la persona sepa que registramos).
- Fail → toast de error + boton "Reintentar". No bloquear el export para siempre, despues de 2 fallos permitir descargar igualmente con flag `lead_submit_failed=true` en el storage para reintentar despues.

### H6. Anti-bot adicional (opcional, M)

- Si el formulario empieza a recibir spam masivo, agregar Cloudflare Turnstile (free, sin friccion para el usuario). El honeypot + tiempo minimo cubre 90% de bots simples.

---

## Apendice — Lista priorizada (lo primero a tocar)

| # | Item | Severidad | Esfuerzo | Bloqueador para v2? |
|---|---|---|---|---|
| 1 | Fix `index.html`: lang=es, triple-encoding, OG image propio, favicon local | HIGH+MEDIUM | XS | No (pero hacer ya) |
| 2 | Split `BudgetCalculator` + `useBudgetCalculation` hook | BLOCKER | M | Si |
| 3 | Activar TS strict | BLOCKER | S | Si |
| 4 | Borrar deps muertas + ui/* shadcn no usados + `NavLink.tsx` + `App.css` + `bun.lockb` | HIGH | S | No (cosmetico) |
| 5 | Dark mode default + repaint paleta light (HSL listos en seccion G) | HIGH | XS | Si |
| 6 | Modal de captura + webhook GHL + UTMs (seccion H) | HIGH | M | Si |
| 7 | Validar custom fields en GHL + workflow inbound (seccion H4) | HIGH | S | Si |
| 8 | Dynamic import de `jspdf` en `handleExportPDF` | HIGH | XS | No |
| 9 | Test suite Vitest sobre `useBudgetCalculation` | MEDIUM | S | No (recomendado) |
| 10 | Reemplazar handcoded theme por `next-themes` | MEDIUM | XS | No |
| 11 | Reemplazar Framer Motion por CSS animations | MEDIUM | S | No |
| 12 | Bundle analyzer + manualChunks | MEDIUM | XS | No |
| 13 | Logo PNG → SVG (si branding lo tiene) | MEDIUM | S | No |
| 14 | Hosting v2 same-origin en WP (Opcion 1 seccion D) | HIGH | M | Si — para el switch |
| 15 | Bandaid `loading="lazy"` al iframe en el WP actual | LOW | XS | No (mientras no haya switch) |

## Apendice — Tabla resumen severidad/area

| Area | BLOCKER | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| A) Codigo | A1, A2 | A3, A4, A5, A6 | A7, A8, A9 | A10 |
| B) Performance | — | B1 | B2, B3, B4 | B5 |
| C) Publicacion | — | C1, C2, C3, C4, C7 | C5, C6, C8, C9 | C10, C11 |
| G) Paleta v2 | — | rojo no cumple AA-normal | — | — |
| H) Lead capture | — | H1, H2, H3, H4, H5 | H6 | — |

---

## Descartados durante validacion

- "App.css vacio" (de findings preliminares): **NO** esta vacio. Tiene boilerplate de Vite (`.logo`, `@keyframes logo-spin`, `.read-the-docs`). El finding correcto es: archivo no usado en ninguna parte (codigo zombi). Ajustado a **A10 LOW**.
- "~25 componentes shadcn sin uso" (preliminar): el numero real es **~32 sin uso de los 49** instalados. Ajustado en A10.
- `sonner` listado como sin uso en findings preliminares: **se usa**. `src/components/ExportSection.tsx:9` y `src/components/ui/sonner.tsx`. Mantener.
- `next-themes` como "instalado pero theme implementado a mano" (preliminar): correcto pero el agente Explore decia que estaba en `ui/sonner.tsx` por accidente — confirmado: lo necesita `sonner` para alinear con el theme actual. Si arrancamos a usar `next-themes` propiamente (recomendacion A7), aprovecha la dep. Mantener.
