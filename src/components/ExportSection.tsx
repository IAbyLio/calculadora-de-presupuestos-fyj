import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { exportToCSV, exportToPDF, ExportData, ExportOptions } from "@/lib/exportUtils";
import { toast } from "sonner";
import { LeadCaptureModal } from "./LeadCaptureModal";
import { useLeadCapture } from "@/hooks/useLeadCapture";

interface ExportSectionProps {
  data: ExportData;
  showAdsCalculator: boolean;
  showAccountDistribution: boolean;
}

type PendingAction = "pdf" | "csv" | null;

export const ExportSection = ({ data, showAdsCalculator, showAccountDistribution }: ExportSectionProps) => {
  const navigate = useNavigate();
  const [options, setOptions] = useState<ExportOptions>({
    includeBlocks: true,
    includeDays: true,
    includeAdsCalculator: true,
    includeAccountDistribution: false
  });
  const [isExporting, setIsExporting] = useState(false);

  // Lead capture gating
  const { submitted: leadSubmitted, refresh: refreshLeadFlag } = useLeadCapture();
  const [modalOpen, setModalOpen] = useState(false);
  const pendingActionRef = useRef<PendingAction>(null);

  // Auto-check account distribution when user adds multiple accounts
  useEffect(() => {
    if (showAccountDistribution) {
      setOptions(prev => ({ ...prev, includeAccountDistribution: true }));
    }
  }, [showAccountDistribution]);

  const handleOptionChange = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const runExportCSV = () => {
    try {
      exportToCSV(data, options);
      toast.success("CSV exportado correctamente");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Error al exportar CSV");
    }
  };

  const runExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(data, options);
      toast.success("PDF exportado correctamente");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (leadSubmitted) {
      runExportCSV();
      return;
    }
    pendingActionRef.current = "csv";
    setModalOpen(true);
  };

  const handleExportPDF = () => {
    if (leadSubmitted) {
      void runExportPDF();
      return;
    }
    pendingActionRef.current = "pdf";
    setModalOpen(true);
  };

  const handleLeadSuccess = async () => {
    refreshLeadFlag();
    const action = pendingActionRef.current;
    pendingActionRef.current = null;

    if (action === "pdf") {
      await runExportPDF();
    } else if (action === "csv") {
      runExportCSV();
    }

    setModalOpen(false);

    // Full reload a /gracias para forzar el redirect aunque jsPDF/blob hayan
    // tocado el history del browser. El download ya iniciado no se cancela.
    setTimeout(() => {
      window.location.href = "/gracias";
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 shadow-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Exportar Resultados</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeBlocks"
                checked={options.includeBlocks}
                onCheckedChange={() => handleOptionChange("includeBlocks")}
              />
              <Label htmlFor="includeBlocks" className="text-sm cursor-pointer">
                Por bloques
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDays"
                checked={options.includeDays}
                onCheckedChange={() => handleOptionChange("includeDays")}
              />
              <Label htmlFor="includeDays" className="text-sm cursor-pointer">
                Por días
              </Label>
            </div>

            {showAdsCalculator && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAdsCalculator"
                  checked={options.includeAdsCalculator}
                  onCheckedChange={() => handleOptionChange("includeAdsCalculator")}
                />
                <Label htmlFor="includeAdsCalculator" className="text-sm cursor-pointer">
                  Calculadora Ads
                </Label>
              </div>
            )}

            {showAccountDistribution && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAccountDistribution"
                  checked={options.includeAccountDistribution}
                  onCheckedChange={() => handleOptionChange("includeAccountDistribution")}
                />
                <Label htmlFor="includeAccountDistribution" className="text-sm cursor-pointer">
                  Cuentas
                </Label>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="flex-1 gap-2 font-semibold text-base shadow-md hover:shadow-lg transition-all active:shadow-pressed active:translate-y-0.5"
            >
              <FileText className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex-1 gap-2 font-semibold text-base shadow-md hover:shadow-lg transition-all active:shadow-pressed active:translate-y-0.5"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Generando..." : "Exportar PDF"}
            </Button>
          </div>
        </div>
      </Card>

      <LeadCaptureModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) pendingActionRef.current = null;
        }}
        onSuccess={handleLeadSuccess}
        budgetValue={data.totalBudget}
        pendingAction={pendingActionRef.current ?? undefined}
      />
    </motion.div>
  );
};
