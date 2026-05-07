import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { submitLead } from "@/lib/leadCapture";

/**
 * Modal de captura de lead que se interpone antes de exportar PDF/CSV.
 *
 * - Validacion con react-hook-form + zod.
 * - Anti-bot minimo: honeypot field invisible + minimo 1500ms desde mount.
 * - Submit -> POST a webhook GHL (o mock si no hay env var) -> onSuccess
 *   se ejecuta el callback que dispara el export real.
 */

const schema = z.object({
  email: z
    .string()
    .trim()
    .email("Email invalido"),
  consent: z.literal<boolean>(true, {
    errorMap: () => ({ message: "Tienes que aceptar para continuar" }),
  }),
  // Honeypot: si llega con valor es bot
  website: z.string().max(0, "bot").optional(),
});

type FormValues = z.infer<typeof schema>;

interface LeadCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Valor del presupuesto al momento de la captura (opcional, va al webhook) */
  budgetValue?: number;
  /** Que accion va a disparar despues del submit (para el copy del CTA) */
  pendingAction?: "pdf" | "csv";
}

const MIN_DWELL_MS = 1500;

export const LeadCaptureModal = ({
  open,
  onOpenChange,
  onSuccess,
  budgetValue,
  pendingAction,
}: LeadCaptureModalProps) => {
  const mountedAtRef = useRef<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      consent: false,
      website: "",
    },
  });

  // Reset timer cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      mountedAtRef.current = Date.now();
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (values.website && values.website.length > 0) {
      // bot: silencio + cerrar (sin pista)
      onOpenChange(false);
      return;
    }

    const dwell = Date.now() - mountedAtRef.current;
    if (dwell < MIN_DWELL_MS) {
      toast.error("Espera un segundo antes de enviar");
      return;
    }

    setSubmitting(true);
    try {
      await submitLead(
        {
          email: values.email,
          consent: values.consent,
        },
        { budgetValue }
      );

      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("track", "Lead");
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast.error("No pudimos registrar tus datos. Probemos de nuevo");
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel = submitting
    ? "Descargando..."
    : pendingAction === "pdf"
    ? "Descargar PDF"
    : pendingAction === "csv"
    ? "Descargar CSV"
    : "Descargar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargá tu plan de presupuesto</DialogTitle>
          <DialogDescription>
            Déjanos tu email y la descarga arranca al instante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Honeypot — invisible para humanos, leido por bots */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              top: "-9999px",
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <Label htmlFor="website-honeypot">Sitio web (no llenar)</Label>
            <Input
              id="website-honeypot"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...form.register("website")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-email">
              Tu mejor email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="lead-consent"
              checked={form.watch("consent")}
              onCheckedChange={(checked) =>
                form.setValue("consent", checked === true, { shouldValidate: true })
              }
              className="mt-0.5"
            />
            <Label
              htmlFor="lead-consent"
              className="text-sm font-normal leading-snug cursor-pointer"
            >
              Acepto que Flor &amp; Julio Agencia me contacte por email con material
              relacionado a publicidad online y tráfico.
            </Label>
          </div>
          {form.formState.errors.consent && (
            <p className="text-sm text-destructive">{form.formState.errors.consent.message}</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full font-semibold text-base shadow-md hover:shadow-lg transition-all active:shadow-pressed active:translate-y-0.5"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ctaLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
