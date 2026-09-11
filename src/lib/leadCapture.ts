/**
 * Envio del lead capturado en la calculadora — Schema v2 (Landing Lead Capture).
 *
 * Destino: webhook n8n self-hosted (GHL Inbound Webhook es premium). El workflow
 * `Calc-Presupuesto-Leads-Webhook` (3nFERJj2WVCXk3SW) recibe el POST, mergea con
 * row existente (skip-null) y upsertea en la Data Table `Calc-Presupuesto-Leads-v2`
 * (5jqghi1rp6K5W2Qu). El Workflow B `Calc-Presupuesto-Leads-GHL-Sync`
 * (sjid60AWSgNOzEjA, cron 1h) lleva las rows `pending` a GHL Contacts.
 *
 * Dos caminos hacia `lead_submitted`:
 *   - Por email (modal): `submitLead()`. Lanza si el webhook no responde OK —
 *     el modal muestra el error y la exportacion no arranca.
 *   - Por identidad (`?k=` / `fyj_cid`, ver contactIdentity.ts):
 *     `submitLeadByIdentity()`. `contact_id` en la raiz, `contact` con email y
 *     nombre vacios, `consent: true` (el contacto llega desde un correo nuestro).
 *     UN unico POST por id; fire-and-forget: nunca bloquea ni rompe la
 *     exportacion. No dispara eventos de conversion del pixel (no es un lead nuevo).
 *
 * El registro se recuerda en localStorage (`fyj_calc_lead_submitted_v1`); se sigue
 * leyendo la misma clave en sessionStorage, donde vivia antes, para no volver a
 * pedirle el email a quien lo dio hoy.
 *
 * Si `VITE_LEAD_WEBHOOK_URL` no esta seteada, modo mock (console.info + delay).
 */

import { AttributionParams, getCapturedAttribution } from "./utmCapture";
import { getFbc, getFbp } from "./metaCookies";

export interface LeadFormData {
  name: string;
  email: string;
  consent: boolean;
}

export interface LeadPayload {
  stage: "lead_submitted";
  /** Solo en el camino por identidad: id del contacto de GHL (`?k=` / `fyj_cid`). */
  contact_id?: string;
  contact: {
    email: string;
    name: string;
  };
  consent: boolean;
  custom_fields: {
    valor_presupuesto_calculado?: number;
    landing_variant: "v1";
    lead_magnet: "calculadora-presupuesto";
  };
  source: {
    utm: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
    };
    gclid?: string;
    fbclid?: string;
    referrer?: string;
    landing_url?: string;
  };
  submitted_at: string;
  event_id: string;
  fbp?: string;
  fbc?: string;
}

export interface SubmitLeadResult {
  eventId: string;
}

export interface SubmitLeadOptions {
  /** Valor del presupuesto calculado en el momento del submit */
  budgetValue?: number;
}

const SUBMITTED_KEY = "fyj_calc_lead_submitted_v1";
/** Ultimo contact_id por el que ya se mando `lead_submitted` (un POST por id). */
const IDENTITY_POSTED_KEY = "fyj_calc_lead_identity_v1";

function generateEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function buildPayload(
  contact: LeadPayload["contact"],
  consent: boolean,
  options: SubmitLeadOptions,
  eventId: string
): LeadPayload {
  const attr: AttributionParams = getCapturedAttribution();
  return {
    stage: "lead_submitted",
    contact,
    consent,
    custom_fields: {
      valor_presupuesto_calculado: options.budgetValue,
      landing_variant: "v1",
      lead_magnet: "calculadora-presupuesto",
    },
    source: {
      utm: {
        utm_source: attr.utm_source,
        utm_medium: attr.utm_medium,
        utm_campaign: attr.utm_campaign,
        utm_term: attr.utm_term,
        utm_content: attr.utm_content,
      },
      gclid: attr.gclid,
      fbclid: attr.fbclid,
      referrer: attr.referrer,
      landing_url: attr.landing_url ?? (typeof window !== "undefined" ? window.location.href : undefined),
    },
    submitted_at: new Date().toISOString(),
    event_id: eventId,
    fbp: getFbp(),
    fbc: getFbc(),
  };
}

function getWebhookUrl(): string | undefined {
  return import.meta.env.VITE_LEAD_WEBHOOK_URL as string | undefined;
}

export async function submitLead(
  formData: LeadFormData,
  options: SubmitLeadOptions = {}
): Promise<SubmitLeadResult> {
  const eventId = generateEventId();
  const payload = buildPayload(
    {
      email: formData.email.trim().toLowerCase(),
      name: formData.name.trim(),
    },
    formData.consent === true,
    options,
    eventId
  );
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    console.info("[LeadCapture MOCK] webhook no configurado. Payload v2 que se enviaria:", payload);
    await new Promise(resolve => setTimeout(resolve, 600));
    markLeadSubmitted();
    return { eventId };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Lead webhook respondio ${response.status}`);
  }

  markLeadSubmitted();
  return { eventId };
}

/**
 * `lead_submitted` por identidad. Se marca el id como enviado al despachar (no al
 * responder): un POST por id, sin reintentos, igual que la checklist y los 50
 * formatos. Devuelve una promesa que NUNCA rechaza — la exportacion sigue aunque
 * el webhook este caido. Devuelve `null` si ese id ya se habia enviado.
 */
export function submitLeadByIdentity(
  contactId: string,
  options: SubmitLeadOptions = {}
): Promise<SubmitLeadResult | null> {
  if (isIdentityPosted(contactId)) return Promise.resolve(null);
  markIdentityPosted(contactId);
  markLeadSubmitted();

  const eventId = generateEventId();
  const payload = buildPayload({ email: "", name: "" }, true, options, eventId);
  payload.contact_id = contactId;
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    console.info("[LeadCapture MOCK] webhook no configurado. Payload por identidad que se enviaria:", payload);
    return Promise.resolve({ eventId });
  }

  try {
    return fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(() => ({ eventId }))
      .catch(() => ({ eventId }));
  } catch {
    return Promise.resolve({ eventId });
  }
}

export function isLeadSubmitted(): boolean {
  try {
    if (localStorage.getItem(SUBMITTED_KEY) === "true") return true;
  } catch {
    // sin localStorage: cae a la clave de sesion
  }
  try {
    return sessionStorage.getItem(SUBMITTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markLeadSubmitted(): void {
  let persisted = false;
  try {
    localStorage.setItem(SUBMITTED_KEY, "true");
    persisted = true;
  } catch {
    // sin localStorage: al menos que dure la sesion
  }
  if (persisted) return;
  try {
    sessionStorage.setItem(SUBMITTED_KEY, "true");
  } catch {
    // ignore
  }
}

function isIdentityPosted(contactId: string): boolean {
  try {
    return localStorage.getItem(IDENTITY_POSTED_KEY) === contactId;
  } catch {
    return false;
  }
}

function markIdentityPosted(contactId: string): void {
  try {
    localStorage.setItem(IDENTITY_POSTED_KEY, contactId);
  } catch {
    // ignore
  }
}
