import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_CORETERRA_BASE64 } from './billingInvoicePDF';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);
};

const getCompanySettings = () => {
  let companySettings = { companyName: 'PT. Coreterra Geo Engineering', logoBase64: '' };
  try {
    const settingsString = localStorage.getItem('ansa-settings-storage');
    if (settingsString) {
      const parsed = JSON.parse(settingsString);
      if (parsed?.state?.settings) {
        companySettings = { ...parsed.state.settings };
      }
    }
  } catch (e) {}

  // Auto-correct spelling and default fallback
  if (companySettings.companyName) {
    companySettings.companyName = companySettings.companyName.replace(/Enginering/gi, 'Engineering');
  }
  if (!companySettings.logoBase64) {
    companySettings.logoBase64 = LOGO_CORETERRA_BASE64;
  }
  return companySettings;
};

const addHeaderWithLogo = (doc: jsPDF, title: string, periodStr: string, isConsolidatedCover: boolean = false) => {
  const settings = getCompanySettings();
  const logoData = settings.logoBase64 || LOGO_CORETERRA_BASE64;
  
  if (isConsolidatedCover) {
    let logoEndY = 80;
    if (logoData) {
      try {
        const imgProps = doc.getImageProperties(logoData);
        const maxW = 75; // max width in mm
        const maxH = 26; // max height in mm
        const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
        const imgW = imgProps.width * ratio;
        const imgH = imgProps.height * ratio;
        const imgX = (210 - imgW) / 2; // perfectly centered
        const imgY = 45;
        doc.addImage(logoData, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST');
        logoEndY = imgY + imgH;
      } catch (e) {
        console.error('Failed to add cover logo:', e);
      }
    }
    
    // Company Name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(140, 95, 52); // CoreTerra Terracotta Bronze #8C5F34
    doc.text(settings.companyName || 'PT. Coreterra Geo Engineering', 105, logoEndY + 12, { align: 'center' });
    
    // Decorative Accent Line
    doc.setDrawColor(212, 175, 55); // Regal Gold
    doc.setLineWidth(0.8);
    doc.line(75, logoEndY + 18, 135, logoEndY + 18);

    // Document Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 40, 70); // Deep Navy Slate
    doc.text('CONSOLIDATED FINANCIAL REPORTS', 105, logoEndY + 32, { align: 'center' });
    
    // Period Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${periodStr}`, 105, logoEndY + 40, { align: 'center' });
    return logoEndY + 60; // Next Y
  }

  // Normal Page Header
  if (logoData) {
    try {
      const imgProps = doc.getImageProperties(logoData);
      const maxW = 42;
      const maxH = 14;
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      const imgW = imgProps.width * ratio;
      const imgH = imgProps.height * ratio;
      doc.addImage(logoData, 'PNG', 14, 10 + (14 - imgH) / 2, imgW, imgH, undefined, 'FAST');
    } catch (e) {
      console.error('Failed to add page header logo:', e);
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = pageWidth - 14;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 95, 52);
  doc.text(settings.companyName || 'PT. Coreterra Geo Engineering', rightMargin, 14, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(20, 60, 100);
  doc.text(title, rightMargin, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${periodStr}`, rightMargin, 26, { align: 'right' });
  
  doc.setDrawColor(212, 175, 55); // Gold divider
  doc.setLineWidth(0.5);
  doc.line(14, 30, rightMargin, 30);

  return 38; // Next Y
};

const formatIndoDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12 && !isNaN(year)) {
        return `${day} ${monthNames[monthIdx]} ${year}`;
      }
    }
  } catch (e) {}
  return dateStr;
};

const drawWatermark = (doc: jsPDF) => {
  const settings = getCompanySettings();
  const logoData = settings.logoBase64 || LOGO_CORETERRA_BASE64;
  if (!logoData) return;

  try {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgProps = doc.getImageProperties(logoData);
    
    // Watermark width: 110mm, maintain aspect ratio
    const maxW = 110;
    const maxH = 42;
    const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
    const imgW = imgProps.width * ratio;
    const imgH = imgProps.height * ratio;
    
    const x = (pageWidth - imgW) / 2;
    const y = (pageHeight - imgH) / 2;

    doc.saveGraphicsState();
    const gs = new (doc as any).GState({ opacity: 0.08 });
    (doc as any).setGState(gs);
    doc.addImage(logoData, 'PNG', x, y, imgW, imgH, undefined, 'FAST');
    doc.restoreGraphicsState();
  } catch (e) {
    console.error('Failed to draw watermark:', e);
  }
};

const addReportHeader = (doc: jsPDF, primaryTitle: string, secondaryTitle: string, startDate: string, endDate: string) => {
  const settings = getCompanySettings();
  const companyName = settings.companyName || 'PT. CoreTerra Geo Engineering';
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isLandscape = pageWidth > pageHeight;
  const centerX = pageWidth / 2;
  const leftMargin = 14;
  const rightMargin = pageWidth - 14;

  let periodStr = '';
  if (startDate && endDate) {
    periodStr = `${startDate} s/d ${endDate}`;
  } else if (startDate) {
    periodStr = startDate;
  }

  if (isLandscape) {
    // 1. Company Name (Centered, Bold, CoreTerra Terracotta Bronze #8C5F34)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(140, 95, 52);
    doc.text(companyName, centerX, 14, { align: 'center' });

    // 2. Report Primary Title (Centered, Bold, Deep Navy Slate)
    doc.setFontSize(12.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 35, 60);
    doc.text(primaryTitle, centerX, 20.5, { align: 'center' });

    // 3. Report Secondary / English Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(secondaryTitle, centerX, 25.5, { align: 'center' });

    // 4. Period Subtitle (Centered, Normal, Slate 500)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${periodStr}`, centerX, 30, { align: 'center' });

    // 5. Elegant Gold Accent Divider
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.6);
    doc.line(leftMargin, 33, rightMargin, 33);

    return 37;
  }

  // Portrait Layout
  // 1. Company Name (Centered, Bold, CoreTerra Terracotta Bronze #8C5F34)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 95, 52);
  doc.text(companyName, centerX, 15, { align: 'center' });

  // 2. Report Primary Title (Centered, Bold, Deep Navy Slate)
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 35, 60);
  doc.text(primaryTitle, centerX, 21.5, { align: 'center' });

  // 3. Report Secondary / English Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(secondaryTitle, centerX, 26.5, { align: 'center' });

  // 4. Period Subtitle (Centered, Normal, Slate 500)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${periodStr}`, centerX, 31.5, { align: 'center' });

  // 5. Elegant Gold Accent Divider
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.6);
  doc.line(leftMargin, 35, rightMargin, 35);

  return 41; // startY for table in portrait
};

