import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LOGO_CORETERRA_BASE64,
  CAP_CORETERRA_BASE64,
  TTD_SETYO_BASE64,
  getCompanySettings,
  type CompanySettings,
} from './billingInvoicePDF';

export interface POPDFItem {
  id?: string;
  item_code?: string;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
}

export interface POPDFData {
  id?: string;
  po_number: string;
  vendor_id?: string;
  vendor_name?: string;
  vendor_code?: string;
  vendor_address?: string;
  vendor_contact?: string;
  vendor_phone?: string;
  vendor_npwp?: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  category?: string;
  payment_terms?: string;
  due_date?: string;
  date: string;
  status: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  items: POPDFItem[];
}

/**
 * Format currency with full decimal precision (Rupiah)
 * e.g. Rp 95.017.120,90 or Rp 134.002.707,54
 */
export function formatIDRCurrency(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
  const hasCents = Math.abs(val % 1) > 0.001;
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(val);
  // Replace non-breaking space with standard space
  return formatted.replace(/\u00a0/g, ' ');
}

/**
 * Number to words converter for Indonesian (Terbilang) with decimal cents support
 */
export function angkaKeKata(n: number): string {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n < 0) return 'minus ' + angkaKeKata(Math.abs(n));
  if (n < 12) return satuan[n];
  if (n < 20) return angkaKeKata(n - 10) + ' belas';
  if (n < 100) return angkaKeKata(Math.floor(n / 10)) + ' puluh ' + (n % 10 !== 0 ? satuan[n % 10] : '');
  if (n < 200) return 'seratus ' + (n - 100 !== 0 ? angkaKeKata(n - 100) : '');
  if (n < 1000) return satuan[Math.floor(n / 100)] + ' ratus ' + (n % 100 !== 0 ? angkaKeKata(n % 100) : '');
  if (n < 2000) return 'seribu ' + (n - 1000 !== 0 ? angkaKeKata(n - 1000) : '');
  if (n < 1000000) return angkaKeKata(Math.floor(n / 1000)) + ' ribu ' + (n % 1000 !== 0 ? angkaKeKata(n % 1000) : '');
  if (n < 1000000000) return angkaKeKata(Math.floor(n / 1000000)) + ' juta ' + (n % 1000000 !== 0 ? angkaKeKata(n % 1000000) : '');
  if (n < 1000000000000) return angkaKeKata(Math.floor(n / 1000000000)) + ' miliar ' + (n % 1000000000 !== 0 ? angkaKeKata(n % 1000000000) : '');
  return angkaKeKata(Math.floor(n / 1000000000000)) + ' triliun ' + (n % 1000000000000 !== 0 ? angkaKeKata(n % 1000000000000) : '');
}

