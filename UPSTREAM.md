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

1. `npm run build` desde `web/agencia/calculadora-de-presupuestos-fyj/`
2. Copiar el contenido del monorepo al clone del repo standalone (excluyendo `node_modules` + `.env.local`)
3. Commit + push al repo standalone
4. JSDelivr cachea hasta 12h. Para purge inmediato:
   ```
   curl https://purge.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.js
   curl https://purge.jsdelivr.net/gh/IAbyLio/calculadora-de-presupuestos-fyj@main/dist/calc-app.css
   ```

## Auditoria historica

Ver `AUDIT.md` en esta misma carpeta para el informe priorizado de codigo, performance, publicacion actual y plan de la v2 (escrito 2026-05-01, varias recomendaciones ya aplicadas).