const addReportSignature = (doc: jsPDF, finalY: number, orientation: 'portrait' | 'landscape' = 'portrait') => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxAllowedY = pageHeight - 27; // safe distance above footer

  let curY = finalY;
  if (curY + 38 > maxAllowedY) {
    doc.addPage('a4', orientation);
    drawWatermark(doc);
    curY = 25;
  }

  const sigY = curY + 8;
  const sigCenterX = pageWidth - 55;
  const todayFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`Tangerang Selatan, ${todayFormatted}`, sigCenterX, sigY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 35, 60);
  doc.text('PT. CoreTerra Geo Engineering', sigCenterX, sigY + 5, { align: 'center' });

  // Space for manual signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('(                                                      )', sigCenterX, sigY + 23, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('Direktur Utama', sigCenterX, sigY + 28, { align: 'center' });

  return sigY + 32;
};

const addTrialBalanceHeader = (doc: jsPDF, startDate: string, endDate: string) => {
  return addReportHeader(doc, 'NERACA SALDO', 'TRIAL BALANCE', startDate, endDate);
};

const addPDFFooter = (doc: jsPDF) => {
  const pageCount = (doc.internal as any).getNumberOfPages();
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const rightMargin = pageWidth - 14;
    const footerY = pageHeight - 12;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 150, 160);
    
    // Line 1: Tanggal Cetak (Kiri) dan Nomor Halaman (Kanan) sejajar horizontal
    doc.text(`Dicetak tanggal: ${today}`, 14, footerY);
    doc.text(`Halaman ${i} dari ${pageCount}`, rightMargin, footerY, { align: 'right' });
    
    // Line 2: Keterangan Sistem ANSA seragam di SELURUH halaman
    doc.text('(dibuat dan didukung oleh ANSA - Digital Product Developer.)', 14, footerY + 4.5);
  }
};


const formatAccVal = (val: number, showDashIfZero: boolean = false) => {
  if (val === 0 || !val) {
    return showDashIfZero ? '-' : 'Rp 0';
  }
  if (val < 0) {
    const formatted = formatCurrency(Math.abs(val));
    return `(${formatted})`;
  }
  return formatCurrency(val);
};

const renderIncomeStatementToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { revenue, cogs, gross_profit, expenses, net_income } = data;
  const rows: any[][] = [];

  // PENDAPATAN (REVENUE)
  rows.push([
    { content: 'PENDAPATAN USAHA (REVENUE)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);
  if (revenue?.items?.length > 0) {
    revenue.items.forEach((r: any) => {
      rows.push([`   ${r.account_code} - ${r.account_name}`, formatAccVal(r.balance)]);
    });
  } else {
    rows.push(['   (Tidak ada transaksi pendapatan)', '-']);
  }
  rows.push([
    { content: 'Total Pendapatan Usaha', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(revenue?.total || 0), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);

  // BEBAN POKOK (COGS)
  rows.push([
    { content: 'BEBAN POKOK PENDAPATAN (COST OF GOODS SOLD)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);
  if (cogs?.items?.length > 0) {
    cogs.items.forEach((c: any) => {
      rows.push([`   ${c.account_code} - ${c.account_name}`, formatAccVal(c.balance < 0 ? c.balance : -c.balance)]);
    });
  } else {
    rows.push(['   (Tidak ada transaksi beban pokok)', '-']);
  }
  rows.push([
    { content: 'Total Beban Pokok Pendapatan', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(cogs?.total < 0 ? cogs.total : -(cogs?.total || 0)), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);

  // LABA KOTOR (GROSS PROFIT)
  const isGrossPositive = (gross_profit || 0) >= 0;
  rows.push([
    { content: 'LABA KOTOR (GROSS PROFIT)', styles: { fontStyle: 'bold', fontSize: 9.5, textColor: isGrossPositive ? [22, 101, 52] : [185, 28, 28] } },
    { content: formatAccVal(gross_profit || 0), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', textColor: isGrossPositive ? [22, 101, 52] : [185, 28, 28] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);

  // BEBAN OPERASIONAL (OPEX)
  rows.push([
    { content: 'BEBAN OPERASIONAL (OPERATING EXPENSES)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);
  if (expenses?.items?.length > 0) {
    expenses.items.forEach((o: any) => {
      rows.push([`   ${o.account_code} - ${o.account_name}`, formatAccVal(o.balance < 0 ? o.balance : -o.balance)]);
    });
  } else {
    rows.push(['   (Tidak ada beban operasional)', '-']);
  }
  rows.push([
    { content: 'Total Beban Operasional', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(expenses?.total < 0 ? expenses.total : -(expenses?.total || 0)), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);

  // LABA BERSIH (NET PROFIT)
  const isNetProfit = (net_income || 0) >= 0;
  rows.push([
    { 
      content: 'LABA BERSIH TAHUN BERJALAN (NET PROFIT)', 
      styles: { 
        fontStyle: 'bold', 
        fontSize: 10, 
        textColor: isNetProfit ? [22, 101, 52] : [185, 28, 28] 
      } 
    },
    { 
      content: formatAccVal(net_income || 0), 
      styles: { 
        fontStyle: 'bold', 
        fontSize: 10, 
        halign: 'right',
        textColor: isNetProfit ? [22, 101, 52] : [185, 28, 28] 
      } 
    }
  ]);

  autoTable(doc, {
    theme: 'plain',
    startY: startY,
    margin: { left: 14, right: 14, top: 18, bottom: 20 },
    showHead: 'everyPage',
    head: [['Keterangan Akun', 'Nominal (IDR)']],
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [71, 85, 105], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 3, left: 1, right: 1 }
    },
    body: rows,
    styles: { 
      fontSize: 8.5, 
      font: 'helvetica', 
      textColor: [35, 35, 35], 
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineWidth: 0 
    },
    columnStyles: {
      0: { cellWidth: 130, halign: 'left' },
      1: { cellWidth: 52, halign: 'right' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      // Underline table header with subtle gold accent line
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      // Accounting lines for subtotals and grand totals
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const raw0 = String(hookData.row.raw[0]?.content || hookData.row.raw[0] || '');
        if (raw0.startsWith('Total ') || raw0.startsWith('LABA KOTOR')) {
          doc.setDrawColor(180, 190, 200);
          doc.setLineWidth(0.3);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
          if (raw0.startsWith('LABA KOTOR')) {
            doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
          }
        }
        if (raw0.startsWith('LABA BERSIH')) {
          doc.setDrawColor(50, 65, 80);
          doc.setLineWidth(0.4);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
          // Classic accounting double underline
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height + 1, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height + 1);
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  addReportSignature(doc, finalY, 'portrait');
  return finalY;
};

const renderBalanceSheetToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { assets, liabilities, equity, total_liabilities_and_equity, is_balanced } = data;
  const rows: any[][] = [];

  // ASET (ASSETS)
  rows.push([
    { content: 'ASET (ASSETS)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);
  if (assets?.items?.length > 0) {
    assets.items.forEach((a: any) => {
      rows.push([`   ${a.account_code} - ${a.account_name}`, formatAccVal(a.balance)]);
    });
  } else {
    rows.push(['   (Tidak ada akun aset)', '-']);
  }
  rows.push([
    { content: 'TOTAL ASET', styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [20, 35, 60] } },
    { content: formatAccVal(assets?.total || 0), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 3 } }]);

  // KEWAJIBAN (LIABILITIES)
  rows.push([
    { content: 'KEWAJIBAN (LIABILITIES)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);
  if (liabilities?.items?.length > 0) {
    liabilities.items.forEach((l: any) => {
      rows.push([`   ${l.account_code} - ${l.account_name}`, formatAccVal(l.balance)]);
    });
  } else {
    rows.push(['   (Tidak ada akun kewajiban)', '-']);
  }
  rows.push([
    { content: 'Total Kewajiban', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(liabilities?.total || 0), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);

  // EKUITAS (EQUITY)
  rows.push([
    { content: 'EKUITAS (EQUITY)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);
  if (equity?.items?.length > 0) {
    equity.items.forEach((e: any) => {
      rows.push([`   ${e.account_code} - ${e.account_name}`, formatAccVal(e.balance)]);
    });
  } else {
    rows.push(['   (Tidak ada akun ekuitas)', '-']);
  }
  rows.push([
    { content: 'Total Ekuitas', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(equity?.total || 0), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);

  // TOTAL KEWAJIBAN & EKUITAS
  rows.push([
    { content: 'TOTAL KEWAJIBAN & EKUITAS', styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [20, 35, 60] } },
    { content: formatAccVal(total_liabilities_and_equity || 0), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', textColor: [20, 35, 60] } }
  ]);

  autoTable(doc, {
    theme: 'plain',
    startY: startY,
    margin: { left: 14, right: 14, top: 18, bottom: 20 },
    showHead: 'everyPage',
    head: [['Keterangan Akun', 'Nominal (IDR)']],
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [71, 85, 105], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 3, left: 1, right: 1 }
    },
    body: rows,
    styles: { 
      fontSize: 8.5, 
      font: 'helvetica', 
      textColor: [35, 35, 35], 
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineWidth: 0 
    },
    columnStyles: {
      0: { cellWidth: 130, halign: 'left' },
      1: { cellWidth: 52, halign: 'right' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const raw0 = String(hookData.row.raw[0]?.content || hookData.row.raw[0] || '');
        if (raw0.startsWith('Total ')) {
          doc.setDrawColor(180, 190, 200);
          doc.setLineWidth(0.3);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
        }
        if (raw0.startsWith('TOTAL ASET') || raw0.startsWith('TOTAL KEWAJIBAN')) {
          doc.setDrawColor(50, 65, 80);
          doc.setLineWidth(0.4);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
          // Classic accounting double underline
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height + 1, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height + 1);
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  addReportSignature(doc, finalY, 'portrait');
  return finalY;
};

const renderCashFlowToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { operating_activities, investing_activities, financing_activities, net_increase_in_cash } = data;
  const rows: any[][] = [];

  const addCashFlowSection = (title: string, sectionData: any) => {
    rows.push([
      { content: title.toUpperCase(), colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
    ]);
    if (sectionData) {
      rows.push(['   Penerimaan Kas (Inflow)', formatAccVal(sectionData.inflow || 0)]);
      if (sectionData.inflow_by_account && sectionData.inflow_by_account.length > 0) {
        sectionData.inflow_by_account.forEach((item: any) => {
          rows.push([`      • ${item.account}`, formatAccVal(item.amount)]);
        });
      }
      rows.push(['   Pengeluaran Kas (Outflow)', formatAccVal(sectionData.outflow < 0 ? sectionData.outflow : -(sectionData.outflow || 0))]);
      if (sectionData.outflow_by_account && sectionData.outflow_by_account.length > 0) {
        sectionData.outflow_by_account.forEach((item: any) => {
          rows.push([`      • ${item.account}`, formatAccVal(item.amount < 0 ? item.amount : -item.amount)]);
        });
      }
      const net = sectionData.net || 0;
      rows.push([
        { content: `Total Arus Kas Bersih dari ${title}`, styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
        { content: formatAccVal(net), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
      ]);
      rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);
    }
  };

  addCashFlowSection('Aktivitas Operasional', operating_activities);
  addCashFlowSection('Aktivitas Investasi', investing_activities);
  addCashFlowSection('Aktivitas Pendanaan', financing_activities);

  // KENAIKAN / PENURUNAN KAS BERSIH
  const netInc = net_increase_in_cash || 0;
  const isInc = netInc >= 0;
  rows.push([
    { 
      content: 'KENAIKAN / (PENURUNAN) KAS BERSIH', 
      styles: { 
        fontStyle: 'bold', 
        fontSize: 9.5, 
        textColor: isInc ? [22, 101, 52] : [185, 28, 28] 
      } 
    },
    { 
      content: formatAccVal(netInc), 
      styles: { 
        fontStyle: 'bold', 
        fontSize: 9.5, 
        halign: 'right',
        textColor: isInc ? [22, 101, 52] : [185, 28, 28] 
      } 
    }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1 } }]);

  const begCash = data.beginning_cash_balance || 0;
  const endCash = data.ending_cash_balance !== undefined ? data.ending_cash_balance : (begCash + netInc);

  rows.push([
    { content: 'KAS & SETARA KAS AWAL PERIODE', styles: { fontStyle: 'normal' } },
    { content: formatAccVal(begCash), styles: { halign: 'right' } }
  ]);
  rows.push([
    { content: 'KAS & SETARA KAS AKHIR PERIODE (PSAK No. 2)', styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [20, 35, 60] } },
    { content: formatAccVal(endCash), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', textColor: [20, 35, 60] } }
  ]);

  autoTable(doc, {
    theme: 'plain',
    startY: startY,
    margin: { left: 14, right: 14, top: 18, bottom: 20 },
    showHead: 'everyPage',
    head: [['Deskripsi Arus Kas', 'Nominal (IDR)']],
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [71, 85, 105], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 3, left: 1, right: 1 }
    },
    body: rows,
    styles: { 
      fontSize: 8.5, 
      font: 'helvetica', 
      textColor: [35, 35, 35], 
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineWidth: 0 
    },
    columnStyles: {
      0: { cellWidth: 130, halign: 'left' },
      1: { cellWidth: 52, halign: 'right' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const raw0 = String(hookData.row.raw[0]?.content || hookData.row.raw[0] || '');
        if (raw0.startsWith('Total ') || raw0.startsWith('KENAIKAN')) {
          doc.setDrawColor(180, 190, 200);
          doc.setLineWidth(0.3);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
        }
        if (raw0.startsWith('KAS & SETARA KAS AKHIR')) {
          doc.setDrawColor(50, 65, 80);
          doc.setLineWidth(0.4);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
          // Classic accounting double underline
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height + 1, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height + 1);
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  addReportSignature(doc, finalY, 'portrait');
};

const formatTBVal = (val: number, showDashIfZero: boolean = false) => {
  if (val === 0 || !val) {
    return showDashIfZero ? '-' : 'Rp 0';
  }
  if (val < 0) {
    const formatted = formatCurrency(Math.abs(val));
    return `(${formatted})`;
  }
  return formatCurrency(val);
};

const renderTrialBalanceToPDF = (doc: jsPDF, data: any, startY: number) => {
  const items = data?.items || [];
  const summary = data?.summary || {};
  const rows: any[][] = [];

  items.forEach((item: any) => {
    rows.push([
      item.account_code,
      item.account_name,
      item.account_type,
      formatTBVal(item.beginning_balance, false),
      formatTBVal(item.debit, true),
      formatTBVal(item.credit, true),
      formatTBVal(item.ending_balance, false)
    ]);
  });


  // Row 1: JUMLAH TOTAL (Total row spanning Kode, Nama Akun, Tipe)
  rows.push([
    { 
      content: 'JUMLAH TOTAL', 
      colSpan: 3, 
      styles: { 
        halign: 'right', 
        fontStyle: 'bold', 
        fontSize: 8.5,
        textColor: [20, 35, 60],
        fillColor: [241, 245, 249]
      } 
    },
    { 
      content: formatTBVal(summary.total_beginning_debit || 0), 
      styles: { 
        halign: 'right', 
        fontStyle: 'bold', 
        fontSize: 8,
        textColor: [20, 35, 60],
        fillColor: [241, 245, 249]
      } 
    },
    { 
      content: formatTBVal(summary.total_movement_debit || 0), 
      styles: { 
        halign: 'right', 
        fontStyle: 'bold', 
        fontSize: 8,
        textColor: [22, 101, 52],
        fillColor: [241, 245, 249]
      } 
    },
    { 
      content: formatTBVal(summary.total_movement_credit || 0), 
      styles: { 
        halign: 'right', 
        fontStyle: 'bold', 
        fontSize: 8,
        textColor: [180, 83, 9],
        fillColor: [241, 245, 249]
      } 
    },
    { 
      content: formatTBVal(summary.total_ending_debit || 0), 
      styles: { 
        halign: 'right', 
        fontStyle: 'bold', 
        fontSize: 8,
        textColor: [20, 35, 60],
        fillColor: [241, 245, 249]
      } 
    }
  ]);


  autoTable(doc, {
    theme: 'grid',
    startY: startY,
    margin: { left: 14, right: 14, top: 18, bottom: 20 },
    showHead: 'everyPage',
    head: [['Kode', 'Nama Akun', 'Tipe', 'Saldo Awal', 'Mutasi Debit', 'Mutasi Kredit', 'Saldo Akhir']],
    body: rows,
    styles: { 
      fontSize: 8, 
      font: 'helvetica', 
      textColor: [35, 35, 35], 
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
      valign: 'middle',
      overflow: 'linebreak',
      lineWidth: 0.1,
      lineColor: [210, 220, 230]
    },
    headStyles: { 
      fillColor: [140, 95, 52], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 2.5, right: 2.5 }
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 77 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 },
      5: { halign: 'right', cellWidth: 35 },
      6: { halign: 'right', cellWidth: 35 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    willDrawPage: () => {
      drawWatermark(doc);
    }
  });

  // Manual Signature Block on the last page
  let finalY = (doc as any).lastAutoTable.finalY;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Needs ~36mm space before footer at 190mm
  if (finalY + 38 > 190) {
    doc.addPage('a4', 'landscape');
    drawWatermark(doc);
    finalY = 25;
  }

  const sigY = finalY + 8;
  const sigCenterX = pageWidth - 55;
  const todayFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`Tangerang Selatan, ${todayFormatted}`, sigCenterX, sigY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 35, 60);
  doc.text('PT. CoreTerra Geo Engineering', sigCenterX, sigY + 5, { align: 'center' });

  // Space for manual signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('(                                                      )', sigCenterX, sigY + 23, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('Direktur Utama', sigCenterX, sigY + 28, { align: 'center' });

  return sigY + 30;
};

const renderEquityToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { beginning_equity, additions, deductions, ending_equity } = data;
  const rows: any[][] = [];

  // 1. Modal Awal (Beginning Equity)
  rows.push([
    { content: 'MODAL AWAL PERIODE (BEGINNING EQUITY)', styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52] } },
    { content: formatAccVal(beginning_equity || 0), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2.5 } }]);

  // 2. Penambahan Ekuitas (Additions)
  rows.push([
    { content: 'PENAMBAHAN EKUITAS (ADDITIONS)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);
  
  const netIncome = additions?.net_income || 0;
  const isNetProfit = netIncome >= 0;
  rows.push([
    '   Laba / (Rugi) Bersih Tahun Berjalan',
    { content: formatAccVal(netIncome), styles: { halign: 'right', textColor: isNetProfit ? [22, 101, 52] : [185, 28, 28] } }
  ]);
  
  const newCap = additions?.new_capital || 0;
  rows.push([
    '   Tambahan Modal Disetor (Capital Contribution)',
    { content: formatAccVal(newCap), styles: { halign: 'right' } }
  ]);

  const totalAdd = (netIncome > 0 ? netIncome : 0) + newCap;
  rows.push([
    { content: 'Total Penambahan Ekuitas', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(totalAdd), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 2 } }]);

  // 3. Pengurangan Ekuitas (Deductions)
  rows.push([
    { content: 'PENGURANGAN EKUITAS (DEDUCTIONS)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [140, 95, 52], cellPadding: { top: 3, bottom: 1.5 } } }
  ]);

  const netLoss = netIncome < 0 ? Math.abs(netIncome) : 0;
  if (netLoss > 0) {
    rows.push([
      '   Rugi Bersih Periode Berjalan',
      { content: formatAccVal(-netLoss), styles: { halign: 'right', textColor: [185, 28, 28] } }
    ]);
  }

  const divPaid = deductions?.dividends_paid || 0;
  rows.push([
    '   Penarikan Dividen / Prive (Drawings)',
    { content: formatAccVal(divPaid < 0 ? divPaid : -divPaid), styles: { halign: 'right' } }
  ]);

  const totalDed = netLoss + Math.abs(divPaid);
  rows.push([
    { content: 'Total Pengurangan Ekuitas', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(totalDed > 0 ? -totalDed : 0), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  rows.push([{ content: '', colSpan: 2, styles: { cellPadding: 3 } }]);

  // 4. Modal Akhir (Ending Equity)
  rows.push([
    { content: 'MODAL AKHIR PERIODE (ENDING EQUITY)', styles: { fontStyle: 'bold', fontSize: 10, textColor: [20, 35, 60] } },
    { content: formatAccVal(ending_equity || 0), styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', textColor: [20, 35, 60] } }
  ]);

  autoTable(doc, {
    theme: 'plain',
    startY: startY,
    margin: { left: 14, right: 14, top: 18, bottom: 20 },
    showHead: 'everyPage',
    head: [['Keterangan Mutasi Ekuitas', 'Nominal (IDR)']],
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [71, 85, 105], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 3, left: 1, right: 1 }
    },
    body: rows,
    styles: { 
      fontSize: 8.5, 
      font: 'helvetica', 
      textColor: [35, 35, 35], 
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineWidth: 0 
    },
    columnStyles: {
      0: { cellWidth: 130, halign: 'left' },
      1: { cellWidth: 52, halign: 'right' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const raw0 = String(hookData.row.raw[0]?.content || hookData.row.raw[0] || '');
        if (raw0.startsWith('Total ')) {
          doc.setDrawColor(180, 190, 200);
          doc.setLineWidth(0.3);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
        }
        if (raw0.startsWith('MODAL AKHIR')) {
          doc.setDrawColor(50, 65, 80);
          doc.setLineWidth(0.4);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
          // Classic accounting double underline
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height + 1, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height + 1);
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  addReportSignature(doc, finalY, 'portrait');
  return finalY;
};

const renderCalkToPDF = (doc: jsPDF, data: any, startY: number) => {
  const summary = data?.summary;
  if (!summary) return startY;

  drawWatermark(doc);
  let currentY = startY;

  const checkPageBreak = (y: number, addedHeight: number) => {
    if (y + addedHeight > 265) {
      doc.addPage('a4', 'portrait');
      drawWatermark(doc);
      return 25;
    }
    return y;
  };

  const addHeader = (title: string, y: number) => {
    y = checkPageBreak(y, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(140, 95, 52);
    doc.text(title, 14, y);
    return y + 5.5;
  };

  const addText = (text: string, y: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, 182);
    y = checkPageBreak(y, lines.length * 4.5);
    doc.text(lines, 14, y);
    return y + (lines.length * 4.5) + 3;
  };

  // 1. Posisi Kas & Bank
  currentY = addHeader('1. Posisi Kas & Bank (Cash Position)', currentY);
  currentY = addText(`Saldo kas dan bank perusahaan yang tersedia untuk kegiatan operasional per akhir periode berjumlah ${formatCurrency(summary.cash_position)}. Rincian saldo kas adalah sebagai berikut:`, currentY);
  
  const cashRows: any[][] = Object.entries(summary.cash_by_account || {}).map(([name, amount]: any) => [`   ${name}`, formatAccVal(amount as number)]);
  cashRows.push([
    { content: 'Total Kas & Bank', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(summary.cash_position), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  
  autoTable(doc, {
    theme: 'plain',
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Rekening / Akun', 'Nominal (IDR)']],
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [71, 85, 105], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 3, left: 1, right: 1 }
    },
    body: cashRows,
    styles: { 
      fontSize: 8.5, 
      font: 'helvetica', 
      textColor: [35, 35, 35], 
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineWidth: 0 
    },
    columnStyles: {
      0: { cellWidth: 130, halign: 'left' },
      1: { cellWidth: 52, halign: 'right' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const raw0 = String(hookData.row.raw[0]?.content || hookData.row.raw[0] || '');
        if (raw0.startsWith('Total ')) {
          doc.setDrawColor(50, 65, 80);
          doc.setLineWidth(0.4);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height + 1, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height + 1);
        }
      }
    }
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 2. Nilai Proyek Aktif
  currentY = addHeader('2. Nilai Proyek Aktif (Active Projects)', currentY);
  currentY = addText(`Perusahaan saat ini memiliki ${summary.active_projects} proyek aktif dari total ${summary.total_projects} proyek tercatat. Total Nilai Kontrak dari seluruh proyek tersebut adalah ${formatCurrency(summary.total_contract_value)}. Rincian proyek aktif:`, currentY);
  
  const projRows: any[][] = summary.project_list?.map((p: any) => [`   ${p.name} (${p.code}) - ${p.status.toUpperCase()}`, formatAccVal(p.value)]) || [];
  if (projRows.length === 0) {
    projRows.push(['   (Tidak ada proyek aktif saat ini)', '-']);
  }
  projRows.push([
    { content: 'Total Contract Value', styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: formatAccVal(summary.total_contract_value), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);
  
  autoTable(doc, {
    theme: 'plain',
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Proyek / Pekerjaan', 'Nilai Kontrak (IDR)']],
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [71, 85, 105], 
      fontStyle: 'bold', 
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 3, left: 1, right: 1 }
    },
    body: projRows,
    styles: { 
      fontSize: 8.5, 
      font: 'helvetica', 
      textColor: [35, 35, 35], 
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineWidth: 0 
    },
    columnStyles: {
      0: { cellWidth: 130, halign: 'left' },
      1: { cellWidth: 52, halign: 'right' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const raw0 = String(hookData.row.raw[0]?.content || hookData.row.raw[0] || '');
        if (raw0.startsWith('Total ')) {
          doc.setDrawColor(50, 65, 80);
          doc.setLineWidth(0.4);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height + 1, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height + 1);
        }
      }
    }
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. Piutang Usaha
  currentY = addHeader('3. Piutang Usaha (Account Receivables)', currentY);
  currentY = addText(`Total tagihan kepada klien/pelanggan yang telah diterbitkan adalah sebesar ${formatCurrency(summary.total_ar)}. Dari jumlah tersebut, tagihan yang masih menunggak atau belum dibayar penuh sebesar ${formatCurrency(summary.outstanding_ar)}.`, currentY);
  currentY += 2;

  // 4. Hutang Usaha
  currentY = addHeader('4. Hutang Usaha (Account Payables)', currentY);
  currentY = addText(`Total hutang kepada vendor/subkontraktor yang tercatat adalah sebesar ${formatCurrency(summary.total_ap)}. Sisa kewajiban yang masih harus dibayar saat ini adalah ${formatCurrency(summary.outstanding_ap)}.`, currentY);
  currentY += 4;

  // 5. Kebijakan Akuntansi & Catatan Penting
  const header5Title = '5. Kebijakan Akuntansi & Catatan Penting';
  const text5A = `A. Laporan Keuangan Konsolidasi vs Laporan Proyek
Dalam pencatatan akuntansi perusahaan, Laporan Keuangan Konsolidasi (Laba Rugi Umum) mencakup seluruh aktivitas finansial perusahaan, termasuk di dalamnya Beban Operasional Pusat (Overhead/OPEX). Di sisi lain, Laporan Keuangan Proyek berfokus secara eksklusif pada Margin Laba Kotor (Gross Profit) dari masing-masing proyek (Pendapatan Proyek dikurangi Beban Langsung Proyek). 

Oleh karena itu, akumulasi Laba Kotor dari seluruh proyek tidak berkorelasi langsung dengan Laba Bersih Perusahaan maupun Saldo Kas Aktual. Hal ini dikarenakan sebagian dari kas proyek tersebut dialokasikan untuk mendanai pengeluaran operasional terpusat perusahaan.`;

  const text5B = `B. Pencatatan Mutasi Kas & Bank (Inter-bank Transfers)
Mutasi atau pemindahan dana antar rekening bank milik perusahaan (misalnya dari Bank Mandiri ke Bank CIMB) dicatat mutlak sebagai pemindahan letak aset kas. Transaksi ini diakui melalui Jurnal Umum dan tidak diklasifikasikan sebagai Beban maupun Pendapatan. Dengan demikian, aktivitas mutasi kas antar bank tidak memiliki dampak terhadap Laba/Rugi bersih perusahaan, melainkan hanya mengubah komposisi rincian pada Posisi Kas & Bank di Neraca.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const linesA = doc.splitTextToSize(text5A, 182);
  const linesB = doc.splitTextToSize(text5B, 182);
  const totalRequiredHeight = 8 + (linesA.length * 4.5) + 6 + (linesB.length * 4.5);

  currentY = checkPageBreak(currentY, totalRequiredHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(140, 95, 52);
  doc.text(header5Title, 14, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(linesA, 14, currentY);
  currentY += (linesA.length * 4.5) + 5;

  doc.text(linesB, 14, currentY);
  currentY += (linesB.length * 4.5) + 4;

  // Signature Block on CALK
  addReportSignature(doc, currentY, 'portrait');
  return currentY;
};

export const generateSingleReportPDF = (activeTab: string, reportData: any, startDate: string, endDate: string) => {
  if (!reportData) return;
  const isLandscape = activeTab === 'trialbalance';
  const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' });
  
  const titleMap: Record<string, string> = {
    income: 'INCOME STATEMENT (LABA RUGI)',
    balance: 'BALANCE SHEET (NERACA)',
    trialbalance: 'TRIAL BALANCE (NERACA SALDO)',
    cashflow: 'STATEMENT OF CASH FLOWS (ARUS KAS)',
    equity: 'STATEMENT OF CHANGES IN EQUITY',
    calk: 'CATATAN ATAS LAPORAN KEUANGAN (CALK)'
  };
  
  const periodStr = `${startDate} s/d ${endDate}`;

  try {
    if (activeTab === 'income') {
      const startY = addReportHeader(doc, 'LAPORAN LABA RUGI', 'INCOME STATEMENT', startDate, endDate);
      renderIncomeStatementToPDF(doc, reportData, startY);
    } else if (activeTab === 'balance') {
      const startY = addReportHeader(doc, 'NERACA', 'BALANCE SHEET', startDate, endDate);
      renderBalanceSheetToPDF(doc, reportData, startY);
    } else if (activeTab === 'cashflow') {
      const startY = addReportHeader(doc, 'LAPORAN ARUS KAS', 'CASH FLOW STATEMENT', startDate, endDate);
      renderCashFlowToPDF(doc, reportData, startY);
    } else if (activeTab === 'trialbalance') {
      const startY = addTrialBalanceHeader(doc, startDate, endDate);
      renderTrialBalanceToPDF(doc, reportData, startY);
    } else if (activeTab === 'equity') {
      const startY = addReportHeader(doc, 'LAPORAN PERUBAHAN EKUITAS', 'STATEMENT OF CHANGES IN EQUITY', startDate, endDate);
      renderEquityToPDF(doc, reportData, startY);
    } else if (activeTab === 'calk') {
      const startY = addReportHeader(doc, 'CATATAN ATAS LAPORAN KEUANGAN', 'NOTES TO FINANCIAL STATEMENTS', startDate, endDate);
      renderCalkToPDF(doc, reportData, startY);
    }
    
    addPDFFooter(doc);
    
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  } catch(e) {
    console.error("PDF Render Error:", e);
    alert("Gagal membuat PDF: Struktur data tidak sesuai.");
  }
};

export const generateConsolidatedReportPDF = async (startDate: string, endDate: string, addToast: any) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const [incRes, balRes, tbRes, cfRes, eqRes, calkRes] = await Promise.all([
      fetch(`http://localhost:8000/api/v1/financial-statements/income-statement?start_date=${startDate}&end_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/balance-sheet?as_of_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/trial-balance?start_date=${startDate}&end_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/cash-flow?start_date=${startDate}&end_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/equity-changes?start_date=${startDate}&end_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/calk-notes?start_date=${startDate}&end_date=${endDate}`, { headers })
    ]);

    const income = await incRes.json();
    const balance = await balRes.json();
    const trialbalance = await tbRes.json();
    const cashflow = await cfRes.json();
    const equity = await eqRes.json();
    const calk = await calkRes.json();

    const doc = new jsPDF({ orientation: 'portrait' });
    const periodStr = `${startDate} s/d ${endDate}`;
    
    // Page 1: Cover
    addHeaderWithLogo(doc, 'CONSOLIDATED FINANCIAL REPORTS', periodStr, true);
    
    // Page 2: Income Statement
    doc.addPage('a4', 'portrait');
    let startY = addReportHeader(doc, 'LAPORAN LABA RUGI', 'INCOME STATEMENT', startDate, endDate);
    renderIncomeStatementToPDF(doc, income, startY);

    // Page 3: Balance Sheet
    doc.addPage('a4', 'portrait');
    startY = addReportHeader(doc, 'NERACA', 'BALANCE SHEET', startDate, endDate);
    renderBalanceSheetToPDF(doc, balance, startY);

    // Page 4: Trial Balance (Landscape for wide multi-column layout)
    doc.addPage('a4', 'landscape');
    startY = addTrialBalanceHeader(doc, startDate, endDate);
    renderTrialBalanceToPDF(doc, trialbalance, startY);

    // Page 5: Statement of Equity
    doc.addPage('a4', 'portrait');
    startY = addReportHeader(doc, 'LAPORAN PERUBAHAN EKUITAS', 'STATEMENT OF CHANGES IN EQUITY', startDate, endDate);
    renderEquityToPDF(doc, equity, startY);

    // Page 6: Cash Flow
    doc.addPage('a4', 'portrait');
    startY = addReportHeader(doc, 'LAPORAN ARUS KAS', 'CASH FLOW STATEMENT', startDate, endDate);
    renderCashFlowToPDF(doc, cashflow, startY);

    // Page 7: CALK
    doc.addPage('a4', 'portrait');
    startY = addReportHeader(doc, 'CATATAN ATAS LAPORAN KEUANGAN', 'NOTES TO FINANCIAL STATEMENTS', startDate, endDate);
    renderCalkToPDF(doc, calk, startY);

    addPDFFooter(doc);

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  } catch (error) {
    console.error('Failed to generate consolidated PDF', error);
    addToast('error', 'Export Failed', 'Gagal membuat laporan gabungan PDF.');
  }
};

export const generateWeeklyCashflowPDF = (
  data: any, 
  selectedWeek?: number | 'all',
  groupingMode: 'category' | 'coa' = 'category'
) => {
  if (!data) return;

  const isCoa = groupingMode === 'coa';
  const doc = new jsPDF({ orientation: 'portrait' });
  const settings = getCompanySettings();
  const periodStr = `${data.period.start} s/d ${data.period.end}`;

  // Helper formatting
  const fmt = (n: number) => formatAccVal(n);
  const fmtFull = (n: number) => formatCurrency(n);

  // === PAGE 1: RINGKASAN EKSEKUTIF & KOMPARASI KATEGORI / COA ===
  let currentY = addReportHeader(
    doc,
    'LAPORAN ARUS KAS MINGGUAN',
    `PROYEK: ${data.project.code} - ${data.project.name} (${isCoa ? 'MODE: AKUN COA BUKU BESAR' : 'MODE: KATEGORI OPERASIONAL'})`,
    data.period.start,
    data.period.end
  );

  // Executive KPI summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 28, 2, 2, 'FD');

  // KPI 1: Inflow
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL KAS MASUK (INFLOW)', 20, currentY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Green
  doc.text(fmtFull(data.kpi.total_inflow), 20, currentY + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('2 Termin Pembayaran IKPT', 20, currentY + 20);

  // Divider 1
  doc.setDrawColor(203, 213, 225);
  doc.line(74, currentY + 4, 74, currentY + 24);

  // KPI 2: Outflow
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL KAS KELUAR (OUTFLOW)', 80, currentY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Red
  doc.text(fmtFull(data.kpi.total_outflow), 80, currentY + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.transactions?.length || 0} Transaksi Proyek Terdata`, 80, currentY + 20);

  // Divider 2
  doc.line(134, currentY + 4, 134, currentY + 24);

  // KPI 3: Net Cash
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ARUS KAS BERSIH (NET)', 140, currentY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.kpi.net_cashflow >= 0 ? 22 : 185, data.kpi.net_cashflow >= 0 ? 101 : 28, data.kpi.net_cashflow >= 0 ? 52 : 28);
  doc.text((data.kpi.net_cashflow >= 0 ? '+ ' : '') + fmtFull(data.kpi.net_cashflow), 140, currentY + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('SURPLUS KAS POSITIF', 140, currentY + 20);

  currentY += 34;

  // Title for Section 1
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 95, 52); // CoreTerra Bronze
  doc.text(
    isCoa 
      ? '1. KOMPARASI PENGELUARAN KAS BERDASARKAN AKUN COA (BUKU BESAR)' 
      : '1. KOMPARASI PENGELUARAN KAS BERDASARKAN KATEGORI', 
    14, 
    currentY
  );
  currentY += 4;

  // Table Komparasi Kategori / COA
  const catRows: any[][] = [];
  const summaryList = isCoa ? (data.coa_summary || []) : data.categories_summary;
  summaryList.forEach((item: any, idx: number) => {
    const isNew = item.is_new;
    catRows.push([
      idx + 1,
      item.code,
      isCoa ? item.name : (isNew ? `${item.name} *` : item.name),
      fmt(item.amount),
      `${item.percentage.toFixed(2)}%`
    ]);
  });

  catRows.push([
    { content: 'TOTAL KAS KELUAR OPERASIONAL', colSpan: 3, styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: fmt(data.kpi.total_outflow), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } },
    { content: '100.00%', styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);

  autoTable(doc, {
    theme: 'plain',
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['No', 'Kode', isCoa ? 'Akun Buku Besar (COA)' : 'Kategori Pengeluaran', 'Total Nominal (IDR)', 'Porsi (%)']],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }
    },
    body: catRows,
    styles: {
      fontSize: 7.5,
      font: 'helvetica',
      textColor: [35, 35, 35],
      cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
      lineWidth: 0
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, halign: 'center', textColor: [100, 116, 139] },
      2: { cellWidth: 84, halign: 'left' },
      3: { cellWidth: 42, halign: 'right' },
      4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.4);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body') {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Title for Section 2: Weekly Aggregation
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 95, 52);
  doc.text('2. REKAPITULASI ARUS KAS MINGGUAN (WEEKLY CASH POSITION)', 14, currentY);
  currentY += 4;

  const weekSummaryRows: any[][] = [];
  data.weeks.forEach((w: any) => {
    weekSummaryRows.push([
      `Minggu ${w.week_num}`,
      w.date_range,
      w.inflow > 0 ? fmt(w.inflow) : '-',
      w.outflow > 0 ? fmt(w.outflow) : '-',
      fmt(w.net),
      fmt(w.cumulative)
    ]);
  });

  weekSummaryRows.push([
    { content: `TOTAL KESELURUHAN (${data.weeks?.length || 10} MINGGU)`, colSpan: 2, styles: { fontStyle: 'bold', textColor: [20, 35, 60] } },
    { content: fmt(data.kpi.total_inflow), styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 101, 52] } },
    { content: fmt(data.kpi.total_outflow), styles: { fontStyle: 'bold', halign: 'right', textColor: [185, 28, 28] } },
    { content: fmt(data.kpi.net_cashflow), styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 101, 52] } },
    { content: fmt(data.kpi.cumulative_balance), styles: { fontStyle: 'bold', halign: 'right', textColor: [20, 35, 60] } }
  ]);

  autoTable(doc, {
    theme: 'plain',
    startY: currentY,
    margin: { left: 14, right: 14 },
    head: [['Minggu', 'Rentang Tanggal', 'Kas Masuk (Inflow)', 'Kas Keluar (Outflow)', 'Net Cashflow', 'Saldo Kumulatif']],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }
    },
    body: weekSummaryRows,
    styles: {
      fontSize: 7.5,
      font: 'helvetica',
      textColor: [35, 35, 35],
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      lineWidth: 0
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 44, halign: 'left' },
      2: { cellWidth: 30, halign: 'right', textColor: [22, 101, 52] },
      3: { cellWidth: 30, halign: 'right', textColor: [185, 28, 28] },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.4);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body') {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
    }
  });

  // === PAGE 2: MATRIKS PENGELUARAN MINGGUAN PER KATEGORI / COA (LANDSCAPE) ===
  doc.addPage('a4', 'landscape');
  let landscapeY = addReportHeader(
    doc,
    'LAPORAN ARUS KAS MINGGUAN',
    'WEEKLY CASH FLOW STATEMENT',
    data.period.start,
    data.period.end
  );

  const numWeeks = data.weeks?.length || 10;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 95, 52);
  doc.text(
    isCoa
      ? `3. MATRIKS ARUS KAS MINGGUAN BERDASARKAN AKUN COA (WEEKLY MATRIX W1 – W${numWeeks})`
      : `3. MATRIKS ARUS KAS MINGGUAN BERDASARKAN KATEGORI (WEEKLY MATRIX W1 – W${numWeeks})`,
    8, 
    landscapeY + 4
  );

  // Dedicated formatter for matrix table: uses non-breaking spaces so numbers never break across lines
  const formatMatrixVal = (val: number) => {
    if (val === 0 || !val) return '-';
    const absVal = Math.abs(val);
    const formatted = formatCurrency(absVal).replace(/\s+/g, '\u00A0');
    return val < 0 ? `(${formatted})` : formatted;
  };

  const matrixHead = ['Kode', isCoa ? 'Akun Buku Besar (COA)' : 'Kategori Transaksi', ...data.weeks.map((w: any) => `W${w.week_num}`), 'TOTAL'];
  const matrixRows: any[][] = [];
  const matrixSource = isCoa ? (data.coa_matrix || []) : data.matrix;

  matrixSource.forEach((row: any) => {
    const isInf = row.flow === 'INFLOW';
    const rowData: any[] = [
      row.code,
      row.category,
      ...data.weeks.map((w: any) => {
        const val = row.weeks[`W${w.week_num}`] || 0;
        return formatMatrixVal(val);
      }),
      { content: formatMatrixVal(row.total), styles: { fontStyle: 'bold', halign: 'right', textColor: isInf ? [22, 101, 52] : [20, 35, 60] } }
    ];
    matrixRows.push(rowData);
  });

  // Matrix Outflow Totals
  const totalOutRow = ['-', 'TOTAL KAS KELUAR'];
  data.weeks.forEach((w: any) => {
    totalOutRow.push(w.outflow > 0 ? formatMatrixVal(w.outflow) : '-');
  });
  totalOutRow.push(formatMatrixVal(data.kpi.total_outflow));
  matrixRows.push(totalOutRow);

  // Matrix Net Cashflow
  const netRow = ['-', 'NET CASH FLOW'];
  data.weeks.forEach((w: any) => {
    netRow.push(w.net !== 0 ? formatMatrixVal(w.net) : '-');
  });
  netRow.push(formatMatrixVal(data.kpi.net_cashflow));
  matrixRows.push(netRow);

  // Width calculations for Landscape A4: Page Width 297mm - Margins (8mm + 8mm) = 281mm usable
  const codeWidth = 15;
  const catWidth = isCoa ? 42 : 36;
  const totalWidth = 24;
  const remainingForWeeks = 281 - codeWidth - catWidth - totalWidth;
  const weekColWidth = Math.max(16, Math.floor((remainingForWeeks / numWeeks) * 10) / 10);

  const colStyles: any = {
    0: { cellWidth: codeWidth, halign: 'center', textColor: [100, 116, 139], overflow: 'visible' },
    1: { cellWidth: catWidth, halign: 'left', fontStyle: 'bold', overflow: 'linebreak' }
  };
  data.weeks.forEach((_: any, idx: number) => {
    colStyles[idx + 2] = { cellWidth: weekColWidth, halign: 'right', overflow: 'visible' };
  });
  colStyles[data.weeks.length + 2] = { cellWidth: totalWidth, halign: 'right', fontStyle: 'bold', overflow: 'visible' };

  autoTable(doc, {
    theme: 'plain',
    startY: landscapeY + 8,
    margin: { left: 8, right: 8 },
    head: [matrixHead],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 6.2,
      halign: 'center',
      cellPadding: { top: 2, bottom: 2, left: 0.3, right: 0.3 }
    },
    body: matrixRows,
    styles: {
      fontSize: 5.2,
      font: 'helvetica',
      textColor: [35, 35, 35],
      cellPadding: { top: 1.8, bottom: 1.8, left: 0.3, right: 0.3 },
      lineWidth: 0
    },
    columnStyles: colStyles,
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.4);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body') {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
        
        const rawRow = hookData.row.raw as any;
        const raw1 = String(rawRow?.[1]?.content || rawRow?.[1] || '');
        if (raw1.startsWith('TOTAL KAS KELUAR') || raw1.startsWith('NET CASH FLOW')) {
          doc.setDrawColor(50, 65, 80);
          doc.setLineWidth(0.3);
          doc.line(hookData.cell.x, hookData.cell.y, hookData.cell.x + hookData.cell.width, hookData.cell.y);
        }
      }
    }
  });

  // === PAGE 3: RINCIAN TRANSAKSI TERVERIFIKASI (PORTRAIT) ===
  doc.addPage('a4', 'portrait');
  let detailY = addReportHeader(
    doc,
    'AUDIT TRAIL TRANSAKSI KAS MINGGUAN',
    `VERIFIKASI COA & DESKRIPSI: ${data.project.code}`,
    data.period.start,
    data.period.end
  );

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 95, 52);
  doc.text('4. RINCIAN TRANSAKSI LENGKAP PER MINGGU (VERIFIED TRANSACTIONS)', 14, detailY);
  detailY += 4;

  const txRows: any[][] = [];
  const filteredTxs = (selectedWeek && selectedWeek !== 'all')
    ? data.transactions.filter((t: any) => t.week_num === selectedWeek)
    : data.transactions;

  filteredTxs.forEach((t: any) => {
    txRows.push([
      `W${t.week_num}`,
      t.date,
      t.category,
      `${t.coa_code} ${t.coa_name}`,
      t.description,
      t.flow === 'INFLOW' ? fmt(t.amount) : '-',
      t.flow === 'OUTFLOW' ? fmt(t.amount) : '-'
    ]);
  });

  autoTable(doc, {
    theme: 'plain',
    startY: detailY,
    margin: { left: 14, right: 14 },
    head: [['Wk', 'Tanggal', 'Kategori Terverifikasi', 'Akun COA Terdaftar', 'Keterangan Transaksi Asli', 'Inflow', 'Outflow']],
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 }
    },
    body: txRows,
    styles: {
      fontSize: 6.8,
      font: 'helvetica',
      textColor: [35, 35, 35],
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 },
      lineWidth: 0
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 32, halign: 'left', fontStyle: 'bold' },
      3: { cellWidth: 32, halign: 'left', textColor: [100, 116, 139] },
      4: { cellWidth: 50, halign: 'left' },
      5: { cellWidth: 20, halign: 'right', textColor: [22, 101, 52] },
      6: { cellWidth: 20, halign: 'right', textColor: [185, 28, 28] }
    },
    willDrawPage: () => {
      drawWatermark(doc);
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'head') {
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.4);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
      if (hookData.section === 'body') {
        doc.setDrawColor(245, 247, 250);
        doc.setLineWidth(0.2);
        doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  addReportSignature(doc, finalY, 'portrait');

  addPDFFooter(doc);

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

