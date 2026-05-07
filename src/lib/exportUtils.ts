import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoFlorYJulio from '@/assets/logo-flor-y-julio.png';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

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

export interface ExportData {
  totalBudget: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalBlocks: number;
  numCDAs: number | null;
  changePercent: number;
  order: string;
  blocksData: BlockData[];
  daysData: DayData[];
  cpmMedio: number | null;
  adsPerSet: number | null;
  idealAds: number | null;
  accountDistributions: AccountDistribution[];
  accountNames: string[];
}

export interface ExportOptions {
  includeBlocks: boolean;
  includeDays: boolean;
  includeAdsCalculator: boolean;
  includeAccountDistribution: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES');
};

const getFileName = (extension: string): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
  return `presupuesto_${dateStr}_${timeStr}.${extension}`;
};

// ============= CSV EXPORT =============
export const exportToCSV = (data: ExportData, options: ExportOptions): void => {
  const lines: string[] = [];
  const sep = ';';

  // BOM for UTF-8
  const BOM = '\uFEFF';

  // Header section
  lines.push('CALCULADORA DE PRESUPUESTO PUBLICITARIO');
  lines.push(`Generado el${sep}${new Date().toLocaleString('es-ES')}`);
  lines.push('');

  // Parameters section
  lines.push('PARÁMETROS DEL CÁLCULO');
  lines.push(`Inversión Total${sep}${formatCurrency(data.totalBudget)}`);
  lines.push(`Fecha Inicio${sep}${formatDate(data.startDate)}`);
  lines.push(`Fecha Fin${sep}${formatDate(data.endDate)}`);
  lines.push(`Días Totales${sep}${data.totalDays}`);
  lines.push(`Bloques${sep}${data.totalBlocks}`);
  if (data.numCDAs) {
    lines.push(`CDAs${sep}${data.numCDAs}`);
  }
  lines.push(`Ratio de Cambio${sep}${data.changePercent}%`);
  lines.push(`Orden${sep}${data.order === 'descending' ? 'Descendente' : 'Ascendente'}`);
  lines.push('');

  // Blocks section
  if (options.includeBlocks && data.blocksData.length > 0) {
    lines.push('DISTRIBUCIÓN POR BLOQUES');
    const blockHeaders = ['Bloque', 'Fechas', 'Días', 'Total', 'Presupuesto Diario'];
    if (data.numCDAs) blockHeaders.push('Presu. x CDA');
    blockHeaders.push('% del Total');
    lines.push(blockHeaders.join(sep));

    data.blocksData.forEach(block => {
      const row = [
        `Bloque ${block.block}`,
        block.dateRange,
        block.days.toString(),
        formatCurrency(block.total),
        formatCurrency(block.dailyBudget)
      ];
      if (data.numCDAs) {
        row.push(formatCurrency(block.dailyBudget / data.numCDAs));
      }
      row.push(`${block.percentage.toFixed(2)}%`);
      lines.push(row.join(sep));
    });
    lines.push('');
  }

  // Days section
  if (options.includeDays && data.daysData.length > 0) {
    lines.push('DISTRIBUCIÓN POR DÍAS');
    const dayHeaders = ['Día', 'Fecha', 'Presupuesto'];
    if (data.numCDAs) dayHeaders.push('Presu. x CDA');
    dayHeaders.push('Acumulado', '% Acumulado', 'Bloque');
    lines.push(dayHeaders.join(sep));

    data.daysData.forEach(day => {
      const row = [
        day.day.toString(),
        day.date,
        formatCurrency(day.budget)
      ];
      if (data.numCDAs) {
        row.push(formatCurrency(day.budget / data.numCDAs));
      }
      row.push(formatCurrency(day.accumulated), `${day.accumulatedPercent.toFixed(2)}%`, `Bloque ${day.block}`);
      lines.push(row.join(sep));
    });
    lines.push('');
  }

  // Ads calculator section
  if (options.includeAdsCalculator && data.cpmMedio && data.adsPerSet) {
    lines.push('CALCULADORA DE ANUNCIOS');
    lines.push(`CPM Medio${sep}${formatCurrency(data.cpmMedio)}`);
    lines.push(`Anuncios Mínimos por Set${sep}${data.adsPerSet}`);
    lines.push(`Anuncios Ideales por Set${sep}${data.idealAds || '-'}`);
    lines.push('');
  }

  // Account distribution section
  if (options.includeAccountDistribution && data.accountDistributions.length > 0) {
    lines.push('DISTRIBUCIÓN POR CUENTAS');
    
    data.accountDistributions.forEach((account, idx) => {
      const accountName = data.accountNames[idx] || `Cuenta ${account.account}`;
      lines.push(`${accountName} (${account.percentage.toFixed(2)}%)`);
      
      const accHeaders = ['Bloque', 'Fechas', 'Presu. Diario'];
      if (data.numCDAs) accHeaders.push('Presu. x CDA');
      lines.push(accHeaders.join(sep));

      account.blockDistributions.forEach(block => {
        const row = [
          `Bloque ${block.blockNumber}`,
          block.dateRange,
          formatCurrency(block.dailyBudget)
        ];
        if (data.numCDAs) {
          row.push(formatCurrency(block.budgetPerCDA));
        }
        lines.push(row.join(sep));
      });
      lines.push('');
    });
  }

  // Download
  const content = BOM + lines.join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getFileName('csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============= PDF EXPORT =============
const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};

export const exportToPDF = async (data: ExportData, options: ExportOptions): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Corporate colors (Flor y Julio brand)
  // Primary: Red #fb4b2d | Secondary: Bottle Green #14372e | Accent: Lime #d4e6ae
  const primaryColor: [number, number, number] = [251, 75, 45]; // Red - used for headers
  const secondaryColor: [number, number, number] = [20, 55, 46]; // Bottle green - used for text
  const headerTextColor: [number, number, number] = [255, 255, 255];
  const alternateRowColor: [number, number, number] = [242, 248, 232]; // Light lime tint

  // Load logo
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadImageAsBase64(logoFlorYJulio);
  } catch (error) {
    console.warn('Could not load logo:', error);
  }

  // Helper function to add watermark (semi-transparent logo in center)
  const addWatermark = () => {
    if (logoBase64) {
      try {
        const watermarkSize = 80;
        const centerX = (pageWidth - watermarkSize) / 2;
        const centerY = (pageHeight - watermarkSize) / 2;
        
        // Create a semi-transparent version using canvas
        const img = new Image();
        img.src = logoBase64;
        
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.globalAlpha = 0.08;
          ctx.drawImage(img, 0, 0, 200, 200);
          const watermarkBase64 = canvas.toDataURL('image/png');
          doc.addImage(watermarkBase64, 'PNG', centerX, centerY, watermarkSize, watermarkSize);
        }
      } catch (e) {
        console.warn('Could not add watermark:', e);
      }
    }
  };

  // Helper function to add header
  const addHeader = () => {
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, 10, 25, 25);
    }
    doc.setFontSize(18);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Calculadora de Presupuesto Publicitario', logoBase64 ? margin + 30 : margin, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, logoBase64 ? margin + 30 : margin, 30);
    
    return 42;
  };

  // Helper function to add footer
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text('Flor y Julio', pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // Helper to check if we need a new page
  const checkNewPage = (neededSpace: number): void => {
    if (yPos + neededSpace > pageHeight - 20) {
      doc.addPage();
      addWatermark();
      yPos = margin + 10;
    }
  };

  // Add watermark to first page
  addWatermark();

  // Add header
  yPos = addHeader();

  // Parameters section
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Parámetros del Cálculo', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('helvetica', 'normal');

  const params = [
    [`Inversión Total: ${formatCurrency(data.totalBudget)}`, `Bloques: ${data.totalBlocks}`],
    [`Período: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}`, `Días: ${data.totalDays}`],
    [`Ratio de cambio: ${data.changePercent}%`, `Orden: ${data.order === 'descending' ? 'Descendente' : 'Ascendente'}`]
  ];
  if (data.numCDAs) {
    params.push([`CDAs: ${data.numCDAs}`, '']);
  }

  params.forEach(row => {
    doc.text(row[0], margin, yPos);
    if (row[1]) doc.text(row[1], pageWidth / 2, yPos);
    yPos += 6;
  });
  yPos += 8;

  // Blocks table
  if (options.includeBlocks && data.blocksData.length > 0) {
    checkNewPage(40);
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Bloques', margin, yPos);
    yPos += 4;

    const blockHeaders = ['Bloque', 'Fechas', 'Días', 'Total', 'Diario'];
    if (data.numCDAs) blockHeaders.push('x CDA');
    blockHeaders.push('%');

    const blockBody = data.blocksData.map(block => {
      const row = [
        `Bloque ${block.block}`,
        block.dateRange,
        block.days.toString(),
        formatCurrency(block.total),
        formatCurrency(block.dailyBudget)
      ];
      if (data.numCDAs) {
        row.push(formatCurrency(block.dailyBudget / data.numCDAs));
      }
      row.push(`${block.percentage.toFixed(1)}%`);
      return row;
    });

    autoTable(doc, {
      head: [blockHeaders],
      body: blockBody,
      startY: yPos,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: headerTextColor,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: secondaryColor
      },
      alternateRowStyles: {
        fillColor: alternateRowColor
      },
      theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY + 12;
  }

  // Days table
  if (options.includeDays && data.daysData.length > 0) {
    checkNewPage(40);
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Días', margin, yPos);
    yPos += 4;

    const dayHeaders = ['Día', 'Fecha', 'Presupuesto'];
    if (data.numCDAs) dayHeaders.push('x CDA');
    dayHeaders.push('Acumulado', '% Acum.', 'Bloque');

    const dayBody = data.daysData.map(day => {
      const row = [
        day.day.toString(),
        day.date,
        formatCurrency(day.budget)
      ];
      if (data.numCDAs) {
        row.push(formatCurrency(day.budget / data.numCDAs));
      }
      row.push(formatCurrency(day.accumulated), `${day.accumulatedPercent.toFixed(1)}%`, `B${day.block}`);
      return row;
    });

    autoTable(doc, {
      head: [dayHeaders],
      body: dayBody,
      startY: yPos,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: headerTextColor,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: secondaryColor
      },
      alternateRowStyles: {
        fillColor: alternateRowColor
      },
      theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY + 12;
  }

  // Ads calculator section
  if (options.includeAdsCalculator && data.cpmMedio && data.adsPerSet) {
    checkNewPage(35);
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Calculadora de Anuncios', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`CPM Medio: ${formatCurrency(data.cpmMedio)}`, margin, yPos);
    yPos += 6;
    doc.text(`Anuncios Mínimos por Set: ${data.adsPerSet}`, margin, yPos);
    yPos += 6;
    doc.text(`Anuncios Ideales por Set: ${data.idealAds || '-'}`, margin, yPos);
    yPos += 12;
  }

  // Account distribution section
  if (options.includeAccountDistribution && data.accountDistributions.length > 0) {
    checkNewPage(40);
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Cuentas', margin, yPos);
    yPos += 8;

    data.accountDistributions.forEach((account, idx) => {
      const accountName = data.accountNames[idx] || `Cuenta ${account.account}`;
      checkNewPage(30);
      
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${accountName} (${account.percentage.toFixed(2)}%)`, margin, yPos);
      yPos += 4;

      const accHeaders = ['Bloque', 'Fechas', 'Presu. Diario'];
      if (data.numCDAs) accHeaders.push('Presu. x CDA');

      const accBody = account.blockDistributions.map(block => {
        const row = [
          `Bloque ${block.blockNumber}`,
          block.dateRange,
          formatCurrency(block.dailyBudget)
        ];
        if (data.numCDAs) {
          row.push(formatCurrency(block.budgetPerCDA));
        }
        return row;
      });

      autoTable(doc, {
        head: [accHeaders],
        body: accBody,
        startY: yPos,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: secondaryColor,
          textColor: headerTextColor,
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 8,
          textColor: secondaryColor
        },
        alternateRowStyles: {
          fillColor: alternateRowColor
        },
        theme: 'grid'
      });

      yPos = doc.lastAutoTable.finalY + 8;
    });
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Save PDF
  doc.save(getFileName('pdf'));
};
