/**
 * SMART FORECAST PDF GENERATOR
 * -------------------------------------------------------------
 * Formal Corporate Financial Reporting Standards:
 * 1. Official Letterhead (Kop Surat Resmi, Logo, Identitas PT Coreterra Geo Engineering)
 * 2. Document Control Metadata (No. Dokumen, Tanggal Terbit Bahasa Indonesia, Sifat Rahasia)
 * 3. Executive KPI Stat Cards (Saldo Kas, Kebutuhan Kas, Status Kas, Runway Hari)
 * 4. Multi-Step Classified Statement (3 Ritme COA: Kasbon Site, Bulanan Pasti, Siklus Proyek + Subtotal)
 * 5. One-Off Modal Awal Disclosure (Catatan Pengungkapan Biaya Non-Rutin Diisolasi)
 * 6. Executive Analysis & Action Plan (Catatan Manajemen & Rencana Mitigasi)
 * 7. Three-Tier Approval Signature Block (Dibuat, Diperiksa, Disetujui)
 * 8. Clean Corporate Footer with page numbers and confidentiality notice
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_CORETERRA_BASE64 } from './billingInvoicePDF';
import type { SmartForecastResult } from './smartForecastEngine';

export interface SimulationParams {
  simulatedRequired: number;
  simulatedInflow: number;
  simulatedSurplusDeficit: number;
  simulatedBurnRatePerDay: number;
  simulatedRunwayDays: number;
}

const getCompanySettings = () => {
  let companySettings = {
    companyName: 'PT. CORETERRA GEO ENGINEERING',
    tagline: 'Civil, Geotechnical & Mining Drilling Contractor',
    address: 'Wisma Kemang Lt. 3, Jl. Kemang Selatan No. 1, Jakarta Selatan',
    contact: 'Telp: (021) 719-8822 | Email: info@coreterrageo.com | www.coreterrageo.com',
    logoBase64: ''
  };
  try {
    const settingsString = localStorage.getItem('ansa-settings-storage');
    if (settingsString) {
      const parsed = JSON.parse(settingsString);
      if (parsed?.state?.settings) {
        if (parsed.state.settings.companyName) {
          companySettings.companyName = parsed.state.settings.companyName.toUpperCase().replace(/ENGINERING/gi, 'ENGINEERING');
        }
        if (parsed.state.settings.logoBase64) {
          companySettings.logoBase64 = parsed.state.settings.logoBase64;
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse company settings from localStorage:', e);
  }

  if (!companySettings.logoBase64) {
    companySettings.logoBase64 = LOGO_CORETERRA_BASE64;
  }
  return companySettings;
};

const formatCurrencyIDR = (val: number): string => {
  const isNegative = val < 0;
  const absVal = Math.abs(val || 0);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(absVal);
  return isNegative ? `(${formatted})` : formatted;
};

const formatDateIndo = (d: Date = new Date()): string => {
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export const generateSmartForecastPDF = (
  forecast: SmartForecastResult,
  sim: SimulationParams
): jsPDF => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const leftMargin = 14;
  const rightMargin = 14;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 182mm
  const settings = getCompanySettings();

  const now = new Date();
  const dateStrIndo = formatDateIndo(now);
  const docRefNo = `FRC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}/${String(Math.floor(100 + Math.random() * 900))}`;

  // ==========================================
  // 1. OFFICIAL CORPORATE LETTERHEAD (KOP SURAT)
  // ==========================================
  let headerBottomY = 28;

  // Render Logo
  const logoData = settings.logoBase64 || LOGO_CORETERRA_BASE64;
  if (logoData) {
    try {
      const imgProps = doc.getImageProperties(logoData);
      const maxW = 46;
      const maxH = 15;
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      const imgW = imgProps.width * ratio;
      const imgH = imgProps.height * ratio;
      doc.addImage(logoData, 'PNG', leftMargin, 11 + (maxH - imgH) / 2, imgW, imgH, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
    }
  }

  // Right Header Text (Company Name & Details)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(41, 72, 37); // Forest Green
  doc.text(settings.companyName, pageWidth - rightMargin, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate Gray
  doc.text(settings.tagline, pageWidth - rightMargin, 19.5, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Muted Slate
  doc.text(settings.address, pageWidth - rightMargin, 23.5, { align: 'right' });

  // Dual Accent Divider
  doc.setDrawColor(41, 72, 37); // Forest Green
  doc.setLineWidth(0.7);
  doc.line(leftMargin, headerBottomY, pageWidth - rightMargin, headerBottomY);

  doc.setDrawColor(212, 175, 55); // Regal Gold
  doc.setLineWidth(0.3);
  doc.line(leftMargin, headerBottomY + 1.2, pageWidth - rightMargin, headerBottomY + 1.2);

  // ==========================================
  // 2. DOCUMENT TITLE & CONTROL METADATA
  // ==========================================
  let currentY = headerBottomY + 6;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // Deep Charcoal
  doc.text('LAPORAN PROYEKSI KEBUTUHAN KAS & KETAHANAN FINANSIAL', leftMargin, currentY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CASH RUNWAY & OPERATIONAL EXPENDITURE FORECAST MODEL', leftMargin, currentY + 4.5);

  currentY += 8;

  // Meta Box Grid
  const metaBoxY = currentY;
  const metaBoxH = 20;
  doc.setFillColor(248, 250, 252); // Soft Slate / White-gray (#F8FAFC)
  doc.setDrawColor(203, 213, 225); // Border (#CBD5E1)
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, metaBoxY, contentWidth, metaBoxH, 2, 2, 'FD');

  const col1X = leftMargin + 4;
  const col2X = leftMargin + 95;

  // Left Column Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Cakupan Entitas / Proyek:', col1X, metaBoxY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const truncatedScope = forecast.scopeName.length > 55 ? forecast.scopeName.substring(0, 52) + '...' : forecast.scopeName;
  doc.text(truncatedScope, col1X, metaBoxY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Horizon Waktu Proyeksi:', col1X, metaBoxY + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 72, 37);
  doc.text(forecast.horizonLabel, col1X + 32, metaBoxY + 14.5);

  // Right Column Meta
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Nomor Referensi:', col2X, metaBoxY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFont('courier', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(docRefNo, col2X + 24, metaBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tanggal Terbit:', col2X, metaBoxY + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(dateStrIndo, col2X + 24, metaBoxY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Klasifikasi Dokumen:', col2X, metaBoxY + 14.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Red
  doc.text('RAHASIA & INTERNAL (CONFIDENTIAL)', col2X + 28, metaBoxY + 14.5);

  currentY = metaBoxY + metaBoxH + 4;

  // ==========================================
  // 3. EXECUTIVE KPI METRIC CARDS (4 TILES)
  // ==========================================
  const cardW = (contentWidth - 9) / 4; // 43.25mm each
  const cardH = 17;

  const cardsData = [
    {
      label: 'SALDO KAS TERSEDIA',
      sub: 'Buku Besar Kas & Bank',
      value: formatCurrencyIDR(forecast.currentCashBalance),
      bg: [240, 249, 255],
      border: [186, 230, 253],
      valColor: [3, 105, 161],
      labelColor: [7, 89, 133]
    },
    {
      label: `KEBUTUHAN KAS (${forecast.horizonDays} HARI)`,
      sub: 'Total Outflow Rutin',
      value: formatCurrencyIDR(sim.simulatedRequired),
      bg: [254, 242, 242],
      border: [254, 202, 202],
      valColor: [185, 28, 28],
      labelColor: [153, 27, 27]
    },
    {
      label: 'STATUS KECUKUPAN',
      sub: sim.simulatedSurplusDeficit >= 0 ? `Surplus: +${formatCurrencyIDR(sim.simulatedSurplusDeficit)}` : `Defisit: ${formatCurrencyIDR(sim.simulatedSurplusDeficit)}`,
      value: sim.simulatedSurplusDeficit >= 0 ? 'KAS MENCUKUPI' : 'DEFISIT KAS',
      bg: sim.simulatedSurplusDeficit >= 0 ? [240, 253, 244] : [255, 241, 242],
      border: sim.simulatedSurplusDeficit >= 0 ? [187, 247, 208] : [253, 164, 175],
      valColor: sim.simulatedSurplusDeficit >= 0 ? [21, 128, 61] : [190, 18, 60],
      labelColor: sim.simulatedSurplusDeficit >= 0 ? [22, 101, 52] : [159, 18, 57]
    },
    {
      label: 'KETAHANAN KAS (RUNWAY)',
      sub: `Burn: ${formatCurrencyIDR(sim.simulatedBurnRatePerDay)}/Hari`,
      value: `${sim.simulatedRunwayDays} HARI`,
      bg: [254, 252, 232],
      border: [253, 224, 71],
      valColor: [180, 83, 9],
      labelColor: [133, 77, 14]
    }
  ];

  cardsData.forEach((c, idx) => {
    const cX = leftMargin + idx * (cardW + 3);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(cX, currentY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(c.labelColor[0], c.labelColor[1], c.labelColor[2]);
    doc.text(c.label, cX + 2.5, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(c.valColor[0], c.valColor[1], c.valColor[2]);
    doc.text(c.value, cX + 2.5, currentY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(c.sub, cX + 2.5, currentY + 14.5);
  });

  currentY += cardH + 5;

  // ==========================================
  // 4. TABLE I: RINCIAN 3 RITME BIAYA COA
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(41, 72, 37);
  doc.text('I. RINCIAN BIAYA OPERASIONAL RUTIN MENURUT RITME & COA', leftMargin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pengeluaran operasional diklasifikasikan berdasarkan frekuensi perputaran riil lapangan dan bagan akun standar.', leftMargin, currentY + 4);

  currentY += 6;

  // Build classified rows
  const classifiedTableRows: any[] = [];

  forecast.cadenceGroups.forEach((group, gIdx) => {
    const isWeekly = group.id === 'WEEKLY_SITE';
    const isMonthly = group.id === 'MONTHLY_FIXED';

    const groupHeaderBg = isWeekly ? [254, 243, 199] : isMonthly ? [220, 252, 231] : [219, 234, 254];
    const groupHeaderTextColor = isWeekly ? [146, 64, 14] : isMonthly ? [22, 101, 52] : [30, 64, 175];
    const romanNumeral = gIdx === 0 ? 'A' : gIdx === 1 ? 'B' : 'C';

    // Header Row of Group
    classifiedTableRows.push([
      {
        content: `BAGIAN ${romanNumeral}: ${group.title.toUpperCase()} (${group.cadenceLabel.toUpperCase()})`,
        colSpan: 5,
        styles: {
          fillColor: groupHeaderBg,
          textColor: groupHeaderTextColor,
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }
        }
      }
    ]);

    // Items
    group.items.forEach((item, itemIdx) => {
      const coaLabel = item.coaCode ? `[${item.coaCode}] ${item.title}` : item.title;
      classifiedTableRows.push([
        `${romanNumeral}.${itemIdx + 1}`,
        coaLabel,
        item.subDesc,
        formatCurrencyIDR(item.monthlyAmount),
        formatCurrencyIDR(item.projectedAmount)
      ]);
    });

    // Subtotal Row
    const subtotalBg = isWeekly ? [255, 251, 235] : isMonthly ? [240, 253, 244] : [239, 246, 255];
    classifiedTableRows.push([
      { content: '', styles: { fillColor: subtotalBg } },
      { content: `Subtotal ${group.title}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: subtotalBg, textColor: groupHeaderTextColor } },
      { content: formatCurrencyIDR(group.monthlyTotal), styles: { fontStyle: 'bold', halign: 'right', fillColor: subtotalBg, textColor: groupHeaderTextColor } },
      { content: formatCurrencyIDR(group.projectedTotal), styles: { fontStyle: 'bold', halign: 'right', fillColor: subtotalBg, textColor: groupHeaderTextColor } }
    ]);
  });

  // Grand Total Row
  classifiedTableRows.push([
    { content: '', styles: { fillColor: [41, 72, 37] } },
    { content: `TOTAL KEBUTUHAN OPERASIONAL (${forecast.horizonLabel.toUpperCase()})`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [41, 72, 37], textColor: [255, 255, 255], fontSize: 8 } },
    { content: formatCurrencyIDR(forecast.historicalRecurringOpex), styles: { fontStyle: 'bold', halign: 'right', fillColor: [41, 72, 37], textColor: [255, 255, 255], fontSize: 8 } },
    { content: formatCurrencyIDR(forecast.projectedTotalRequired), styles: { fontStyle: 'bold', halign: 'right', fillColor: [41, 72, 37], textColor: [255, 255, 255], fontSize: 8 } }
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      'No',
      'Kode & Akun Biaya Operasional',
      'Rincian / Karakteristik Lapangan',
      'Basis Bulanan (Rp)',
      `Kebutuhan ${forecast.horizonLabel} (Rp)`
    ]],
    body: classifiedTableRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      font: 'helvetica',
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 64, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 31, halign: 'right', font: 'courier' },
      4: { cellWidth: 32, halign: 'right', font: 'courier' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // ==========================================
  // 5. TABLE II: DISCLOSURE BIAYA SATU KALI (ONE-OFF)
  // ==========================================
  if (forecast.oneOffItems.length > 0) {
    if (currentY > 215) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(41, 72, 37);
    doc.text('II. CATATAN PENGUNGKAPAN BIAYA MODAL & SATU KALI (ONE-OFF DISCLOSURE)', leftMargin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Biaya berikut merupakan modal awal, mobilisasi alat, atau pelunasan masa lalu yang diisolasi agar tidak mendistorsi proyeksi rutin.', leftMargin, currentY + 4);

    currentY += 6;

    const oneOffRows: any[] = forecast.oneOffItems.slice(0, 8).map((item, idx) => [
      String(idx + 1),
      item.date,
      item.desc,
      'Belanja Modal / Mobilisasi / Subkon Masa Lalu (Non-Rutin)',
      formatCurrencyIDR(item.amount)
    ]);

    oneOffRows.push([
      { content: '', styles: { fillColor: [241, 245, 249] } },
      { content: 'TOTAL BIAYA SATU KALI (DIISOLASI DARI PERHITUNGAN RUTIN)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: formatCurrencyIDR(forecast.historicalOneOffExpense), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [15, 23, 42], font: 'courier' } }
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['No', 'Tanggal', 'Keterangan Transaksi', 'Karakteristik Transaksi', 'Nominal Transaksi (Rp)']],
      body: oneOffRows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        font: 'helvetica',
        textColor: [51, 65, 85],
        cellPadding: 1.8,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 55 },
        4: { cellWidth: 32, halign: 'right', font: 'courier' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // ==========================================
  // 6. SECTION III: RINGKASAN ANALISIS & ACTION PLAN
  // ==========================================
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(41, 72, 37);
  doc.text('III. RINGKASAN ANALISIS EKSEKUTIF & REKOMENDASI TINDAKAN', leftMargin, currentY);

  const notesBody = [
    [
      '1',
      `Analisis Likuiditas Kas: Saldo kas riil tersedia sebesar ${formatCurrencyIDR(forecast.currentCashBalance)} sedangkan total kewajiban operasional rutin selama ${forecast.horizonLabel} mencapai ${formatCurrencyIDR(sim.simulatedRequired)}, sehingga terjadi ${sim.simulatedSurplusDeficit >= 0 ? 'Surplus Kas' : 'Defisit Kas'} sebesar ${formatCurrencyIDR(sim.simulatedSurplusDeficit)}.`
    ],
    [
      '2',
      `Ketahanan Kas (Cash Runway): Berdasarkan rata-rata burn rate harian sebesar ${formatCurrencyIDR(sim.simulatedBurnRatePerDay)}/hari, cadangan kas yang ada diperkirakan mampu menopang operasional selama ${sim.simulatedRunwayDays} Hari.`
    ],
    [
      '3',
      `Prioritas Kasbon Lapangan: Penyaluran kasbon operasional site disarankan dilakukan bertahap per siklus 10 hari (Rp 11,4 - Rp 15 Juta) dengan prioritas utama BBM Solar Genset/Rig & makan dapur crew bor untuk menjamin kelancaran pengeboran (zero downtime).`
    ],
    [
      '4',
      `Rencana Mitigasi Piutang (AR): Mengoptimalkan penagihan termin piutang proyek berjalan (potensi inflow: ${formatCurrencyIDR(sim.simulatedInflow)}) sebelum cadangan kas berada di bawah batas aman operasional.`
    ]
  ];

  autoTable(doc, {
    startY: currentY + 3,
    body: notesBody,
    theme: 'plain',
    styles: {
      fontSize: 7.2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
      valign: 'top'
    },
    columnStyles: {
      0: { cellWidth: 7, fontStyle: 'bold', halign: 'center', textColor: [41, 72, 37] },
      1: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // ==========================================
  // 7. THREE-TIER APPROVAL SIGNATURE BLOCK
  // ==========================================
  // Ensure signature block (needs ~42mm) never collides with footer (at 285mm)
  if (currentY + 42 > 265) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('LEMBAR PENGESAHAN LAPORAN KEUANGAN PROYEKSI', leftMargin, currentY);

  const sigStartY = currentY + 6;
  const sigColW = contentWidth / 3;

  const signers = [
    {
      role: 'Dibuat Oleh:',
      title: 'Staff Keuangan & Akuntansi',
      name: '( Riska Prawita / Staff Finance )'
    },
    {
      role: 'Diperiksa Oleh:',
      title: 'Project Manager / PJO Site',
      name: '( Dugie Gentri Nugroho / PJO )'
    },
    {
      role: 'Disetujui Oleh:',
      title: 'Direktur Keuangan / Direktur',
      name: '( Direktur Keuangan )'
    }
  ];

  signers.forEach((s, idx) => {
    const colX = leftMargin + idx * sigColW;
    const centerX = colX + sigColW / 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(s.role, centerX, sigStartY, { align: 'center' });
    doc.text(s.title, centerX, sigStartY + 4.5, { align: 'center' });

    // Underline line for signature
    const lineW = sigColW - 16;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(centerX - lineW / 2, sigStartY + 23, centerX + lineW / 2, sigStartY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(s.name, centerX, sigStartY + 27.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Tgl: ${dateStrIndo}`, centerX, sigStartY + 31.5, { align: 'center' });
  });

  // ==========================================
  // 8. GLOBAL FOOTER (EACH PAGE)
  // ==========================================
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, pageHeight - 12, pageWidth - rightMargin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${settings.companyName} | Sistem Pintar Keuangan ANSA ERP v2.4`, leftMargin, pageHeight - 8);

    doc.text(
      `Halaman ${i} dari ${pageCount}  |  Dicetak pada: ${dateStrIndo}  |  Dokumen Resmi Rahasia & Internal`,
      pageWidth - rightMargin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  return doc;
};
