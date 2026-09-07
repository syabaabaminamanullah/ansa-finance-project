import { jsPDF } from 'jspdf';
import { LOGO_CORETERRA_BASE64 } from './billingInvoicePDF';
import { METERAI_10000_BASE64, QR_VALIDATION_BASE64 } from './invoiceFormat2PDF';

export interface PaymentReceiptParams {
  receiptNumber?: string;
  invoiceNumber: string;
  paymentDate?: string;
  receiptDate?: string;
  customerName: string;
  projectName?: string;
  poNumber?: string;
  contractNumber?: string;
  milestone?: string;
  description?: string;
  amount: number;
  dppAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  paymentMethod?: string;
  signatoryName?: string;
  signatoryRole?: string;
  companyName?: string;
  companyAddress?: string;
  companyNpwp?: string;
  companyEmail?: string;
  companyPhone?: string;
}

function formatNum(val: number | undefined | null): string {
  if (val === undefined || val === null) return '0';
  return new Intl.NumberFormat('id-ID').format(val);
}

function angkaKeKata(n: number): string {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
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

function numberToEnglishWords(n: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (n === 0) return 'zero';

  function convertChunk(num: number): string {
    let str = '';
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + ones[num % 10] : '') + ' ';
    } else if (num > 0) {
      str += ones[num] + ' ';
    }
    return str.trim();
  }

  let result = '';
  if (n >= 1000000000000) {
    result += convertChunk(Math.floor(n / 1000000000000)) + ' trillion ';
    n %= 1000000000000;
  }
  if (n >= 1000000000) {
    result += convertChunk(Math.floor(n / 1000000000)) + ' billion ';
    n %= 1000000000;
  }
  if (n >= 1000000) {
    result += convertChunk(Math.floor(n / 1000000)) + ' million ';
    n %= 1000000;
  }
  if (n >= 1000) {
    result += convertChunk(Math.floor(n / 1000)) + ' thousand ';
    n %= 1000;
  }
  if (n > 0) {
    result += convertChunk(n);
  }
  return result.trim();
}

/**
 * Open Kwitansi PDF in a new browser tab with luxury toolbar and guaranteed popup-blocker fallback
 */
