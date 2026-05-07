import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isLeadSubmitted } from "@/lib/leadCapture";

/**
 * Rutas en las que la calculadora omite el modal de captura. Sirve para:
 *   - Acceso de alumnos de la academia (link directo).
 *   - Redirect post-conversion (despues de /gracias el CTA lleva a /libre).
 */
const FREE_ACCESS_PATHS = ["/libre"];

/**
 * Hook que decide si el modal de captura debe abrirse al exportar.
 *
 * Devuelve `submitted=true` (= no abrir modal) si:
 *   - La ruta actual esta en FREE_ACCESS_PATHS (alumnos / post-conversion).
 *   - O el lead ya submitio el form en esta sesion (sessionStorage flag).
 */
export function useLeadCapture() {
  const location = useLocation();
  const isFreeAccess = FREE_ACCESS_PATHS.includes(location.pathname);

  const [submitted, setSubmitted] = useState<boolean>(
    () => isFreeAccess || isLeadSubmitted()
  );

  // Re-evaluar cuando cambia la ruta dentro del SPA
  useEffect(() => {
    setSubmitted(isFreeAccess || isLeadSubmitted());
  }, [isFreeAccess]);

  // Re-sync por si el flag cambio en otra parte (ej: otro tab que comparte sessionStorage)
  useEffect(() => {
    const handler = () => setSubmitted(isFreeAccess || isLeadSubmitted());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [isFreeAccess]);

  const refresh = useCallback(() => {
    setSubmitted(isFreeAccess || isLeadSubmitted());
  }, [isFreeAccess]);

  return { submitted, refresh, isFreeAccess };
}
