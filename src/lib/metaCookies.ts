/**
 * Captura de cookies/IDs de Meta para deduplicacion CAPI futura.
 *
 * - `_fbp`: cookie que setea el Pixel automatico al cargar.
 * - `_fbc`: cookie que setea el Pixel cuando llega un fbclid en URL.
 *   Si no existe pero hay fbclid, lo construimos siguiendo el formato oficial:
 *   `fb.<subdomain_index>.<creation_time_ms>.<fbclid>`. subdomain_index=1 (default).
 *
 * Persistimos `_fbc` en sessionStorage para que sobreviva reloads dentro
 * de la sesion (la cookie real expira segun config del Pixel).
 */

const FBC_STORAGE_KEY = "fyj_fbc_v1";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getFbp(): string | undefined {
  return readCookie("_fbp") ?? undefined;
}

export function getFbc(): string | undefined {
  const cookieFbc = readCookie("_fbc");
  if (cookieFbc) return cookieFbc;

  try {
    const stored = sessionStorage.getItem(FBC_STORAGE_KEY);
    if (stored) return stored;

    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");
    if (!fbclid) return undefined;

    const built = `fb.1.${Date.now()}.${fbclid}`;
    sessionStorage.setItem(FBC_STORAGE_KEY, built);
    return built;
  } catch {
    return undefined;
  }
}
