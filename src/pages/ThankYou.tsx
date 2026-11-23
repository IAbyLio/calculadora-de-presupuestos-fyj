import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Calculator, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo-flor-y-julio.png";
import { trackEvent } from "@/lib/metaPixel";

const ThankYou = () => {
  // "pdf" | "csv" desde ExportSection; si se recarga /gracias no hay state → título genérico.
  const formato = (useLocation().state as { formato?: string } | null)?.formato;
  const titulo =
    formato === "pdf"
      ? "¡Listo! Tu PDF se ha descargado"
      : formato === "csv"
        ? "¡Listo! Tu CSV se ha descargado"
        : "¡Listo! Tu presupuesto se ha descargado";

  useEffect(() => {
    trackEvent("CompleteRegistration");
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-accent/10">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          <a
            href="https://floryjulioagencia.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <img
              src={logo}
              alt="Flor & Julio - Agencia de publicidad online y tráfico"
              className="h-12 md:h-16 w-auto"
            />
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl"
        >
          <Card className="p-6 md:p-10 shadow-lg space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-accent/40 p-4">
                <CheckCircle2 className="h-12 w-12 text-secondary" strokeWidth={2} />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {titulo}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Revísalo en tu carpeta de descargas y empieza a aplicar el plan a tus campañas.
              </p>
            </div>

            {/* Aviso del email de entrega (decisión de Lio 2026-11-23): el enlace lleva ?k=<contact_id>
                y desde él la checklist y los 50 formatos no piden registro (contrato fyj_cid). */}
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-accent/20 p-4 text-left">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-foreground/80" aria-hidden="true" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                En unos minutos te llegará un email con el enlace, para que lo tengas a mano. Si entras
                desde ese enlace, tendrás también el resto de recursos sin volver a registrarte.
              </p>
            </div>

            <div className="pt-2">
              <Button
                asChild
                size="lg"
                className="h-auto w-full min-h-11 whitespace-normal px-4 py-3 sm:w-auto sm:px-8 gap-2 font-semibold text-[15px] sm:text-base shadow-md hover:shadow-lg transition-all active:shadow-pressed active:translate-y-0.5"
              >
                <Link to="/libre">
                  <Calculator className="h-5 w-5" />
                  Calcular un nuevo presupuesto
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              Si no aparece la descarga en unos segundos, revisa el bloqueador de
              pop-ups de tu navegador.
            </p>
          </Card>
        </motion.div>
      </main>

      <footer className="mt-16 border-t border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Flor & Julio - Agencia de publicidad online y tráfico</p>
        </div>
      </footer>
    </div>
  );
};

export default ThankYou;