export function terbilangRupiah(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'Nol rupiah';
  const integerPart = Math.floor(Math.abs(val));
  const decimalPart = Math.round((Math.abs(val) - integerPart) * 100);

  let result = angkaKeKata(integerPart).trim() + ' rupiah';
  if (decimalPart > 0) {
    result += ' ' + angkaKeKata(decimalPart).trim() + ' sen';
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Open PDF viewer preview modal/window or download directly
 */
function openPdfPreviewOrDownload(doc: jsPDF, filename: string) {
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  const newWin = window.open('', '_blank');
  if (newWin) {
    newWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #323639; display: flex; flex-direction: column; }
            .header-bar { height: 48px; background: #1e293b; color: #ffffff; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #334155; flex-shrink: 0; z-index: 99; }
            .doc-title { font-size: 14px; font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 8px; font-family: monospace; }
            .doc-title span { background: #0f172a; padding: 3px 8px; border-radius: 4px; border: 1px solid #334155; font-size: 12px; color: #fbbf24; }
            .btn-group { display: flex; align-items: center; gap: 10px; }
            .btn { text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; }
            .btn-primary { background: #d97706; color: #ffffff; }
            .btn-primary:hover { background: #b45309; }
            .btn-secondary { background: #334155; color: #f1f5f9; }
            .btn-secondary:hover { background: #475569; }
            iframe { width: 100%; flex: 1; border: none; background: #525659; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="doc-title">
              <span>PURCHASE ORDER</span> ${filename}
            </div>
            <div class="btn-group">
              <button onclick="window.frames[0].focus(); window.frames[0].print();" class="btn btn-secondary">
                🖨️ Cetak / Print
              </button>
              <a href="${blobUrl}" download="${filename}" class="btn btn-primary">
                ⬇️ Unduh PDF (${filename})
              </a>
            </div>
          </div>
          <iframe id="pdfFrame" src="${blobUrl}#filename=${encodeURIComponent(filename)}"></iframe>
        </body>
      </html>
    `);
    newWin.document.close();
  } else {
    doc.save(filename);
  }
}

/**
 * Draw corporate footer with amber line and dark navy bar
 * Structured 3-section layout (Left, Center, Right) with guaranteed non-overlapping text and multi-page support
 */
function drawCorporateFooter(doc: jsPDF, companyName: string, phone: string, _address?: string) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerHeight = 14;
  const footerY = pageHeight - footerHeight;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Accent Amber/Gold Line (Preserved from approved design)
    doc.setFillColor(217, 119, 6);
    doc.rect(0, footerY - 1.2, pageWidth, 1.2, 'F');

    // Main Dark Navy Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, footerY, pageWidth, footerHeight, 'F');

    // 1. Left Section: Company Name & Proper Location/Contact with map pin icon
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(companyName.toUpperCase(), 14, footerY + 5);

    // Small crisp location pin icon
    doc.setFillColor(203, 213, 225);
    doc.circle(15.2, footerY + 8.2, 0.7, 'F');
    doc.triangle(14.6, footerY + 8.4, 15.8, footerY + 8.4, 15.2, footerY + 9.7, 'F');
    doc.setFillColor(15, 23, 42);
    doc.circle(15.2, footerY + 8.2, 0.28, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(203, 213, 225);
    const leftText = phone
      ? `Gardenia Estate, Ciputat, Tangerang Selatan • ${phone}`
      : 'Gardenia Estate, Ciputat, Tangerang Selatan';
    doc.text(leftText, 17.5, footerY + 9.5);

    // 2. Center Section: & THANK YOU FOR YOUR BUSINESS & (Amber Gold)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(251, 191, 36); // Amber Gold
    doc.text('& THANK YOU FOR YOUR BUSINESS &', pageWidth / 2, footerY + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('PT Coreterra Geo Engineering • Procurement System', pageWidth / 2, footerY + 9.5, { align: 'center' });

    // 3. Right Section: Dynamic Page Counter (ANSA FINANCE removed as requested)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, footerY + 7.5, { align: 'right' });
  }
}

/**
 * Render single company signature (PT Coreterra Geo Engineering) with stamp and director signature
 */
function renderCompanySignatureBlock(
  doc: jsPDF,
  sigX: number,
  startY: number,
  companyName: string,
  directorName = 'Setyo Mardani',
  directorTitle = 'Director / Direktur'
) {
  const primaryColor: [number, number, number] = [15, 23, 42];
  const textColor: [number, number, number] = [51, 65, 85];

  let y = startY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  doc.text('Hormat Kami / Issued By,', sigX, y, { align: 'center' });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(companyName, sigX, y, { align: 'center' });

  // 1. Stamp image (behind, sized down & kept higher so it never touches Setyo Mardani)
  try {
    doc.addImage(CAP_CORETERRA_BASE64, 'PNG', sigX - 18, y - 1, 16.5, 18.8);
  } catch (e) {
    console.warn('Could not add stamp image:', e);
  }

  // 2. Signature image (on top of stamp)
  try {
    doc.addImage(TTD_SETYO_BASE64, 'PNG', sigX - 16, y + 2, 33, 12);
  } catch (e) {
    console.warn('Could not add signature image:', e);
  }

  y += 24;

  // Name & Title (guaranteed clean space below stamp)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text(directorName, sigX, y, { align: 'center' });

  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textColor);
  doc.text(directorTitle, sigX, y, { align: 'center' });
}

/**
 * Generate Purchase Order PDF matching the Billing Invoice theme
 */
export function generatePurchaseOrderPDF(po: POPDFData, customCompanySettings?: CompanySettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const company = customCompanySettings || getCompanySettings();
  const companyName = company.companyName || 'PT Coreterra Geo Engineering';
  const companyAddress = company.address || 'Gardenia Estate, Blok A5 No 12, Ciputat, Tangerang Selatan 15412';
  const companyPhone = company.phone || '+62 812-1494-1641';
  const companyEmail = company.email || 'admin.cge@coreterra-geo.com';
  const companyTaxId = company.taxId || '01.234.567.8-901.000';
  const companyLogo = company.logoBase64 || LOGO_CORETERRA_BASE64;

  const pageWidth = doc.internal.pageSize.width; // 210mm
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const headerAmber: [number, number, number] = [217, 119, 6]; // Amber 600 (Corporate kop header line)
  const poAccent: [number, number, number] = [30, 58, 95]; // Deep Executive Navy #1E3A5F (Professional Engineering/Procurement)
  const poTableHead: [number, number, number] = [24, 43, 73]; // Midnight Navy #182B49 (Executive, Clean, Non-neon)
  const textColor: [number, number, number] = [51, 65, 85]; // Slate 700
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const cardBg: [number, number, number] = [250, 251, 253]; // Natural Paper White/Off-white
  const subtleBorder: [number, number, number] = [226, 232, 240]; // Slate 200
  const cardBorder: [number, number, number] = [218, 224, 233]; // Slate 300 / Border

  let y = 10;

  // 1. Top Amber Accent Line (Preserved from approved header design)
  doc.setFillColor(...headerAmber);
  doc.rect(14, y, pageWidth - 28, 1.5, 'F');
  y += 5;

  // 2. Company Logo (Top Left)
  try {
    doc.addImage(companyLogo, 'PNG', 14, y, 38, 12.58);
  } catch (e) {
    console.warn('Failed to render company logo:', e);
  }

  // 3. Company Header Information Text
  const compX = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text(companyName.toUpperCase(), compX, y + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(...headerAmber);
  doc.text('GEOTECHNICAL • DRILLING • CIVIL ENGINEERING • MINING CONSULTANT', compX, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...textColor);
  const splitCompanyAddr = doc.splitTextToSize(companyAddress, 78);
  doc.text(splitCompanyAddr, compX, y + 9.5);
  const addrHeight = splitCompanyAddr.length * 3.2;
  doc.text(`Email: ${companyEmail} | Telp: ${companyPhone}`, compX, y + 9.5 + addrHeight);

  // 4. Purchase Order Header Box (Top Right)
  const boxWidth = 65;
  const boxX = pageWidth - 14 - boxWidth;
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.4);
  doc.setFillColor(...cardBg);
  doc.roundedRect(boxX, y, boxWidth, 19, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...poAccent);
  doc.text('PURCHASE ORDER (PO)', boxX + boxWidth - 4, y + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text(po.po_number, boxX + boxWidth - 4, y + 10.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  doc.text(`Tanggal: ${po.date || new Date().toISOString().split('T')[0]}`, boxX + boxWidth - 4, y + 15.5, { align: 'right' });

  // Status Badge Pill below the box
  const statusStr = (po.status || 'DRAFT').toUpperCase();
  const isCompleted = statusStr === 'COMPLETED';
  const isApproved = statusStr === 'APPROVED';
  const badgeBg: [number, number, number] = isCompleted ? [220, 252, 231] : isApproved ? [224, 231, 255] : [241, 245, 249];
  const badgeTextCol: [number, number, number] = isCompleted ? [22, 101, 52] : isApproved ? [30, 58, 138] : [71, 85, 105];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const badgeW = doc.getTextWidth(statusStr) + 8;
  const badgeX = pageWidth - 14 - badgeW;
  doc.setFillColor(...badgeBg);
  doc.roundedRect(badgeX, y + 21, badgeW, 5, 2.5, 2.5, 'F');
  doc.setTextColor(...badgeTextCol);
  doc.text(statusStr, badgeX + (badgeW / 2), y + 24.5, { align: 'center' });

  y += 28;

  // Separator Line
  doc.setDrawColor(...subtleBorder);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);
  y += 4;

  // 5. 2-Column Cards: Issued By (Company) & Issued To (Vendor)
  const colWidth = (pageWidth - 34) / 2;

  // Card Left: ISSUED BY / PEMESAN
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(14, y, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...poAccent);
  doc.text('ISSUED BY / PEMESAN:', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(...primaryColor);
  doc.text(companyName, 18, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  const leftAddr = doc.splitTextToSize(companyAddress, colWidth - 8);
  doc.text(leftAddr, 18, y + 14.5);
  doc.text(`Telp/WA: ${companyPhone}`, 18, y + 23);
  doc.text(`Email: ${companyEmail}`, 18, y + 27);
  doc.text(`NPWP: ${companyTaxId}`, 18, y + 31);

  // Card Right: ISSUED TO / VENDOR
  const vendorX = 14 + colWidth + 6;
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(vendorX, y, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...poAccent);
  doc.text('ISSUED TO / VENDOR:', vendorX + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(...primaryColor);
  doc.text(po.vendor_name || 'Vendor', vendorX + 4, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  const vAddr = po.vendor_address || '-';
  const splitVAddr = doc.splitTextToSize(vAddr, colWidth - 8);
  doc.text(splitVAddr.slice(0, 2), vendorX + 4, y + 14.5);

  const phoneText = po.vendor_phone || po.vendor_contact || '-';
  doc.text(`Kontak / Telp: ${phoneText}`, vendorX + 4, y + 23);
  doc.text(`NPWP: ${po.vendor_npwp || '-'}`, vendorX + 4, y + 27);

  y += 38;

  // 6. Project Reference & Total Card (Natural executive card)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'FD');

  // Col 1: Referensi Proyek
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('REFERENSI PROYEK', 18, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...primaryColor);
  const projDisplay = po.project_name || 'General / Operasional Kantor';
  const splitProj = doc.splitTextToSize(projDisplay, 130);
  doc.text(splitProj[0], 18, y + 9.8);

  // Col 2: Total Nilai PO
  const totalDisplay = formatIDRCurrency(po.total_amount);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL NILAI PO', pageWidth - 18, y + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text(totalDisplay, pageWidth - 18, y + 10, { align: 'right' });

  y += 18;


  // 7. Items Table with Midnight Navy Header (Subtle, clean, executive)
  const tableRows = (po.items || []).map((item, idx) => [
    (idx + 1).toString(),
    item.item_code || '-',
    item.description || '-',
    item.quantity.toLocaleString('id-ID'),
    item.unit || '-',
    formatIDRCurrency(item.unit_price),
    formatIDRCurrency(item.total_price),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Kode Barang', 'Deskripsi Pekerjaan / Barang', 'Qty', 'Satuan', 'Harga Satuan (Rp)', 'Total (Rp)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: poTableHead,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.8,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 7.5,
      valign: 'middle',
      cellPadding: 2.8,
      lineWidth: 0.2,
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [250, 252, 254],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 32, halign: 'right' },
      6: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 5;

  // Check if nearing page footer
  if (y > 210) {
    doc.addPage();
    y = 20;
  }

  // 8. Breakdown Summary Box (Right) with Tax / PPN
  const sumWidth = 74;
  const sumX = pageWidth - 14 - sumWidth;
  const numRightX = sumX + sumWidth - 4;

  const subtotalVal = po.subtotal ?? (po.total_amount - (po.tax_amount ?? 0));
  const taxRateVal = po.tax_rate ?? 0;
  const taxAmountVal = po.tax_amount ?? (subtotalVal * (taxRateVal / 100));
  const grandTotalVal = po.total_amount || (subtotalVal + taxAmountVal);

  doc.setDrawColor(...subtleBorder);
  doc.setLineWidth(0.3);
  doc.setFillColor(...lightBg);
  doc.roundedRect(sumX, y, sumWidth, 24, 2, 2, 'FD');

  let sy = y + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textColor);
  doc.text('Subtotal (DPP):', sumX + 4, sy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(formatIDRCurrency(subtotalVal), numRightX, sy, { align: 'right' });

  sy += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(`PPN (${taxRateVal}%):`, sumX + 4, sy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(formatIDRCurrency(taxAmountVal), numRightX, sy, { align: 'right' });

  sy += 5;
  doc.setDrawColor(...subtleBorder);
  doc.line(sumX + 4, sy, sumX + sumWidth - 4, sy);

  sy += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Grand Total:', sumX + 4, sy);
  doc.text(formatIDRCurrency(grandTotalVal), numRightX, sy, { align: 'right' });

  // 9. Left Side: Terbilang Box & Notes Box
  const leftWidth = pageWidth - 28 - sumWidth - 5; // 182 - 74 - 5 = 103mm

  // 9a. Terbilang Box
  const wordsText = terbilangRupiah(grandTotalVal);
  const splitWords = doc.splitTextToSize(`"# ${wordsText} #"`, leftWidth - 10);
  const terbilangBoxHeight = 8 + (splitWords.length * 3.6);

  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.3);
  doc.setFillColor(...cardBg);
  doc.roundedRect(14, y, leftWidth, terbilangBoxHeight, 1.5, 1.5, 'FD');

  // Subtle Slate stripe on left of Note Box
  doc.setFillColor(...poAccent);
  doc.rect(14, y, 2.5, terbilangBoxHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...poAccent);
  doc.text('TERBILANG / IN WORDS:', 19, y + 4.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(...primaryColor);
  doc.text(splitWords, 19, y + 8.5);

  // 9b. Catatan & Ketentuan (Terms) Box with Microsoft Word style hanging indent & paragraph gaps
  const noteStartY = y + terbilangBoxHeight + 3;
  const rawNotes = po.notes?.trim() || '';

  if (rawNotes) {
    const rawLines = rawNotes.split('\n');
    let startIndex = 0;
    if (rawLines[0] && rawLines[0].trim().toUpperCase().includes('SYARAT & KETENTUAN')) {
      startIndex = 1;
    }
    const lines = rawLines.slice(startIndex);

    interface TermItem {
      type: 'numbered' | 'sub' | 'normal';
      bullet?: string;
      lines: string[];
    }

    const termItems: TermItem[] = [];
    for (const l of lines) {
      const trimmed = l.trim();
      if (!trimmed) continue;

      const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)$/);
      if (numMatch) {
        const num = `${numMatch[1]}.`;
        const content = numMatch[2];
        const wrapped = doc.splitTextToSize(content, leftWidth - 14);
        termItems.push({ type: 'numbered', bullet: num, lines: wrapped });
        continue;
      }

      const subMatch = trimmed.match(/^([•\-\*])\s*(.*)$/);
      if (subMatch) {
        const content = subMatch[2];
        const wrapped = doc.splitTextToSize(content, leftWidth - 17);
        termItems.push({ type: 'sub', bullet: '–', lines: wrapped });
        continue;
      }

      const wrapped = doc.splitTextToSize(trimmed, leftWidth - 14);
      termItems.push({ type: 'normal', lines: wrapped });
    }

    let totalTextHeight = 0;
    termItems.forEach((it, idx) => {
      totalTextHeight += it.lines.length * 3.3;
      if (it.type === 'numbered' && idx > 0) {
        totalTextHeight += 1.8; // Gap between points
      }
    });

    const notesBoxHeight = Math.max(22, 7 + totalTextHeight + 4);

    doc.setDrawColor(...subtleBorder);
    doc.setLineWidth(0.3);
    doc.setFillColor(...lightBg);
    doc.roundedRect(14, noteStartY, leftWidth, notesBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...primaryColor);
    doc.text('Catatan & Ketentuan (Terms):', 18, noteStartY + 4.5);

    let curY = noteStartY + 8.5;
    termItems.forEach((it, idx) => {
      if (it.type === 'numbered') {
        if (idx > 0) curY += 1.8;

        // Number at x=18 in poAccent
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(...poAccent);
        doc.text(it.bullet || '', 18, curY);

        // Text wrapped with hanging indent starting at x=23.5
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...textColor);
        doc.text(it.lines, 23.5, curY);
        curY += it.lines.length * 3.3;
      } else if (it.type === 'sub') {
        // Bullet at x=23.5
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(it.bullet || '–', 23.5, curY);

        // Sub-text wrapped with hanging indent starting at x=26.5
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...textColor);
        doc.text(it.lines, 26.5, curY);
        curY += it.lines.length * 3.3;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...textColor);
        doc.text(it.lines, 18, curY);
        curY += it.lines.length * 3.3;
      }
    });
  }

  // 10. Single Signature Block (PT Coreterra Geo Engineering)
  // Positioned cleanly on the right under the Summary Breakdown box
  const sigX = sumX + (sumWidth / 2);
  const sigStartY = y + 28;
  renderCompanySignatureBlock(doc, sigX, sigStartY, companyName, 'Setyo Mardani', 'Director / Direktur');

  // 11. Corporate Footer
  drawCorporateFooter(doc, companyName, companyPhone, companyAddress);

  // 12. View / Download
  const filename = `${po.po_number}.pdf`;
  openPdfPreviewOrDownload(doc, filename);
}
