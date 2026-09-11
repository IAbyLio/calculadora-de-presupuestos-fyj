import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isLeadSubmitted } from "@/lib/leadCapture";
import { getContactId } from "@/lib/contactIdentity";

/**
 * Rutas en las que la calculadora omite el modal de captura. Sirve para:
 *   - Acceso de alumnos de la academia (link directo).
 *   - Redirect post-conversion (despues de /gracias el CTA lleva a /libre).
 */
const FREE_ACCESS_PATHS = ["/libre"];

/**
 * Hook que decide que pasa al exportar.
 *
 * Devuelve `submitted=true` (= exportar directo, sin modal ni POST) si:
 *   - La ruta actual esta en FREE_ACCESS_PATHS (alumnos / post-conversion).
 *   - O el lead ya se registro (localStorage, o la clave vieja de sesion).
 *
 * Devuelve `contactId` (string) si hay identidad vigente (`?k=` / `fyj_cid`,
 * ver lib/contactIdentity.ts). Con identidad y sin registro previo, el que
 * exporta manda `lead_submitted` por identidad y exporta sin modal.
 */
export function useLeadCapture() {
  const location = useLocation();
  const isFreeAccess = FREE_ACCESS_PATHS.includes(location.pathname);

  const [submitted, setSubmitted] = useState<boolean>(
    () => isFreeAccess || isLeadSubmitted()
  );
  const [contactId, setContactId] = useState<string | null>(() => getContactId());

  // Re-evaluar cuando cambia la ruta dentro del SPA
  useEffect(() => {
    setSubmitted(isFreeAccess || isLeadSubmitted());
    setContactId(getContactId());
  }, [isFreeAccess]);

  // Re-sync por si el flag cambio en otra parte (ej: otra pestana del mismo origen)
  useEffect(() => {
    const handler = () => {
      setSubmitted(isFreeAccess || isLeadSubmitted());
      setContactId(getContactId());
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [isFreeAccess]);

  const refresh = useCallback(() => {
    setSubmitted(isFreeAccess || isLeadSubmitted());
    setContactId(getContactId());
  }, [isFreeAccess]);

  return { submitted, contactId, refresh, isFreeAccess };
}
