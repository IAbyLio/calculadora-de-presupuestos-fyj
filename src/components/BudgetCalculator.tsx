import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calculator, Building2 } from "lucide-react";
import { ExportSection } from "./ExportSection";
import { ExportData } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";

interface BlockData {
  block: number;
  days: number;
  total: number;
  dailyBudget: number;
  percentage: number;
  dateRange: string;
}

interface DayData {
  day: number;
  date: string;
  budget: number;
  block: number;
  accumulated: number;
  accumulatedPercent: number;
}

interface BlockDistribution {
  blockNumber: number;
  dateRange: string;
  dailyBudget: number;
  budgetPerCDA: number;
}

interface AccountDistribution {
  account: number;
  percentage: number;
  blockDistributions: BlockDistribution[];
}

export const BudgetCalculator = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStartDate = tomorrow.toISOString().split('T')[0];
  
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const defaultEndDate = dayAfterTomorrow.toISOString().split('T')[0];
  
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [totalDays, setTotalDays] = useState<number>(0);
  const [isManualDaysEdit, setIsManualDaysEdit] = useState(false);
  const [totalBlocks, setTotalBlocks] = useState<number>(1);
  const [numCDAs, setNumCDAs] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [showBlockHelp, setShowBlockHelp] = useState<boolean>(false);
  
  const { toast } = useToast();
  const [view, setView] = useState<"blocks" | "days">("blocks");
  const [order, setOrder] = useState<"descending" | "ascending">("descending");
  const [blocksData, setBlocksData] = useState<BlockData[]>([]);
  const [daysData, setDaysData] = useState<DayData[]>([]);

  // New states for ad calculator
  const [showAdsCalculator, setShowAdsCalculator] = useState(false);
  const [cpmMedioInput, setCpmMedioInput] = useState<string>("6");

  // New states for account distribution
  const [showAccountDistribution, setShowAccountDistribution] = useState(false);
  const [numAccounts, setNumAccounts] = useState<number>(1);
  const [accountPercentagesInput, setAccountPercentagesInput] = useState<string[]>(["100"]);
  const [accountNames, setAccountNames] = useState<string[]>(["Cuenta 1"]);

  // Helper to parse decimal input (supports both "." and "," as decimal separator)
  const parseDecimalInput = (value: string): number => {
    const normalized = value.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    if (!isManualDaysEdit && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setTotalDays(diffDays);
    }
  }, [startDate, endDate, isManualDaysEdit]);

  // Update endDate when totalDays is manually edited
  useEffect(() => {
    if (isManualDaysEdit && startDate && totalDays > 0) {
      const start = new Date(startDate);
      const newEndDate = new Date(start);
      newEndDate.setDate(start.getDate() + totalDays - 1);
      setEndDate(newEndDate.toISOString().split('T')[0]);
      setIsManualDaysEdit(false);
    }
  }, [totalDays, isManualDaysEdit, startDate]);

  // Update account percentages and names when number of accounts changes
  useEffect(() => {
    const equalPercentage = (100 / numAccounts).toFixed(2);
    const newPercentages = Array(numAccounts).fill(equalPercentage);
    setAccountPercentagesInput(newPercentages);
    const newNames = Array(numAccounts).fill(0).map((_, i) => `Cuenta ${i + 1}`);
    setAccountNames(newNames);
  }, [numAccounts]);

  // Reset changePercent when totalBlocks changes
  useEffect(() => {
    if (totalBlocks <= 1) {
      setChangePercent(0);
    } else if (changePercent === 0) {
      setChangePercent(20); // Default value when unlocked
    }
  }, [totalBlocks]);

  const calculate = () => {
    const ratio = 1 - changePercent / 100;

    // firstBlockTotal es siempre el bloque de MAYOR presupuesto (ratio^0). En modo "ascending"
    // reordenamos la secuencia para que el presupuesto crezca con el tiempo.
    let sumRatios = 0;
    for (let i = 0; i < totalBlocks; i++) {
      sumRatios += Math.pow(ratio, i);
    }
    const firstBlockTotal = totalBudget / sumRatios;

    const baseDaysPerBlock = Math.floor(totalDays / totalBlocks);
    const remainingDays = totalDays % totalBlocks;

    // Regla de días extra para mantener coherencia del PRESUPUESTO DIARIO:
    // - descending: los bloques con MENOR presupuesto van al final → reciben los días extra
    // - ascending:  los bloques con MENOR presupuesto van al inicio → reciben los días extra
    const blocks: BlockData[] = [];
    let currentDay = 1;
    const useDates = startDate && endDate;
    const start = startDate ? new Date(startDate) : new Date();

    for (let i = 0; i < totalBlocks; i++) {
      const extraDay =
        order === "ascending"
          ? i < remainingDays
            ? 1
            : 0
          : i >= (totalBlocks - remainingDays)
            ? 1
            : 0;

      const blockDays = baseDaysPerBlock + extraDay;

      // En descending: i=0 es el mayor presupuesto.
      // En ascending: i=0 debe ser el menor presupuesto (invirtiendo el exponente).
      const exponent = order === "descending" ? i : totalBlocks - 1 - i;
      const blockValue = firstBlockTotal * Math.pow(ratio, exponent);

      let dateRange: string;
      if (useDates) {
        const blockStartDate = new Date(start);
        blockStartDate.setDate(start.getDate() + currentDay - 1);
        const blockEndDate = new Date(start);
        blockEndDate.setDate(start.getDate() + currentDay + blockDays - 2);
        dateRange = `${blockStartDate.getDate()}/${blockStartDate.getMonth() + 1} - ${blockEndDate.getDate()}/${blockEndDate.getMonth() + 1}`;
      } else {
        const endDay = currentDay + blockDays - 1;
        dateRange = `Día ${currentDay} - ${endDay}`;
      }

      blocks.push({
        block: i + 1,
        days: blockDays,
        total: blockValue,
        dailyBudget: blockValue / blockDays,
        percentage: (blockValue / totalBudget) * 100,
        dateRange,
      });
      currentDay += blockDays;
    }

    setBlocksData(blocks);

    const days: DayData[] = [];
    let dayCounter = 1;
    let accumulated = 0;
    
    blocks.forEach(block => {
      for (let d = 0; d < block.days; d++) {
        let dateDisplay: string;
        
        if (useDates) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + dayCounter - 1);
          dateDisplay = currentDate.toLocaleDateString('es-ES');
        } else {
          dateDisplay = `Día ${dayCounter}`;
        }
        
        accumulated += block.dailyBudget;
        days.push({
          day: dayCounter,
          date: dateDisplay,
          budget: block.dailyBudget,
          block: block.block,
          accumulated: accumulated,
          accumulatedPercent: accumulated / totalBudget * 100
        });
        dayCounter++;
      }
    });
    setDaysData(days);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getCDABudget = (): number | null => {
    if (!numCDAs || numCDAs <= 0) return null;
    return totalBudget / numCDAs;
  };

  // Calculate ads per ad set (returns raw value before ceiling for dynamic recommendations)
  const calculateAdsPerSetRaw = (): number | null => {
    const cpmMedio = parseDecimalInput(cpmMedioInput);
    if (!numCDAs || numCDAs <= 0 || totalDays <= 0 || totalBudget <= 0 || cpmMedio <= 0) return null;
    const dailyBudget = totalBudget / totalDays;
    const budgetPerCDA = dailyBudget / numCDAs;
    return budgetPerCDA / cpmMedio;
  };

  // Get parsed account percentages
  const getAccountPercentages = (): number[] => {
    return accountPercentagesInput.map(p => parseDecimalInput(p));
  };

  // Calculate account distributions with per-block data
  const calculateAccountDistributions = () => {
    if (totalDays <= 0 || totalBudget <= 0) return [];
    const percentages = getAccountPercentages();
    
    return percentages.map((percentage, idx) => {
      // Calculate per-block distributions
      const blockDistributions = blocksData.map(block => ({
        blockNumber: block.block,
        dateRange: block.dateRange,
        dailyBudget: block.dailyBudget * (percentage / 100),
        budgetPerCDA: numCDAs && numCDAs > 0 ? (block.dailyBudget * (percentage / 100)) / numCDAs : 0
      }));

      return {
        account: idx + 1,
        percentage,
        blockDistributions
      };
    });
  };

  const handlePercentageChange = (index: number, value: string) => {
    const newPercentages = [...accountPercentagesInput];
    newPercentages[index] = value;
    setAccountPercentagesInput(newPercentages);
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...accountNames];
    newNames[index] = value;
    setAccountNames(newNames);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case "equal":
        const equalValue = (100 / numAccounts).toFixed(2);
        setAccountPercentagesInput(Array(numAccounts).fill(equalValue));
        break;
      case "70-30":
        if (numAccounts === 2) setAccountPercentagesInput(["70", "30"]);
        break;
      case "60-40":
        if (numAccounts === 2) setAccountPercentagesInput(["60", "40"]);
        break;
    }
  };

  const totalCalculated = blocksData.reduce((sum, block) => sum + block.total, 0);
  const cdaBudget = getCDABudget();
  const adsPerSetRaw = calculateAdsPerSetRaw();
  const adsPerSet = adsPerSetRaw ? Math.ceil(adsPerSetRaw) : null;
  const minAds = adsPerSet;
  const idealAds = minAds ? Math.ceil(minAds * 1.2) : null;
  const accountDistributions = calculateAccountDistributions();
  const percentageSum = getAccountPercentages().reduce((sum, p) => sum + p, 0);

  return (
    <div className="w-full mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Distribución de Presupuesto Publicitario
              </h1>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="totalBudget">Inversión Total (€)</Label>
                <Input
                  id="totalBudget"
                  type="number"
                  value={totalBudget === 0 ? "" : totalBudget}
                  onChange={e => setTotalBudget(Number(e.target.value) || 0)}
                  placeholder="Ej: 1500"
                  min="0"
                  step="0.01"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Fecha de Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha de Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={e => {
                      const selectedDate = e.target.value;
                      if (startDate && selectedDate < startDate) {
                        toast({
                          title: "Fecha inválida",
                          description: "La fecha de fin debe ser posterior a la fecha de inicio.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setEndDate(selectedDate);
                    }}
                    min={startDate}
                    placeholder="DD/MM/YYYY"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalDays">Días Totales</Label>
                  <Input
                    id="totalDays"
                    type="number"
                    value={totalDays}
                    onChange={e => {
                      setIsManualDaysEdit(true);
                      setTotalDays(Number(e.target.value));
                    }}
                    placeholder="Ej: 15"
                    min="1"
                    step="1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="totalBlocks">Cantidad de Bloques</Label>
                  <Input
                    id="totalBlocks"
                    type="number"
                    value={totalBlocks}
                    onChange={e => setTotalBlocks(Number(e.target.value))}
                    placeholder="Ej: 5"
                    min="1"
                    step="1"
                    className="mt-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBlockHelp(v => !v)}
                    aria-expanded={showBlockHelp}
                    className="mt-2 cursor-pointer text-sm text-primary hover:underline flex items-center gap-1.5 select-none"
                  >
                    <span className={`inline-block transition-transform ${showBlockHelp ? "rotate-90" : ""}`}>▸</span>
                    ¿Qué es un bloque?
                  </button>
                </div>
              </div>

              {showBlockHelp && (
                <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-3 text-foreground">
                  <p>
                    Un bloque es un tramo de días dentro de la campaña en el que el presupuesto diario se mantiene constante. Te sirve para subir o bajar la inversión por etapas en lugar de tirar todo el presupuesto al mismo ritmo de principio a fin.
                  </p>
                  <div>
                    <p className="font-semibold mb-1.5">¿Cuántos bloques usar?</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong className="text-foreground">1 bloque</strong>: presupuesto plano. Útil si ya tenés una campaña madura y solo querés escalarla a un ritmo fijo.</li>
                      <li><strong className="text-foreground">3-5 bloques</strong>: lo más común para lanzamientos. Te permite aumentar gradualmente (estrategia de calentamiento) o bajar para preservar aprendizaje (estrategia de cierre).</li>
                      <li><strong className="text-foreground">6+ bloques</strong>: granularidad fina, útil cuando manejás presupuestos altos y querés controlar la pendiente con precisión.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold mb-1.5">¿Para qué sirve una estrategia de aumento o reducción?</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong className="text-foreground">Aumento</strong>: Meta aprende mejor cuando la inversión sube de a poco. Empezás con presupuesto bajo (~30-50% del target) y subís a lo largo de la campaña. Reduce el riesgo de que el algoritmo se "asuste" con un cambio brusco.</li>
                      <li><strong className="text-foreground">Reducción</strong>: usar al final de un lanzamiento para no quemar presupuesto cuando el ROAS empieza a caer naturalmente, manteniendo presencia hasta el cierre.</li>
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="numCDAs">Cantidad de CDA's (opcional)</Label>
                <Input
                  id="numCDAs"
                  type="number"
                  value={numCDAs || ""}
                  onChange={e => setNumCDAs(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Ej: 3 (dejar vacío si no aplica)"
                  min="1"
                  step="1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="changePercent" className={totalBlocks <= 1 ? "text-muted-foreground" : ""}>
                  Aumento/Reducción por bloque
                </Label>
                <div className="relative">
                  {totalBlocks <= 1 && (
                    <div 
                      className="absolute inset-0 z-10 cursor-not-allowed"
                      onClick={() => {
                        toast({
                          title: "Campo bloqueado",
                          description: "Para editar este campo, el número de bloques de presupuesto de tu campaña debe ser mayor que 1. Edita el campo \"Cantidad de Bloques\" primero.",
                        });
                      }}
                    />
                  )}
                  <Select 
                    value={changePercent.toString()} 
                    onValueChange={value => setChangePercent(Number(value))}
                    disabled={totalBlocks <= 1}
                  >
                    <SelectTrigger 
                      className={`mt-1 ${totalBlocks <= 1 ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60" : ""}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(percent => (
                        <SelectItem key={percent} value={percent.toString()}>
                          {percent}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-center md:justify-end">
                <Button
                  onClick={calculate}
                  className="w-full md:w-auto shadow-md hover:shadow-lg transition-all active:shadow-pressed active:translate-y-0.5"
                  size="lg"
                >
                  Calcular Distribución
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {blocksData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="flex rounded-lg overflow-hidden shadow-md w-full sm:w-auto justify-center">
              <Button
                variant={view === "blocks" ? "default" : "secondary"}
                onClick={() => setView("blocks")}
                className="rounded-none shadow-none hover:shadow-sm transition-all active:shadow-pressed active:translate-y-0.5 flex-1 sm:flex-initial"
              >
                Por Bloques
              </Button>
              <Button
                variant={view === "days" ? "default" : "secondary"}
                onClick={() => setView("days")}
                className="rounded-none shadow-none hover:shadow-sm transition-all active:shadow-pressed active:translate-y-0.5 flex-1 sm:flex-initial"
              >
                Por Días
              </Button>
            </div>

            <div className="relative flex rounded-lg overflow-hidden shadow-md w-full sm:w-auto justify-center">
              {totalBlocks <= 1 && (
                <div
                  className="absolute inset-0 z-10 cursor-not-allowed"
                  onClick={() => {
                    toast({
                      title: "Botón bloqueado",
                      description: "Para alternar entre ascendente y descendente, el número de bloques debe ser mayor que 1. Edita el campo \"Cantidad de Bloques\" primero.",
                    });
                  }}
                />
              )}
              <Button
                variant={order === "descending" ? "default" : "secondary"}
                onClick={() => {
                  setOrder("descending");
                  calculate();
                }}
                disabled={totalBlocks <= 1}
                className={`rounded-none shadow-none hover:shadow-sm transition-all active:shadow-pressed active:translate-y-0.5 flex-1 sm:flex-initial ${totalBlocks <= 1 ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60" : ""}`}
              >
                Descendente
              </Button>
              <Button
                variant={order === "ascending" ? "default" : "secondary"}
                onClick={() => {
                  setOrder("ascending");
                  calculate();
                }}
                disabled={totalBlocks <= 1}
                className={`rounded-none shadow-none hover:shadow-sm transition-all active:shadow-pressed active:translate-y-0.5 flex-1 sm:flex-initial ${totalBlocks <= 1 ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60" : ""}`}
              >
                Ascendente
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              {view === "blocks" ? (
                <table className="w-full">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Bloque</th>
                      <th className="px-4 py-3 text-left">Fechas/Días</th>
                      <th className="px-4 py-3 text-left">Días</th>
                      <th className="px-4 py-3 text-left">Total por bloque</th>
                      <th className="px-4 py-3 text-left">Presupuesto diario</th>
                      {cdaBudget && <th className="px-4 py-3 text-left">Presu. x CDA diario</th>}
                      <th className="px-4 py-3 text-left">% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocksData.map((block, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-border hover:bg-accent/10 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold">Bloque {block.block}</td>
                        <td className="px-4 py-3">{block.dateRange}</td>
                        <td className="px-4 py-3">{block.days}</td>
                        <td className="px-4 py-3 font-mono text-primary font-semibold">
                          {formatCurrency(block.total)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {formatCurrency(block.dailyBudget)}
                        </td>
                        {cdaBudget && (
                          <td className="px-4 py-3 font-mono">
                            {formatCurrency(block.dailyBudget / (numCDAs || 1))}
                          </td>
                        )}
                        <td className="px-4 py-3">{block.percentage.toFixed(1)}%</td>
                      </motion.tr>
                    ))}
                    <tr className="bg-accent/20 font-bold border-t-2 border-primary">
                      <td className="px-4 py-3">TOTAL</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">{totalDays}</td>
                      <td className="px-4 py-3 font-mono text-primary">
                        {formatCurrency(totalCalculated)}
                      </td>
                      <td className="px-4 py-3">—</td>
                      {cdaBudget && <td className="px-4 py-3">—</td>}
                      <td className="px-4 py-3">100%</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Día</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Presupuesto diario</th>
                      {cdaBudget && <th className="px-4 py-3 text-left">Presu. x CDA</th>}
                      <th className="px-4 py-3 text-left">Sumatoria a la fecha</th>
                      <th className="px-4 py-3 text-left">% acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysData.map((day, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border hover:bg-accent/10 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold">Día {day.day}</td>
                        <td className="px-4 py-3">{day.date}</td>
                        <td className="px-4 py-3 font-mono text-primary font-semibold">
                          {formatCurrency(day.budget)}
                        </td>
                        {cdaBudget && (
                          <td className="px-4 py-3 font-mono">
                            {formatCurrency(day.budget / (numCDAs || 1))}
                          </td>
                        )}
                        <td className="px-4 py-3 font-mono">
                          {formatCurrency(day.accumulated)}
                        </td>
                        <td className="px-4 py-3">{day.accumulatedPercent.toFixed(1)}%</td>
                      </motion.tr>
                    ))}
                    <tr className="bg-accent/20 font-bold border-t-2 border-primary">
                      <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                      <td className="px-4 py-3">—</td>
                      {cdaBudget && <td className="px-4 py-3">—</td>}
                      <td className="px-4 py-3 font-mono text-primary">
                        {formatCurrency(totalCalculated)}
                      </td>
                      <td className="px-4 py-3">100%</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {totalBlocks > 1 && (() => {
            const minDailyBudget = blocksData.length > 0
              ? Math.min(...blocksData.map(b => b.dailyBudget))
              : 0;
            const maxDailyBudget = blocksData.length > 0
              ? Math.max(...blocksData.map(b => b.dailyBudget))
              : 0;
            const ratio = minDailyBudget > 0 ? maxDailyBudget / minDailyBudget : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 text-center shadow-md">
                  <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                    Menor inversión diaria
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(minDailyBudget)}
                  </p>
                </Card>
                <Card className="p-6 text-center shadow-md">
                  <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                    Mayor inversión diaria
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(maxDailyBudget)}
                  </p>
                </Card>
                <Card className="p-6 text-center shadow-md">
                  <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">Ratio inicial/final</p>
                  <p className="text-3xl font-bold text-primary">
                    {ratio > 0 ? ratio.toFixed(1) : "0"}x
                  </p>
                </Card>
              </div>
            );
          })()}

          <div className="flex items-center justify-between gap-4 py-2 border-y border-border/60">
            <div className="flex flex-col">
              <Label htmlFor="advancedSettings" className="cursor-pointer">
                Configuraciones Avanzadas
              </Label>
              <span className="text-xs text-muted-foreground mt-0.5">
                Anuncios por conjunto y distribución entre cuentas
              </span>
            </div>
            <Switch
              id="advancedSettings"
              checked={showAdvancedSettings}
              onCheckedChange={setShowAdvancedSettings}
            />
          </div>

          {showAdvancedSettings && (
          <>
          {/* Ad Quantity Calculator Section */}
          <Card className="shadow-md overflow-hidden">
            <button
              onClick={() => setShowAdsCalculator(!showAdsCalculator)}
              className={`w-full p-4 flex items-center justify-between transition-colors ${
                showAdsCalculator
                  ? "bg-card hover:bg-muted text-foreground border-b border-border"
                  : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="font-semibold text-base">Calcular Anuncios por Conjunto</span>
              </div>
              {showAdsCalculator ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            <AnimatePresence>
              {showAdsCalculator && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    {!numCDAs || numCDAs <= 0 ? (
                      <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                        <p>⚠️ Debes definir la cantidad de CDA's (audiencias) en el formulario principal para usar esta calculadora.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cpmMedio">CPM Medio (€)</Label>
                            <Input
                              id="cpmMedio"
                              type="text"
                              inputMode="decimal"
                              value={cpmMedioInput}
                              onChange={e => setCpmMedioInput(e.target.value)}
                              placeholder="Ej: 6"
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              El CPM medio del mercado suele estar en torno a 6€
                            </p>
                          </div>
                          <div className="flex items-end">
                            <div className="w-full p-4 bg-primary/10 rounded-lg text-center">
                              <p className="text-sm text-muted-foreground mb-1">Anuncios por conjunto</p>
                              <p className="text-4xl font-bold text-primary">{adsPerSet || "—"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <p className="text-sm font-semibold text-foreground mb-2">📊 Desglose del cálculo:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Presupuesto diario: {formatCurrency(totalBudget / totalDays)}</li>
                              <li>• Presupuesto por CDA: {formatCurrency((totalBudget / totalDays) / numCDAs)}</li>
                              <li>• CPM medio: {formatCurrency(parseDecimalInput(cpmMedioInput))}</li>
                            </ul>
                          </div>
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <p className="text-sm font-semibold text-foreground mb-2">✅ Recomendaciones:</p>
                            <ul className="text-sm space-y-1">
                              <li
                                className={
                                  adsPerSet && adsPerSet >= (minAds || 6)
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }
                              >
                                • Mínimo recomendado: {minAds || 6} anuncios
                              </li>
                              <li
                                className={
                                  adsPerSet && adsPerSet >= (idealAds || 8)
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-muted-foreground"
                                }
                              >
                                • Ideal si tienes margen: {idealAds || 8} anuncios
                              </li>
                              <li className="text-muted-foreground text-xs mt-2">
                                (Para ~1000 impresiones/día por anuncio)
                              </li>
                            </ul>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Account Distribution Section */}
          <Card className="shadow-md overflow-hidden">
            <button
              onClick={() => setShowAccountDistribution(!showAccountDistribution)}
              className={`w-full p-4 flex items-center justify-between transition-colors ${
                showAccountDistribution
                  ? "bg-card hover:bg-muted text-foreground border-b border-border"
                  : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-semibold text-base">Distribución entre Cuentas Publicitarias</span>
              </div>
              {showAccountDistribution ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            <AnimatePresence>
              {showAccountDistribution && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                      <div className="w-full sm:w-auto">
                        <Label htmlFor="numAccounts">Número de cuentas</Label>
                        <Select value={numAccounts.toString()} onValueChange={value => setNumAccounts(Number(value))}>
                          <SelectTrigger className="mt-1 w-full sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} cuentas
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {numAccounts === 2 && (
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => applyPreset("equal")}>
                            50/50
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => applyPreset("70-30")}>
                            70/30
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => applyPreset("60-40")}>
                            60/40
                          </Button>
                        </div>
                      )}
                      {numAccounts > 2 && (
                        <Button variant="outline" size="sm" onClick={() => applyPreset("equal")}>
                          Equitativo
                        </Button>
                      )}
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 mb-4">
                      💡 <span className="font-medium">Tip:</span> Puedes editar el nombre de las cuentas para no perderte cuando montes tus campañas. 😉
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {accountPercentagesInput.map((percentage, idx) => (
                        <div key={idx}>
                          <Input
                            value={accountNames[idx] || `Cuenta ${idx + 1}`}
                            onChange={e => handleNameChange(idx, e.target.value)}
                            className="text-sm font-medium border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder={`Cuenta ${idx + 1}`}
                          />
                          <Input
                            id={`account-${idx}`}
                            type="text"
                            inputMode="decimal"
                            value={percentage}
                            onChange={e => handlePercentageChange(idx, e.target.value)}
                            className="mt-1"
                            placeholder="%"
                          />
                        </div>
                      ))}
                    </div>

                    {Math.abs(percentageSum - 100) > 0.1 && (
                      <div className="text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                        ⚠️ Los porcentajes suman {percentageSum.toFixed(2)}%. Deben sumar entre 99.9% y 100.1%.
                      </div>
                    )}

                    {Math.abs(percentageSum - 100) <= 0.1 && accountDistributions.length > 0 && (
                      <div className="overflow-x-auto">
                        {blocksData.length <= 1 ? (
                          // Simple view for single block
                          <table className="w-full">
                            <thead className="bg-primary text-primary-foreground">
                              <tr>
                                <th className="px-4 py-3 text-left">Cuenta</th>
                                <th className="px-4 py-3 text-left">Porcentaje</th>
                                <th className="px-4 py-3 text-left">Presupuesto Diario</th>
                                {numCDAs && numCDAs > 0 && <th className="px-4 py-3 text-left">Presu. x CDA</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {accountDistributions.map((account, idx) => (
                                <motion.tr
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="border-b border-border hover:bg-accent/10 transition-colors"
                                >
                                  <td className="px-4 py-3 font-semibold">{accountNames[idx] || `Cuenta ${account.account}`}</td>
                                  <td className="px-4 py-3">{account.percentage.toFixed(2)}%</td>
                                  <td className="px-4 py-3 font-mono text-primary font-semibold">
                                    {formatCurrency(account.blockDistributions[0]?.dailyBudget || 0)}
                                  </td>
                                  {numCDAs && numCDAs > 0 && (
                                    <td className="px-4 py-3 font-mono">{formatCurrency(account.blockDistributions[0]?.budgetPerCDA || 0)}</td>
                                  )}
                                </motion.tr>
                              ))}
                              <tr className="bg-accent/20 font-bold border-t-2 border-primary">
                                <td className="px-4 py-3">TOTAL</td>
                                <td className="px-4 py-3">100%</td>
                                <td className="px-4 py-3 font-mono text-primary">
                                  {formatCurrency(totalBudget / totalDays)}
                                </td>
                                {numCDAs && numCDAs > 0 && <td className="px-4 py-3">—</td>}
                              </tr>
                            </tbody>
                          </table>
                        ) : (
                          // Expanded view for multiple blocks
                          <div className="space-y-4">
                            {accountDistributions.map((account, accIdx) => (
                              <div key={accIdx} className="border border-border rounded-lg overflow-hidden">
                                <div className="bg-secondary/50 px-4 py-2 font-semibold">
                                  {accountNames[accIdx] || `Cuenta ${account.account}`} ({account.percentage.toFixed(2)}%)
                                </div>
                                <table className="w-full">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-sm">Bloque</th>
                                      <th className="px-4 py-2 text-left text-sm">Fechas/Días</th>
                                      <th className="px-4 py-2 text-left text-sm">Presu. Diario</th>
                                      {numCDAs && numCDAs > 0 && <th className="px-4 py-2 text-left text-sm">Presu. x CDA</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {account.blockDistributions.map((block, blockIdx) => (
                                      <tr key={blockIdx} className="border-t border-border hover:bg-accent/10 transition-colors">
                                        <td className="px-4 py-2">Bloque {block.blockNumber}</td>
                                        <td className="px-4 py-2 text-sm">{block.dateRange}</td>
                                        <td className="px-4 py-2 font-mono text-primary font-semibold">
                                          {formatCurrency(block.dailyBudget)}
                                        </td>
                                        {numCDAs && numCDAs > 0 && (
                                          <td className="px-4 py-2 font-mono">{formatCurrency(block.budgetPerCDA)}</td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
          </>
          )}

          {/* Export Section */}
          <ExportSection
            data={{
              totalBudget,
              startDate,
              endDate,
              totalDays,
              totalBlocks,
              numCDAs,
              changePercent,
              order,
              blocksData,
              daysData,
              cpmMedio: parseDecimalInput(cpmMedioInput),
              adsPerSet,
              idealAds,
              accountDistributions,
              accountNames
            } as ExportData}
            showAdsCalculator={showAdvancedSettings && showAdsCalculator && adsPerSet !== null}
            showAccountDistribution={showAdvancedSettings && showAccountDistribution && accountDistributions.length > 0 && numAccounts >= 2}
          />
        </motion.div>
      )}
    </div>
  );
};
