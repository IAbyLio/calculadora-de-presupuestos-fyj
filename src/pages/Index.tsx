import { BudgetCalculator } from "@/components/BudgetCalculator";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo-flor-y-julio.png";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
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
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:py-12">
        <BudgetCalculator />
      </main>

      <footer className="border-t border-border/40 bg-background/95 backdrop-blur mt-16">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Flor & Julio - Agencia de publicidad online y tráfico</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
