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
    doc.setTextColor(41, 72, 37); // Forest Green
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

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 72, 37);
  doc.text(settings.companyName || 'PT. Coreterra Geo Engineering', 196, 14, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(20, 60, 100);
  doc.text(title, 196, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${periodStr}`, 196, 26, { align: 'right' });
  
  doc.setDrawColor(212, 175, 55); // Gold divider
  doc.setLineWidth(0.5);
  doc.line(14, 30, 196, 30);

  return 38; // Next Y
};

const addPDFFooter = (doc: jsPDF) => {
  const pageCount = (doc.internal as any).getNumberOfPages();
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    
    doc.text(`Dicetak tanggal: ${today}`, 14, 285);
    
    if (i === pageCount) {
      doc.text('(dibuat dan didukung oleh ANSA - Digital Product Developer.)', 14, 290);
    }
    
    doc.text(`Halaman ${i} dari ${pageCount}`, 196, 290, { align: 'right' });
  }
};

const baseAutoTableStyles = {
  theme: 'grid' as const,
  styles: { fontSize: 8, font: 'helvetica', textColor: [50, 50, 50], cellPadding: 3 },
  headStyles: { fontStyle: 'bold' as const, textColor: [0, 0, 0], fillColor: [220, 230, 240] },
  columnStyles: { 1: { halign: 'right' as const, cellWidth: 50 } }
};

const setupAccountingCell = (data: any) => {
  if (data.column.index === 1 && data.section === 'body') {
    const text = String(data.cell.raw);
    if (text.includes('Rp')) data.cell.text = ['']; 
  }
  
  // Custom borders for groups/totals
  if (data.section === 'body') {
    const text = String(data.row.raw[0]?.content || data.row.raw[0]);
    if (text === text.toUpperCase() || text.startsWith('Total')) {
      data.cell.styles.fontStyle = 'bold';
      data.cell.styles.textColor = [30, 30, 30];
    }
    if (text.startsWith('Total ') || text.startsWith('NET ') || text.startsWith('TOTAL ')) {
       // Only standard jspdf-autotable properties: we handle lines manually or just use plain theme and add borders in hook
    }
  }
};

const drawAccountingCell = (doc: jsPDF, data: any) => {
  if (data.section === 'body') {
    const text = String(data.cell.raw);
    let rp = '';
    let num = '';
    if (text.startsWith('Rp')) {
      rp = 'Rp';
      num = text.replace(/^Rp\s*/, '');
    } else if (text.startsWith('-Rp')) {
      rp = '-Rp';
      num = text.replace(/^-Rp\s*/, '');
    } else if (text.startsWith('(Rp')) {
      rp = '(Rp';
      num = text.replace(/^\(Rp\s*/, '');
    }
    
    if (rp && num) {
      const y = data.cell.y + (data.cell.height / 2);
      // Ensure color is correct based on row style
      const textColor = data.cell.styles.textColor;
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      if (data.cell.styles.fontStyle === 'bold') doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      
      doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
      doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
    }
  }
};

const renderIncomeStatementToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { revenue, cogs, gross_profit, expenses, net_income } = data;
  const opex = expenses;
  const net_profit = net_income;
  const rows: any[][] = [];

  rows.push([{ content: 'PENDAPATAN (REVENUE)' }, '']);
  if (revenue?.items?.length > 0) {
    revenue.items.forEach((r: any) => rows.push([`   ${r.account_code} - ${r.account_name}`, formatCurrency(r.balance)]));
  }
  rows.push([{ content: 'Total Pendapatan' }, formatCurrency(revenue?.total)]);
  rows.push([{ content: ' ' }, ' ']);

  rows.push([{ content: 'BEBAN POKOK (COGS)' }, '']);
  if (cogs?.items?.length > 0) {
    cogs.items.forEach((c: any) => rows.push([`   ${c.account_code} - ${c.account_name}`, `(Rp ${formatCurrency(c.balance).replace('Rp', '').trim()})`]));
  }
  rows.push([{ content: 'Total Beban Pokok' }, `(Rp ${formatCurrency(cogs?.total).replace('Rp', '').trim()})`]);
  rows.push([{ content: ' ' }, ' ']);

  rows.push([{ content: 'LABA KOTOR (GROSS PROFIT)' }, formatCurrency(gross_profit)]);
  rows.push([{ content: ' ' }, ' ']);

  rows.push([{ content: 'BEBAN OPERASIONAL (OPEX)' }, '']);
  if (opex?.items?.length > 0) {
    opex.items.forEach((o: any) => rows.push([`   ${o.account_code} - ${o.account_name}`, `(Rp ${formatCurrency(o.balance).replace('Rp', '').trim()})`]));
  }
  rows.push([{ content: 'Total Beban Operasional' }, `(Rp ${formatCurrency(opex?.total).replace('Rp', '').trim()})`]);
  rows.push([{ content: ' ' }, ' ']);

  rows.push([{ content: 'NET PROFIT (RUGI/LABA)' }, formatCurrency(net_profit)]);

  autoTable(doc, {
    ...baseAutoTableStyles,
    startY: startY,
    head: [['Deskripsi', 'Nominal']],
    body: rows,
    willDrawCell: setupAccountingCell,
    didDrawCell: (hookData) => {
      drawAccountingCell(doc, hookData); // draw border and custom text
    }
  });

  return (doc as any).lastAutoTable.finalY;
};

const renderBalanceSheetToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { assets, liabilities, equity, total_liabilities_and_equity } = data;
  const rows: any[][] = [];

  rows.push([{ content: 'ASET (ASSETS)' }, '']);
  if (assets?.items?.length > 0) {
    assets.items.forEach((a: any) => {
      rows.push([`   ${a.account_code} - ${a.account_name}`, formatCurrency(a.balance)]);
    });
  }
  rows.push([{ content: 'TOTAL ASET' }, formatCurrency(assets?.total)]);
  rows.push([{ content: ' ' }, ' ']);

  rows.push([{ content: 'KEWAJIBAN (LIABILITIES)' }, '']);
  if (liabilities?.items?.length > 0) {
    liabilities.items.forEach((l: any) => {
      rows.push([`   ${l.account_code} - ${l.account_name}`, formatCurrency(l.balance)]);
    });
  }
  rows.push([{ content: 'Total Kewajiban' }, formatCurrency(liabilities?.total)]);
  rows.push([{ content: ' ' }, ' ']);

  rows.push([{ content: 'EKUITAS (EQUITY)' }, '']);
  if (equity?.items?.length > 0) {
    equity.items.forEach((e: any) => {
      rows.push([`   ${e.account_code} - ${e.account_name}`, formatCurrency(e.balance)]);
    });
  }
  rows.push([{ content: 'Total Ekuitas' }, formatCurrency(equity?.total)]);
  rows.push([{ content: ' ' }, ' ']);
  
  rows.push([{ content: 'TOTAL KEWAJIBAN & EKUITAS' }, formatCurrency(total_liabilities_and_equity)]);

  autoTable(doc, {
    ...baseAutoTableStyles,
    startY: startY,
    head: [['Deskripsi', 'Nominal']],
    body: rows,
    willDrawCell: setupAccountingCell,
    didDrawCell: (hookData) => {
      drawAccountingCell(doc, hookData);
    }
  });

  return (doc as any).lastAutoTable.finalY;
};

const renderCashFlowToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { operating_activities, investing_activities, financing_activities, net_increase_in_cash } = data;
  const rows: any[][] = [];

  const addSection = (title: string, sectionData: any) => {
    rows.push([{ content: title }, '']);
    if (sectionData) {
      rows.push(['   Penerimaan Kas (Inflow)', formatCurrency(sectionData.inflow)]);
      rows.push(['   Pengeluaran Kas (Outflow)', `(Rp ${formatCurrency(sectionData.outflow).replace('Rp', '').trim()})`]);
      const netStr = sectionData.net < 0 ? `(Rp ${formatCurrency(Math.abs(sectionData.net)).replace('Rp', '').trim()})` : formatCurrency(sectionData.net);
      rows.push([{ content: `Total Arus Kas dari ${title}` }, netStr]);
      rows.push([{ content: ' ' }, ' ']);
    }
  };

  addSection('Aktivitas Operasional', operating_activities);
  addSection('Aktivitas Investasi', investing_activities);
  addSection('Aktivitas Pendanaan', financing_activities);

  const netStr = net_increase_in_cash < 0 ? `(Rp ${formatCurrency(Math.abs(net_increase_in_cash)).replace('Rp', '').trim()})` : formatCurrency(net_increase_in_cash);
  rows.push([{ content: 'KENAIKAN / (PENURUNAN) KAS BERSIH' }, netStr]);
  
  autoTable(doc, {
    ...baseAutoTableStyles,
    startY: startY,
    head: [['Deskripsi', 'Nominal']],
    body: rows,
    willDrawCell: setupAccountingCell,
    didDrawCell: (hookData) => {
      drawAccountingCell(doc, hookData);
    }
  });

  return (doc as any).lastAutoTable.finalY;
};

const renderEquityToPDF = (doc: jsPDF, data: any, startY: number) => {
  const { beginning_equity, additions, deductions, ending_equity } = data;
  const rows: any[][] = [];

  rows.push([{ content: 'Modal Awal (Beginning Equity)' }, formatCurrency(beginning_equity)]);
  
  const incStr = additions?.net_income < 0 ? `(Rp ${formatCurrency(Math.abs(additions?.net_income)).replace('Rp', '').trim()})` : formatCurrency(additions?.net_income);
  rows.push(['   Laba Bersih Tahun Berjalan', incStr]);
  rows.push(['   Tambahan Modal Disetor', formatCurrency(additions?.new_capital || 0)]);
  rows.push(['   Penarikan Dividen / Prive', `(Rp ${formatCurrency(Math.abs(deductions?.dividends_paid || 0)).replace('Rp', '').trim()})`]);

  rows.push([{ content: 'Modal Akhir (Ending Equity)' }, formatCurrency(ending_equity)]);

  autoTable(doc, {
    ...baseAutoTableStyles,
    startY: startY,
    head: [['Deskripsi', 'Nominal']],
    body: rows,
    willDrawCell: setupAccountingCell,
    didDrawCell: (hookData) => {
      drawAccountingCell(doc, hookData);
    }
  });

  return (doc as any).lastAutoTable.finalY;
};

const renderCalkToPDF = (doc: jsPDF, data: any, startY: number) => {
  const summary = data?.summary;
  if (!summary) return startY;

  let currentY = startY;

  const checkPageBreak = (y: number, addedHeight: number) => {
    if (y + addedHeight > 270) {
      doc.addPage();
      return 20;
    }
    return y;
  };

  const addHeader = (title: string, y: number) => {
    y = checkPageBreak(y, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(title, 14, y);
    return y + 6;
  };

  const addText = (text: string, y: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, 180);
    y = checkPageBreak(y, lines.length * 5);
    doc.text(lines, 14, y);
    return y + (lines.length * 5) + 2;
  };

  currentY = addHeader('1. Posisi Kas & Bank (Cash Position)', currentY);
  currentY = addText(`Saldo kas dan bank perusahaan yang tersedia untuk kegiatan operasional per akhir periode berjumlah ${formatCurrency(summary.cash_position)}. Rincian saldo kas adalah sebagai berikut:`, currentY);
  
  const cashRows = Object.entries(summary.cash_by_account || {}).map(([name, amount]: any) => [`   ${name}`, formatCurrency(amount)]);
  cashRows.push([{ content: 'Total Kas & Bank', styles: { fontStyle: 'bold' } }, formatCurrency(summary.cash_position)]);
  
  autoTable(doc, {
    ...baseAutoTableStyles,
    startY: currentY,
    body: cashRows,
    willDrawCell: setupAccountingCell,
    didDrawCell: (hookData) => { drawAccountingCell(doc, hookData); }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  currentY = addHeader('2. Nilai Proyek Aktif', currentY);
  currentY = addText(`Perusahaan saat ini memiliki ${summary.active_projects} proyek aktif dari total ${summary.total_projects} proyek tercatat. Total Nilai Kontrak dari seluruh proyek tersebut adalah ${formatCurrency(summary.total_contract_value)}.`, currentY);
  
  const projRows = summary.project_list?.map((p: any) => [`   ${p.name} (${p.code}) - ${p.status.toUpperCase()}`, formatCurrency(p.value)]) || [];
  projRows.push([{ content: 'Total Contract Value', styles: { fontStyle: 'bold' } }, formatCurrency(summary.total_contract_value)]);
  
  autoTable(doc, {
    ...baseAutoTableStyles,
    startY: currentY,
    body: projRows,
    willDrawCell: setupAccountingCell,
    didDrawCell: (hookData) => { drawAccountingCell(doc, hookData); }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  currentY = addHeader('3. Piutang Usaha (Account Receivables)', currentY);
  currentY = addText(`Total tagihan kepada klien/pelanggan yang telah diterbitkan adalah sebesar ${formatCurrency(summary.total_ar)}. Dari jumlah tersebut, tagihan yang masih menunggak atau belum dibayar penuh sebesar ${formatCurrency(summary.outstanding_ar)}.`, currentY);
  currentY += 5;

  currentY = addHeader('4. Hutang Usaha (Account Payables)', currentY);
  currentY = addText(`Total hutang kepada vendor/subkontraktor yang tercatat adalah sebesar ${formatCurrency(summary.total_ap)}. Sisa kewajiban yang masih harus dibayar saat ini adalah ${formatCurrency(summary.outstanding_ap)}.`, currentY);
  currentY += 10;

  const header5Title = '5. Kebijakan Akuntansi & Catatan Penting';
  const text5A = `A. Laporan Keuangan Konsolidasi vs Laporan Proyek
Dalam pencatatan akuntansi perusahaan, Laporan Keuangan Konsolidasi (Laba Rugi Umum) mencakup seluruh aktivitas finansial perusahaan, termasuk di dalamnya Beban Operasional Pusat (Overhead/OPEX). Di sisi lain, Laporan Keuangan Proyek berfokus secara eksklusif pada Margin Laba Kotor (Gross Profit) dari masing-masing proyek (Pendapatan Proyek dikurangi Beban Langsung Proyek). 

Oleh karena itu, akumulasi Laba Kotor dari seluruh proyek tidak berkorelasi langsung dengan Laba Bersih Perusahaan maupun Saldo Kas Aktual. Hal ini dikarenakan sebagian dari kas proyek tersebut dialokasikan untuk mendanai pengeluaran operasional terpusat perusahaan.`;

  const text5B = `B. Pencatatan Mutasi Kas & Bank (Inter-bank Transfers)
Mutasi atau pemindahan dana antar rekening bank milik perusahaan (misalnya dari Bank Mandiri ke Bank CIMB) dicatat mutlak sebagai pemindahan letak aset kas. Transaksi ini diakui melalui Jurnal Umum dan tidak diklasifikasikan sebagai Beban maupun Pendapatan. Dengan demikian, aktivitas mutasi kas antar bank tidak memiliki dampak terhadap Laba/Rugi bersih perusahaan, melainkan hanya mengubah komposisi rincian pada Posisi Kas & Bank di Neraca.`;

  // Pre-calculate heights to prevent orphaned headers
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const linesA = doc.splitTextToSize(text5A, 180);
  const linesB = doc.splitTextToSize(text5B, 180);
  const totalRequiredHeight = 10 + (linesA.length * 5) + 5 + (linesB.length * 5);

  currentY = checkPageBreak(currentY, totalRequiredHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(header5Title, 14, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(linesA, 14, currentY);
  currentY += (linesA.length * 5) + 5;

  doc.text(linesB, 14, currentY);
  currentY += (linesB.length * 5) + 2;

  return currentY;
};

export const generateSingleReportPDF = (activeTab: string, reportData: any, startDate: string, endDate: string) => {
  if (!reportData) return;
  const doc = new jsPDF({ orientation: 'portrait' });
  
  const titleMap: Record<string, string> = {
    income: 'INCOME STATEMENT (LABA RUGI)',
    balance: 'BALANCE SHEET (NERACA)',
    cashflow: 'STATEMENT OF CASH FLOWS (ARUS KAS)',
    equity: 'STATEMENT OF CHANGES IN EQUITY',
    calk: 'CATATAN ATAS LAPORAN KEUANGAN (CALK)'
  };
  
  const periodStr = `${startDate} s/d ${endDate}`;
  const startY = addHeaderWithLogo(doc, titleMap[activeTab] || 'REPORT', periodStr, false);

  try {
    if (activeTab === 'income') renderIncomeStatementToPDF(doc, reportData, startY);
    else if (activeTab === 'balance') renderBalanceSheetToPDF(doc, reportData, startY);
    else if (activeTab === 'cashflow') renderCashFlowToPDF(doc, reportData, startY);
    else if (activeTab === 'equity') renderEquityToPDF(doc, reportData, startY);
    else if (activeTab === 'calk') renderCalkToPDF(doc, reportData, startY);
    
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

    const [incRes, balRes, cfRes, eqRes, calkRes] = await Promise.all([
      fetch(`http://localhost:8000/api/v1/financial-statements/income-statement?start_date=${startDate}&end_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/balance-sheet?as_of_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/cash-flow?start_date=${startDate}&end_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/equity-changes?start_date=${startDate}&end_date=${endDate}`, { headers }),
      fetch(`http://localhost:8000/api/v1/financial-statements/calk-notes?start_date=${startDate}&end_date=${endDate}`, { headers })
    ]);

    const income = await incRes.json();
    const balance = await balRes.json();
    const cashflow = await cfRes.json();
    const equity = await eqRes.json();
    const calk = await calkRes.json();

    const doc = new jsPDF({ orientation: 'portrait' });
    const periodStr = `${startDate} s/d ${endDate}`;
    
    // Page 1: Cover
    addHeaderWithLogo(doc, 'CONSOLIDATED FINANCIAL REPORTS', periodStr, true);
    
    // Page 2: Income Statement
    doc.addPage();
    let startY = addHeaderWithLogo(doc, 'INCOME STATEMENT (LABA RUGI)', periodStr, false);
    renderIncomeStatementToPDF(doc, income, startY);

    // Page 3: Balance Sheet
    doc.addPage();
    startY = addHeaderWithLogo(doc, 'BALANCE SHEET (NERACA)', periodStr, false);
    renderBalanceSheetToPDF(doc, balance, startY);

    // Page 4: Statement of Equity
    doc.addPage();
    startY = addHeaderWithLogo(doc, 'STATEMENT OF CHANGES IN EQUITY', periodStr, false);
    renderEquityToPDF(doc, equity, startY);

    // Page 5: Cash Flow
    doc.addPage();
    startY = addHeaderWithLogo(doc, 'STATEMENT OF CASH FLOWS', periodStr, false);
    renderCashFlowToPDF(doc, cashflow, startY);

    // Page 6: CALK
    doc.addPage();
    startY = addHeaderWithLogo(doc, 'CATATAN ATAS LAPORAN KEUANGAN (CALK)', periodStr, false);
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
