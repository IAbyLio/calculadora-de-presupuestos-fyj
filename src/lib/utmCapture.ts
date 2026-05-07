/**
 * Captura de parametros de atribucion (UTMs + click IDs) al cargar la app.
 *
 * Estrategia: primera atribucion gana. Si el usuario llega con UTMs, se
 * persisten en sessionStorage. Si vuelve a la misma pestana sin UTMs (ej:
 * navegando desde otro link), no se sobreescriben.
 *
 * Llamar `captureUtms()` una sola vez en el bootstrap (main.tsx).
 * Leer con `getCapturedAttribution()` al submitir el form.
 */

const STORAGE_KEY = "fyj_calc_attribution_v1";

export interface AttributionParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landing_url?: string;
  captured_at?: string;
}

const TRACKED_KEYS: (keyof AttributionParams)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
];

export function captureUtms(): void {
  try {
    const existing = readStorage();
    if (existing) return; // primera atribucion gana

    const params = new URLSearchParams(window.location.search);
    const captured: AttributionParams = {};

    for (const key of TRACKED_KEYS) {
      const value = params.get(key);
      if (value) captured[key] = value;
    }

    const hasAnyUtm = Object.keys(captured).length > 0;
    captured.referrer = document.referrer || undefined;
    captured.landing_url = window.location.href;
    captured.captured_at = new Date().toISOString();

    if (hasAnyUtm || captured.referrer) {
      writeStorage(captured);
    }
  } catch {
    // sessionStorage no disponible o error de parseo: silencioso
  }
}

export function getCapturedAttribution(): AttributionParams {
  return readStorage() ?? {};
}

function readStorage(): AttributionParams | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionParams;
  } catch {
    return null;
  }
}

function writeStorage(data: AttributionParams): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}