function openReceiptInNewTab(doc: jsPDF, receiptNo: string, invNumber: string) {
  const filename = `Kwitansi_${receiptNo.replace(/[^a-zA-Z0-9-_]/g, '_')}_${invNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfFile);

  try {
    const newWin = window.open('', '_blank');
    if (newWin && newWin.document) {
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
              .doc-title { font-size: 14px; font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
              .doc-title span { background: #294825; padding: 3px 8px; border-radius: 4px; border: 1px solid #d4af37; font-size: 12px; color: #fbbf24; font-weight: bold; }
              .btn-group { display: flex; align-items: center; gap: 10px; }
              .btn { text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; }
              .btn-primary { background: #294825; color: #ffffff; border: 1px solid #d4af37; }
              .btn-primary:hover { background: #1f371c; }
              .btn-secondary { background: #334155; color: #f1f5f9; }
              .btn-secondary:hover { background: #475569; }
              iframe { width: 100%; flex: 1; border: none; background: #525659; }
            </style>
          </head>
          <body>
            <div class="header-bar">
              <div class="doc-title">
                <span>KWITANSI LUNAS</span> ${filename}
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
  } catch {
    doc.save(filename);
  }
}

export function generatePaymentReceiptPDF(params: PaymentReceiptParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // Executive Corporate A4 Portrait
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const invNumber = params.invoiceNumber;
  const invSeqMatch = invNumber.match(/INV\/([0-9]+)/i) || invNumber.match(/([0-9]{3,4})/);
  const seq = invSeqMatch ? String(invSeqMatch[1]).padStart(3, '0') : '001';
  const receiptNo = params.receiptNumber || `KWT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${seq}`;

  const paymentDate = params.paymentDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const receiptDate = params.receiptDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const clientName = params.customerName || 'PT SOLUSI MONITORING INDONESIA';
  const projectName = params.projectName || 'Washbore Borpile & Foundation Project, Muara Laboh';
  const poNumber = params.poNumber || `PO-${params.invoiceNumber.replace(/[^0-9]/g, '').slice(-6) || 'IKPT-001'}`;
  
  const rawMilestone = (params.milestone || params.description || 'Pembayaran Termin').trim();
  let cleanMilestone = rawMilestone.split('|')[0].trim();
  if (cleanMilestone.includes(' - ') && projectName) {
    const parts = cleanMilestone.split(' - ');
    if (parts.length > 2) {
      cleanMilestone = `${parts[0]} - ${parts[1]}`;
    }
  }
  const milestone = cleanMilestone;

  const amount = params.amount || 0;
  const paymentMethod = params.paymentMethod || 'Bank Transfer - Bank Mandiri (103-00-1332575-4)';
  const signatory = params.signatoryName || 'Setyo Mardani';
  const signatoryRole = params.signatoryRole || 'Director / Direktur';

  const compName = params.companyName || 'PT CORETERRA GEO ENGINEERING';
  const compAddr = params.companyAddress || 'Gardenia Estate, Blok A5 No 12 RT 007 RW 014, Ciputat, Kota Tangerang Selatan, Banten 15411';
  const compNpwp = params.companyNpwp || '1000 0000 1002 1192';
  const compEmail = params.companyEmail || 'admin.cge@coreterra-geo.com';
  const compPhone = params.companyPhone || '+62 812-1494-1641';

  // ==========================================
  // 1. LUXURY FRAMING & SECURITY WATERMARK
  // ==========================================
  // Outer Gold Accent Line
  doc.setDrawColor(212, 175, 55); // Gold #D4AF37
  doc.setLineWidth(0.4);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 3, 3, 'S');

  // Inner Forest Green Luxury Border
  doc.setDrawColor(41, 72, 37); // Deep Forest Green #294825
  doc.setLineWidth(0.8);
  doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 2, 2, 'S');

  // Corner decorative accents
  const drawCornerAccent = (x: number, y: number, w: number, h: number) => {
    doc.setFillColor(41, 72, 37);
    doc.rect(x, y, w, 1, 'F');
    doc.rect(x, y, 1, h, 'F');
  };
  drawCornerAccent(12, 12, 8, 8);
  drawCornerAccent(pageWidth - 20, 12, 8, 8);
  drawCornerAccent(12, pageHeight - 20, 8, 8);
  drawCornerAccent(pageWidth - 20, pageHeight - 20, 8, 8);

  // ==========================================
  // 2. HEADER: CORPORATE MASTHEAD & BADGE
  // ==========================================
  let y = 16;

  // Left: Coreterra Logo
  if (LOGO_CORETERRA_BASE64) {
    try {
      doc.addImage(LOGO_CORETERRA_BASE64, 'PNG', 15, y, 36, 13);
    } catch (e) {}
  }

  // Center-Left: Company Details
  const compX = 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(compName, compX, y + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Gardenia Estate, Blok A5 No 12 RT 007 RW 014, Ciputat', compX, y + 6.5);
  doc.text('Kota Tangerang Selatan, Banten 15411', compX, y + 10.2);
  doc.text(`NPWP: ${compNpwp}`, compX, y + 14);
  doc.text(`Email: ${compEmail}  |  Telp: ${compPhone}`, compX, y + 17.5);

  // Right: Document Title & Number Badge
  const badgeW = 56;
  const badgeX = pageWidth - 15 - badgeW; // 139mm
  const badgeH = 18;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(badgeX, y, badgeW, badgeH, 2, 2, 'F');
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.roundedRect(badgeX, y, badgeW, badgeH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(41, 72, 37);
  doc.text('KWITANSI', badgeX + (badgeW / 2), y + 4.5, { align: 'center' });

  doc.setFontSize(6.8);
  doc.setTextColor(180, 83, 9);
  doc.text('OFFICIAL PAYMENT RECEIPT', badgeX + (badgeW / 2), y + 8.8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(`No: ${receiptNo}`, badgeX + (badgeW / 2), y + 14.2, { align: 'center' });

  // Header Separator Line
  y = 38;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);

  // ==========================================
  // 3. SECTION A: AUDIT TRAIL & REFERENCE GRID
  // ==========================================
  y += 5;
  const gridWidth = pageWidth - 30; // 180mm
  const gridHeight = 36;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, gridWidth, gridHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, gridWidth, gridHeight, 2, 2, 'S');

  // Header Bar inside Audit Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, gridWidth, 6, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y + 6, pageWidth - 15, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('INFORMASI AUDIT TRAIL & REFERENSI TRANSAKSI', 20, y + 4.2);

  // 2 Balanced Columns with Explicit Boundary
  const leftColX = 20;
  const leftValX = 50;
  const leftColMaxW = 46;

  const rightColX = 108;
  const rightValX = 142;
  const rightColMaxW = 48;

  let rowY = y + 11.5;

  // Row 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer / Klien', leftColX, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const splitCust = doc.splitTextToSize(clientName, leftColMaxW);
  doc.text(`:  ${splitCust[0]}`, leftValX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('No. Invoice (Reff)', rightColX, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216); // Royal Blue
  const splitInv = doc.splitTextToSize(invNumber, rightColMaxW);
  doc.text(`:  ${splitInv[0]}`, rightValX, rowY);

  // Row 2
  rowY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Proyek / Project', leftColX, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const splitProj = doc.splitTextToSize(projectName, leftColMaxW);
  doc.text(`:  ${splitProj[0]}`, leftValX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tahap / Milestone', rightColX, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const splitMile = doc.splitTextToSize(milestone, rightColMaxW);
  doc.text(`:  ${splitMile[0]}`, rightValX, rowY);

  // Row 3
  rowY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('No. PO / Kontrak', leftColX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${poNumber}`, leftValX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tgl. Pembayaran Dana', rightColX, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${paymentDate}`, rightValX, rowY);

  // Row 4
  rowY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Metode Pembayaran', leftColX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${paymentMethod}`, leftValX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tgl. Cetak Dokumen', rightColX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`:  ${receiptDate}`, rightValX, rowY);

  // ==========================================
  // 4. SECTION B: FORMAL RECEIPT STATEMENT
  // ==========================================
  y = rowY + 12;

  // Field 1: Telah Diterima Dari
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Telah Diterima Dari', 15, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Received From', 15, y + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`:   ${clientName.toUpperCase()}`, 58, y + 2);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(62, y + 5, pageWidth - 15, y + 5);

  // Field 2: Uang Sejumlah (The Sum of)
  y += 12;
  const wordsId = `${angkaKeKata(amount)} rupiah`.trim();
  const wordsEn = `${numberToEnglishWords(amount)} rupiah`.trim();
  const fullTerbilang = `${wordsId.charAt(0).toUpperCase() + wordsId.slice(1)} / ${wordsEn}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Uang Sejumlah', 15, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('The Sum of', 15, y + 3.5);

  // Luxury Shaded Terbilang Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(60, y - 3.5, pageWidth - 75, 14, 1.5, 1.5, 'FD');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(60, y - 3.5, pageWidth - 75, 14, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const splitTerbilang = doc.splitTextToSize(fullTerbilang, pageWidth - 83);
  doc.text(splitTerbilang, 64, y + 1.5);

  // Field 3: Untuk Pembayaran (In Payment Of)
  y += 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Untuk Pembayaran', 15, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('In Payment Of', 15, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const descFull = `:   Pembayaran ${milestone} sesuai Tagihan Resmi No. ${invNumber} untuk Proyek ${projectName}.`;
  const splitDesc = doc.splitTextToSize(descFull, pageWidth - 76);
  doc.text(splitDesc, 58, y + 2);

  const descHeight = splitDesc.length * 4.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(62, y + descHeight + 0.5, pageWidth - 15, y + descHeight + 0.5);

  // ==========================================
  // 5. SECTION C: FULL-WIDTH LUXURY AMOUNT BANNER (NON-PKP CLEAN)
  // ==========================================
  y += Math.max(16, descHeight + 7);
  const bannerW = pageWidth - 30; // 180mm
  const bannerH = 24;

  // Deep Emerald Forest Green Card
  doc.setFillColor(41, 72, 37); // Forest Green #294825
  doc.roundedRect(15, y, bannerW, bannerH, 2.5, 2.5, 'F');

  doc.setDrawColor(212, 175, 55); // Gold Accent Border
  doc.setLineWidth(0.4);
  doc.roundedRect(15, y, bannerW, bannerH, 2.5, 2.5, 'S');

  // Left label inside banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 175, 55); // Luxury Gold
  doc.text('JUMLAH PEMBAYARAN DITERIMA / TOTAL RECEIVED AMOUNT', 22, y + 7.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('• Pembayaran Sah & Lunas Tanpa Potongan (Non-PKP)', 22, y + 13.5);
  doc.text('• Sesuai nominal yang tertera pada Invoice Tagihan Terlampir', 22, y + 18.5);

  // Right Big Amount Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(`Rp ${formatNum(amount)},-`, pageWidth - 22, y + 15, { align: 'right' });

  // ==========================================
  // 6. SECTION D: TERMS, NOTES & BANK DETAILS
  // ==========================================
  y += 30;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, y, pageWidth - 30, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, pageWidth - 30, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('KETENTUAN & REKENING PENERIMA (RECEIVING ACCOUNT):', 19, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);

  const notesArr = [
    `1. Pembayaran ini telah diverifikasi dan masuk secara efektif ke rekening ${paymentMethod} a.n. ${compName}.`,
    '2. Kwitansi ini diterbitkan sebagai bukti pelunasan sah (Official Payment Receipt) dan mengikat kedua belah pihak.',
    '3. Dokumen ini dilengkapi meterai elektronik resmi serta QR Code terenkripsi untuk validasi audit keaslian dokumen secara digital.'
  ];

  let ny = y + 9;
  notesArr.forEach(note => {
    doc.text(note, 19, ny);
    ny += 4.5;
  });

  // ==========================================
  // 7. SECTION E: STATUS STAMP & AUTHORIZATION
  // ==========================================
  y += 32;

  // Status LUNAS / PAID Stamp Badge
  doc.setDrawColor(34, 197, 94);
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(15, y + 4, 86, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('STATUS: LUNAS / FULLY PAID', 58, y + 9.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('OFFICIAL VERIFIED RECEIPT', 58, y + 13.5, { align: 'center' });

  // Right Section: Legal Authorization
  const authX = pageWidth - 50;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tangerang Selatan, ${receiptDate}`, authX, y, { align: 'center' });
  doc.text('Penerima / Authorized By:', authX, y + 4, { align: 'center' });

  // e-Meterai & QR Code
  if (METERAI_10000_BASE64) {
    try {
      doc.addImage(METERAI_10000_BASE64, 'PNG', authX - 36, y + 8, 20, 20);
    } catch (e) {}
  }

  if (QR_VALIDATION_BASE64) {
    try {
      doc.addImage(QR_VALIDATION_BASE64, 'PNG', authX + 12, y + 7, 22, 22);
    } catch (e) {}
  }

  // Signatory Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(signatory.toUpperCase(), authX, y + 34, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(signatoryRole, authX, y + 38, { align: 'center' });
  doc.text(compName, authX, y + 41.5, { align: 'center' });

  // ==========================================
  // 8. SECTION F: MICROPRINT SECURITY FOOTER
  // ==========================================
  const footY = pageHeight - 14;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(15, footY - 2, pageWidth - 15, footY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL & OFFICIAL RECEIPT  •  PT CORETERRA GEO ENGINEERING  •  VERIFIED DOCUMENT AUDIT TRAIL', pageWidth / 2, footY + 1.5, { align: 'center' });

  // Open PDF in new tab with custom viewer & guaranteed fallback
  openReceiptInNewTab(doc, receiptNo, invNumber);
}
