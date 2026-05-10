/**
 * Envio del lead capturado en la calculadora — Schema v2 (Landing Lead Capture).
 *
 * Destino: webhook n8n self-hosted (GHL Inbound Webhook es premium). El workflow
 * `Calc-Presupuesto-Leads-Webhook` (3nFERJj2WVCXk3SW) recibe el POST, mergea con
 * row existente (skip-null) y upsertea en la Data Table `Calc-Presupuesto-Leads`
 * (AvZl3If4m6aDeb6C). Fase 1.C posterior sincronizara a GHL Contacts.
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

function generateEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function buildPayload(
  formData: LeadFormData,
  options: SubmitLeadOptions,
  eventId: string
): LeadPayload {
  const attr: AttributionParams = getCapturedAttribution();
  return {
    stage: "lead_submitted",
    contact: {
      email: formData.email.trim().toLowerCase(),
      name: formData.name.trim(),
    },
    consent: formData.consent === true,
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

export async function submitLead(
  formData: LeadFormData,
  options: SubmitLeadOptions = {}
): Promise<SubmitLeadResult> {
  const eventId = generateEventId();
  const payload = buildPayload(formData, options, eventId);
  const webhookUrl = import.meta.env.VITE_LEAD_WEBHOOK_URL as string | undefined;

  if (!webhookUrl) {
    // eslint-disable-next-line no-console
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

export function isLeadSubmitted(): boolean {
  try {
    return sessionStorage.getItem(SUBMITTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markLeadSubmitted(): void {
  try {
    sessionStorage.setItem(SUBMITTED_KEY, "true");
  } catch {
    // ignore
  }
}
