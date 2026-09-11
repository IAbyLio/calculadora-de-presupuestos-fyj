/**
 * Identidad del contacto conocido (`fyj_cid`) — contrato común a todos los
 * lead magnets de F&J. Implementado también en:
 *   - web/agencia/checklist-montaje-campanas/gate/gate.html
 *   - web/agencia/Landing-50-Formatos-Ads/index.html
 *   - web/agencia/Landing-Hub-Recursos/index.html
 * Tiene que ser compatible byte a byte con esa clave y ese formato: cualquier
 * página de adscelerator.es (mismo origen) lo escribe y las demás lo leen.
 *
 * Contrato:
 *   - Los enlaces internos llegan con `?k=<contact_id>` de GHL.
 *   - id válido = /^[A-Za-z0-9_-]{1,64}$/ (mismo regex que n8n). Un id inválido
 *     NO se guarda.
 *   - localStorage.fyj_cid = JSON {id, ts}; caduca a 90 días (se limpia al leer).
 *   - `k` se quita de la URL con history.replaceState conservando el resto de
 *     la query y el hash (la app usa hash router: /app#/).
 *   - Todo en try/catch: sin localStorage la app funciona igual.
 *
 * `captureContactId()` se llama UNA vez en el bootstrap (main.tsx), antes que
 * `captureUtms()`, para que `k` no quede dentro del `landing_url` capturado.
 * `getContactId()` se lee al exportar.
 */

const CID_KEY = "fyj_cid";
const CID_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const CID_RE = /^[A-Za-z0-9_-]{1,64}$/;

interface StoredCid {
  id: string;
  ts: number;
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function lsDel(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Lee `fyj_cid`; un valor corrupto o caducado se limpia y devuelve null. */
function readCid(): StoredCid | null {
  const raw = lsGet(CID_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<StoredCid> | null;
    if (!o || typeof o.id !== "string" || typeof o.ts !== "number") {
      lsDel(CID_KEY);
      return null;
    }
    if (Date.now() - o.ts > CID_TTL_MS) {
      lsDel(CID_KEY);
      return null;
    }
    return { id: o.id, ts: o.ts };
  } catch {
    lsDel(CID_KEY);
    return null;
  }
}

/**
 * Captura `?k=` al arrancar: guarda la identidad si es válida y quita `k` de
 * la URL (valga o no) conservando query y hash.
 */
export function captureContactId(): void {
  try {
    const pageUrl = new URL(window.location.href);
    const paramK = pageUrl.searchParams.get("k");
    readCid(); // limpia un fyj_cid corrupto/caducado aunque no venga k
    if (paramK === null) return;

    const k = String(paramK).trim();
    if (CID_RE.test(k)) {
      lsSet(CID_KEY, JSON.stringify({ id: k, ts: Date.now() }));
    }

    pageUrl.searchParams.delete("k");
    try {
      history.replaceState(null, "", pageUrl.pathname + pageUrl.search + pageUrl.hash);
    } catch {
      // sin history: la URL se queda como está, la app sigue igual
    }
  } catch {
    // URL rara o sin window: nada que capturar
  }
}

/** Id del contacto conocido si hay `fyj_cid` vigente; si no, null. */
export function getContactId(): string | null {
  const cid = readCid();
  return cid ? cid.id : null;
}
