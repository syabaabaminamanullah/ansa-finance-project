import React, { useMemo } from 'react';
import { Lightbulb, BookOpen, FileText, Info } from 'lucide-react';

interface TaxRule {
  keywords: string[];
  title: string;
  description: string;
  journal: string;
  law: string;
}

const TAX_RULES: TaxRule[] = [
  {
    keywords: ['sewa', 'rental', 'rent', 'alat berat', 'kendaraan', 'mesin'],
    title: 'Pengingat: PPh Pasal 23 (Sewa Alat/Mesin)',
    description: 'Penyewaan harta (selain tanah/bangunan) seperti alat berat drilling dikenakan pemotongan PPh Pasal 23 sebesar 2% (jika rekanan ber-NPWP) atau 4% (jika tidak ber-NPWP).',
    journal: 'Kredit akun "21203 - Hutang PPh Pasal 23" sebesar potongan pajak. Nanti disetorkan ke kas negara.',
    law: 'UU HPP No. 7 Tahun 2021 & PMK-141/PMK.03/2015'
  },
  {
    keywords: ['jasa', 'profesional', 'konsultan', 'notaris', 'audit', 'legal', 'hukum', 'akuntan'],
    title: 'Pengingat: PPh 23 atau PPh 21 (Jasa)',
    description: 'Pembayaran jasa profesional ke Badan Usaha (PT/CV) dipotong PPh 23 (2%). Jika dibayarkan ke Orang Pribadi (Freelance/Konsultan Pribadi) dipotong PPh 21 sesuai tarif progresif Pasal 17 atau tarif efektif.',
    journal: 'Kredit akun "21203 - Hutang PPh Pasal 23" atau "21202 - Hutang PPh Pasal 21".',
    law: 'UU HPP No. 7 Tahun 2021 & PMK-141/PMK.03/2015'
  },
  {
    keywords: ['pendapatan', 'revenue', 'penjualan', 'drilling', 'konstruksi', 'proyek', 'termin'],
    title: 'Pengingat: PPh Final Pasal 4 ayat (2) (Jasa Konstruksi)',
    description: 'Pendapatan atas jasa konstruksi/drilling biasanya dipotong pajak final oleh klien saat pembayaran. Tarif: 1.75% (Kualifikasi Usaha Kecil) atau 2.65% (Tanpa Kualifikasi).',
    journal: 'Debit akun "11601 - PPN Masukan" (jika ada) dan "81100 - Beban Pajak Penghasilan Badan" sebesar nilai yang dipotong klien.',
    law: 'PP No. 9 Tahun 2022 tentang PPh Jasa Konstruksi'
  },
  {
    keywords: ['gaji', 'upah', 'thr', 'bonus', 'salary', 'payroll', 'honor'],
    title: 'Pengingat: PPh Pasal 21 (Karyawan)',
    description: 'Pembayaran penghasilan kepada karyawan harus dipotong PPh Pasal 21 menggunakan Tarif Efektif Rata-Rata (TER) terbaru.',
    journal: 'Kredit akun "21202 - Hutang PPh Pasal 21" saat penggajian.',
    law: 'PP No. 58 Tahun 2023 tentang Tarif Efektif PPh 21'
  },
  {
    keywords: ['gedung', 'bangunan', 'tanah', 'ruko', 'office'],
    title: 'Pengingat: PPh Final Pasal 4 ayat (2) (Sewa Tanah/Bangunan)',
    description: 'Pembayaran biaya sewa kantor atau bangunan dikenakan PPh Final Pasal 4 ayat (2) sebesar 10% dari jumlah bruto nilai sewa.',
    journal: 'Kredit akun "21204 - Hutang PPh Pasal 4 ayat (2) Final" sebesar 10%.',
    law: 'PP No. 34 Tahun 2017'
  }
];

interface Props {
  accountName?: string;
  description?: string;
  className?: string;
}

export function TaxHintHelper({ accountName = '', description = '', className = '' }: Props) {
  const matchingRule = useMemo(() => {
    const textToSearch = `${accountName.toLowerCase()} ${description.toLowerCase()}`;
    if (!textToSearch.trim()) return null;

    // Find the first rule that has a matching keyword
    for (const rule of TAX_RULES) {
      if (rule.keywords.some(kw => textToSearch.includes(kw))) {
        return rule;
      }
    }
    return null;
  }, [accountName, description]);

  if (!matchingRule) return null;

  return (
    <div className={`bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-top-2 ${className}`}>
      <div className="flex gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded-lg h-fit">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-primary">{matchingRule.title}</h5>
          <p className="text-sm text-textSecondary leading-relaxed">
            {matchingRule.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="bg-background rounded border border-border p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-textPrimary mb-1">
                <FileText className="w-3.5 h-3.5 text-success" /> Rekomendasi Jurnal:
              </div>
              <p className="text-xs text-textSecondary font-mono">{matchingRule.journal}</p>
            </div>
            <div className="bg-background rounded border border-border p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-textPrimary mb-1">
                <BookOpen className="w-3.5 h-3.5 text-danger" /> Dasar Hukum:
              </div>
              <p className="text-xs text-textSecondary font-mono">{matchingRule.law}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
