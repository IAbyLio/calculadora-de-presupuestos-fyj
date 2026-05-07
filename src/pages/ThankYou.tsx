import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo-flor-y-julio.png";
import { trackEvent } from "@/lib/metaPixel";

const ThankYou = () => {
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
          <Card className="p-8 md:p-10 shadow-lg space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-accent/40 p-4">
                <CheckCircle2 className="h-12 w-12 text-secondary" strokeWidth={2} />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                ¡Listo! Te lo enviamos a tu email
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Tu PDF se está descargando ahora mismo. Además, te llegará a tu email
                junto con material complementario para sacarle el máximo a tu presupuesto.
              </p>
            </div>

            <div className="pt-2">
              <Button
                asChild
                size="lg"
                className="gap-2 font-semibold text-base shadow-md hover:shadow-lg transition-all active:shadow-pressed active:translate-y-0.5"
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
