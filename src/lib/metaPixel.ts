/**
 * Meta Pixel (Facebook Pixel) integration.
 *
 * Cargar el pixel UNA sola vez al boot (main.tsx). Si la env var
 * `VITE_META_PIXEL_ID` no esta seteada, no se inyecta nada — modo
 * desarrollo o staging, sin contaminar los stats de produccion.
 *
 * El PageView inicial dispara automatico al cargar el script de FB.
 * Para eventos custom (CompleteRegistration al submitir el lead),
 * usar `trackEvent("CompleteRegistration")` desde el componente que
 * corresponda.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let pixelLoaded = false;

export function loadMetaPixel(pixelId: string): void {
  if (pixelLoaded) return;
  if (typeof window === "undefined") return;
  if (!pixelId) return;

  // Snippet oficial de Meta — no tocarlo. Lo unico que cambia es que
  // lo ejecutamos desde TS en vez de pegarlo inline en el HTML.
  /* eslint-disable */
  // @ts-ignore
  !function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  if (!window.fbq) return;
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  pixelLoaded = true;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[MetaPixel] cargado con id ${pixelId}, PageView disparado (en localhost los eventos los rechaza Meta por Traffic Permissions — esperado, valida en prod)`);
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!window.fbq) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(`[MetaPixel MOCK] ${eventName}`, params ?? {});
    }
    return;
  }
  if (params) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}
