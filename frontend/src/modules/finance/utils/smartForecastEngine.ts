/**
 * SMART FINANCIAL MODEL & CASH RUNWAY ENGINE
 * -------------------------------------------------------------
 * Purely analytical, read-only engine that inspects transactions
 * and structures them according to the 3 operational rhythms of COA:
 * 1. Rutin Harian / Mingguan (Kasbon Site 10-Harian: BBM, Makan, Living Cost)
 * 2. Rutin Bulanan (Fixed Outflow: Payroll, Sewa, Utilitas, Bank)
 * 3. Berkala Siklus Proyek (Sparepart, Kimia Bor, Rotasi Crew)
 * 4. Biaya Sekali Saja (One-Off / Modal Awal Proyek - Diisolasi)
 */

export interface TransactionRecord {
  id: string;
  date: string;
  number: string;
  description: string;
  amount: number;
  project_id?: string;
  project_name?: string;
  account_code?: string;
  account_name?: string;
  type: 'Expense' | 'AP' | 'AR' | 'Journal';
}

export type HorizonType = '1_week' | '2_weeks' | '1_month' | '3_months';

export type CadenceType = 'WEEKLY_SITE' | 'MONTHLY_FIXED' | 'CYCLIC_PROJECT' | 'ONE_OFF';

export interface CadenceItem {
  id: string;
  title: string;
  subDesc: string;
  coaCode?: string;
  coaName?: string;
  monthlyAmount: number;
  projectedAmount: number;
  samples: string[];
  cadence: CadenceType;
}

export interface CadenceGroup {
  id: CadenceType;
  title: string;
  cadenceLabel: string;
  badge: string;
  color: string;
  description: string;
  monthlyTotal: number;
  projectedTotal: number;
  items: CadenceItem[];
}

export interface CategoryBreakdown {
  category: string;
  recurringAmount: number;
  projectedAmount: number;
  description: string;
  sampleItems: string[];
  cadence?: CadenceType;
}

export interface SmartForecastResult {
  scopeName: string;
  currentCashBalance: number;
  horizonDays: number;
  horizonLabel: string;
  
  // Historical Analysis (Base Monthly)
  historicalTotalExpense: number;
  historicalOneOffExpense: number;
  historicalRecurringOpex: number;
  
  // Forecast Requirements by Rhythm
  projectedWeeklyKasbon: number;
  projectedMonthlyFixed: number;
  projectedCyclic: number;
  projectedPayroll: number; // Sub-component of monthly fixed
  projectedOpex: number;
  projectedTotalRequired: number;
  
  // Runway & Viability
  cashStatus: 'SAFE' | 'WARNING' | 'CRITICAL';
  surplusDeficit: number; // Cash - ProjectedRequired
  runwayDays: number;
  burnRatePerDay: number;
  
  // Inflow Opportunities (Pending AR / Invoices)
  potentialInflow: number;
  netCashAfterInflow: number;
  
  // COA Cadence Groups
  cadenceGroups: CadenceGroup[];
  
  // Flat List of items for backward compatibility / table display
  categories: CategoryBreakdown[];
  oneOffItems: { date: string; desc: string; amount: number }[];
}

// 1. One-Off Keywords (Capital, Initial Preparation, Mobilization, Historical subcontracts)
const ONE_OFF_KEYWORDS = [
  'dp rig', 'drilling rig', 'pelunasan dp', 'dp ke-dua', 'dp drilling',
  'toko besi', 'po-1', 'material po', 'inspeksi alat', 'sucofindo',
  'persiapan rig', 'persiapan drilling', 'prepare rig', 'ops prepare rig', 'cost persiapan',
  'mobilisasi rig', 'mobilisasi tim', 'pengujian baja', 'labor unp', 'pengiriman material', 'pembelian hp',
  'alat geolistrik', 'pelunasan magnetometer', 'termin 2 dan termin 3', 'pelunasan sisa termin',
  'preparation and operasional citata', 'chip in citatah', 'setoran dana operasional citatah'
];

/**
 * Classifies an expense line based on COA code and description into the 3 operational rhythms
 */
function classifyExpense(
  rawDesc: string, 
  coaName: string, 
  coaCode: string
): { cadence: CadenceType; title: string; subDesc: string } {
  const desc = rawDesc.replace(/^Auto-journal for Expense EXP-\d+:\s*/i, '').trim();
  const clean = desc.replace(/^(IKPT|IKTP|HO)\s*-\s*(Washbore Project|Wasbore Project)?\s*:?\s*/i, '').trim().replace(/^\(/, '').replace(/\)$/, '');
  const dLower = clean.toLowerCase();
  const fullText = `${desc} ${coaName}`.toLowerCase();

  // A. Check One-Off / Capital Expense first
  if (['51210', '51220', '51600'].includes(coaCode) || ONE_OFF_KEYWORDS.some(k => fullText.includes(k))) {
    return {
      cadence: 'ONE_OFF',
      title: clean || coaName,
      subDesc: 'Belanja Modal / Mobilisasi Awal (Diisolasi dari Rutin)'
    };
  }

  // B. Check Biaya Administrasi Bank
  if (coaCode === '72100' || dLower.includes('bank admin fee') || dLower.includes('biaya administrasi bank')) {
    return {
      cadence: 'MONTHLY_FIXED',
      title: 'Biaya Administrasi Bank Transfer',
      subDesc: 'Biaya administrasi per transaksi perbankan (Rp 2.500 - Rp 6.500)'
    };
  }

  // C. Check Monthly Fixed Outflow (Payroll, Sewa, Utilitas Kantor)
  if (
    ['51500', '61100', '61110', '54110', '54700', '51300', '51741', '61200'].includes(coaCode) ||
    dLower.includes('gaji') || dLower.includes('salary') || dLower.includes('payroll')
  ) {
    if (dLower.includes('dugie')) {
      return {
        cadence: 'MONTHLY_FIXED',
        title: 'Gaji Personel - Dugie Gentri Nugroho (PJO Site)',
        subDesc: 'Gaji bulanan PJO penanggung jawab operasional site'
      };
    }
    if (dLower.includes('tim bor') || dLower.includes('agus')) {
      return {
        cadence: 'MONTHLY_FIXED',
        title: 'Gaji & Upah Personel - Agus Suwardi (Tim Bor)',
        subDesc: 'Gaji bulanan dan upah pemboran washbore crew'
      };
    }
    if (dLower.includes('hendra')) {
      return {
        cadence: 'MONTHLY_FIXED',
        title: 'Gaji Personel - Hendra Ramanda (Wellsite Logger)',
        subDesc: 'Gaji bulanan wellsite geologist & data logger'
      };
    }
    if (dLower.includes('riska')) {
      return {
        cadence: 'MONTHLY_FIXED',
        title: 'Gaji Personel - Riska Prawita (Admin Lapangan)',
        subDesc: 'Gaji bulanan administrasi & logistik site'
      };
    }
    if (dLower.includes('syabaab')) {
      return {
        cadence: 'MONTHLY_FIXED',
        title: 'Gaji Personel - Syabaab (Kantor Pusat HO)',
        subDesc: 'Gaji bulanan staf finance & accounting kantor pusat'
      };
    }
    if (coaCode === '54110' || dLower.includes('sewa kendaraan')) {
      return {
        cadence: 'MONTHLY_FIXED',
        title: 'Sewa Kendaraan Operasional Bulanan',
        subDesc: 'Rental armada pikap 4x4 operasional site'
      };
    }
    if (coaCode === '54700' || dLower.includes('sewa mess')) {
      return {
        cadence: 'MONTHLY_FIXED',
        title: 'Sewa Mess / Camp Karyawan Proyek',
        subDesc: 'Biaya sewa tempat tinggal kru bor di dekat lokasi proyek'
      };
    }
    return {
      cadence: 'MONTHLY_FIXED',
      title: clean || coaName,
      subDesc: coaName
    };
  }

  // D. Check Weekly / 10-Day Field Operations (Kasbon Site: BBM, Makan, Pelumas, Living Cost)
  if (
    coaCode.startsWith('513') || coaCode.startsWith('514') || coaCode.startsWith('546') || 
    coaCode.startsWith('532') || ['51510', '51743', '51748', '51900'].includes(coaCode) ||
    dLower.includes('operasional') || dLower.includes('ops cost') || dLower.includes('operational cost') ||
    dLower.includes('living') || dLower.includes('makan') || dLower.includes('konsumsi')
  ) {
    if (dLower.includes('riska')) {
      return {
        cadence: 'WEEKLY_SITE',
        title: 'Dana Kasbon Operasional Lapangan (tf to Riska Prawita)',
        subDesc: 'Siklus kasbon 10-harian belanja solar rig, oli sanchin, konsumsi crew, dan living cost'
      };
    }
    if (dLower.includes('dugie')) {
      return {
        cadence: 'WEEKLY_SITE',
        title: 'Dana Kasbon Operasional Lapangan (tf to Dugie Gentri Nugroho)',
        subDesc: 'Kasbon operasional PJO lapangan untuk kebutuhan operasional taktis site'
      };
    }
    if (coaCode === '51410' || dLower.includes('solar') || dLower.includes('diesel')) {
      return {
        cadence: 'WEEKLY_SITE',
        title: 'BBM Solar Industri Mesin Bor & Pompa Sanchin',
        subDesc: 'Bahan bakar operasional mesin rig pemboran dan genset'
      };
    }
    if (coaCode.startsWith('546') || dLower.includes('makan') || dLower.includes('catering')) {
      return {
        cadence: 'WEEKLY_SITE',
        title: 'Biaya Konsumsi, Makan & Dapur Crew Mess',
        subDesc: 'Uang makan harian dan bahan makanan kru lapangan'
      };
    }
    if (coaCode === '51510' || dLower.includes('oli') || dLower.includes('pelumas')) {
      return {
        cadence: 'WEEKLY_SITE',
        title: 'Oli & Pelumas Mesin Bor / Pompa Sanchin',
        subDesc: 'Pelumas mesin, gemuk drat stang bor, dan oli hidrolik'
      };
    }
    if (coaCode.startsWith('532') || dLower.includes('thl')) {
      return {
        cadence: 'WEEKLY_SITE',
        title: 'Upah Tenaga Harian Lepas (THL / Helper Site)',
        subDesc: 'Upah juru masak mess, jaga malam, dan helper lokal'
      };
    }
    return {
      cadence: 'WEEKLY_SITE',
      title: clean || coaName,
      subDesc: coaName
    };
  }

  // E. Check Cyclic Project Supplies (Sparepart, Kimia Bor, MCU, Rotasi Tiket)
  if (dLower.includes('mcu') || coaCode === '51731') {
    return {
      cadence: 'CYCLIC_PROJECT',
      title: 'Biaya Medical Check-Up (MCU) & K3 Crew',
      subDesc: 'Pemeriksaan kesehatan kerja berkala kru bor dan follow up MCU K3'
    };
  }
  if (dLower.includes('tiket') || dLower.includes('flight') || dLower.includes('travell') || coaCode === '54300') {
    return {
      cadence: 'CYCLIC_PROJECT',
      title: 'Tiket Penerbangan & Perjalanan Dinas Site (CGK-PDG)',
      subDesc: 'Tiket pesawat mobilisasi & rotasi berkala personel lapangan'
    };
  }
  if (dLower.includes('spillbak') || dLower.includes('sanchin')) {
    return {
      cadence: 'CYCLIC_PROJECT',
      title: 'Material Operasional (Pembuatan Spillbak Sanchin)',
      subDesc: 'Material peralatan sanchin dan perlengkapan kerja bor'
    };
  }
  if (coaCode.startsWith('5161') || dLower.includes('bentonit') || dLower.includes('polimer') || dLower.includes('hi-vis')) {
    return {
      cadence: 'CYCLIC_PROJECT',
      title: 'Bahan Kimia Operasional Pemboran (Bentonit & Polimer)',
      subDesc: 'Lumpur pemboran penstabil lubang bor per titik pekerjaan'
    };
  }
  if (coaCode === '51712' || dLower.includes('casing') || dLower.includes('pvc')) {
    return {
      cadence: 'CYCLIC_PROJECT',
      title: 'Pipa PVC & Casing Pelindung Bor',
      subDesc: 'Casing pipa pelindung per kedalaman titik pemboran'
    };
  }
  if (coaCode.startsWith('5152') || dLower.includes('sparepart') || dLower.includes('suku cadang')) {
    return {
      cadence: 'CYCLIC_PROJECT',
      title: 'Suku Cadang & Sparepart Aus Pemboran',
      subDesc: 'Penggantian mata bor (drill bit), selang, seal pompa sanchin'
    };
  }

  // Default fallback for general recurring expenses
  return {
    cadence: 'CYCLIC_PROJECT',
    title: clean || coaName,
    subDesc: coaName
  };
}

export function calculateSmartForecast(
  journals: any[],
  coas: any[],
  projects: any[],
  arInvoices: any[],
  selectedProjectId: string, // '' for All Company, or specific project ID
  horizon: HorizonType = '1_month',
  historicalMonthsRange: number = 2 // How many months back to learn patterns
): SmartForecastResult {
  // 1. Determine Horizon in Days
  let horizonDays = 30;
  let horizonLabel = '1 Bulan (30 Hari)';
  if (horizon === '1_week') {
    horizonDays = 7;
    horizonLabel = '1 Minggu (7 Hari)';
  } else if (horizon === '2_weeks') {
    horizonDays = 14;
    horizonLabel = '2 Minggu (14 Hari)';
  } else if (horizon === '3_months') {
    horizonDays = 90;
    horizonLabel = '3 Bulan (90 Hari)';
  }

  const horizonMultiplier = horizonDays / 30.0;

  // 2. Identify Cash Accounts & Calculate Current Live Balances
  const cashAccountIds = new Set(
    coas.filter(c => c.account_code.startsWith('111') || c.account_code.startsWith('112')).map(c => c.id)
  );

  let currentCashBalance = 0;
  journals.forEach(j => {
    if (j.status !== 'Posted') return;
    j.lines?.forEach((l: any) => {
      if (cashAccountIds.has(l.account_id)) {
        currentCashBalance += (l.debit || 0) - (l.credit || 0);
      }
    });
  });

  // 3. Filter Expenses Matching Project Scope
  const projMap = new Map(projects.map(p => [p.id, p]));
  const coaMap = new Map(coas.map(c => [c.id, c]));

  let historicalTotalExpense = 0;
  let historicalOneOffExpense = 0;
  const oneOffItems: { date: string; desc: string; amount: number }[] = [];
  
  // Cadence Item Map
  const cadenceItemsMap = new Map<string, { 
    id: string; 
    title: string; 
    subDesc: string; 
    coaCode: string; 
    amount: number; 
    samples: string[];
    cadence: CadenceType;
  }>();

  journals.forEach(j => {
    if (j.status !== 'Posted') return;
    const lines = j.lines || [];

    lines.forEach((l: any) => {
      const coa = coaMap.get(l.account_id);
      if (!coa) return;

      const isExpenseAccount = coa.account_code.startsWith('5') || coa.account_code.startsWith('6') || coa.account_code.startsWith('7');
      if (!isExpenseAccount) return;

      // Project filter
      if (selectedProjectId && l.project_id !== selectedProjectId) {
        return;
      }

      const netExpense = (l.debit || 0) - (l.credit || 0);
      if (netExpense <= 0) return;

      historicalTotalExpense += netExpense;
      const rawDesc = l.description || j.description || coa.account_name;

      const classification = classifyExpense(rawDesc, coa.account_name, coa.account_code);

      // Check if One-Off
      if (classification.cadence === 'ONE_OFF') {
        historicalOneOffExpense += netExpense;
        oneOffItems.push({
          date: j.date,
          desc: rawDesc.replace(/^Auto-journal for Expense EXP-\d+:\s*/i, '').trim(),
          amount: netExpense
        });
        return;
      }

      // Aggregate recurring items by classified title
      const itemKey = classification.title;
      const existing = cadenceItemsMap.get(itemKey) || {
        id: itemKey,
        title: classification.title,
        subDesc: classification.subDesc,
        coaCode: coa.account_code,
        amount: 0,
        samples: [] as string[],
        cadence: classification.cadence
      };

      existing.amount += netExpense;
      const cleanRaw = rawDesc.replace(/^Auto-journal for Expense EXP-\d+:\s*/i, '').trim();
      if (cleanRaw && existing.samples.length < 3 && !existing.samples.includes(cleanRaw)) {
        existing.samples.push(cleanRaw);
      }
      cadenceItemsMap.set(itemKey, existing);
    });
  });

  // Normalize monthly base using historical range divisor
  const divisor = Math.max(1, historicalMonthsRange);

  // Group into 3 COA Cadences
  const weeklyItems: CadenceItem[] = [];
  const monthlyFixedItems: CadenceItem[] = [];
  const cyclicItems: CadenceItem[] = [];

  Array.from(cadenceItemsMap.values()).forEach(item => {
    const monthlyAmount = item.amount / divisor;
    const projectedAmount = monthlyAmount * horizonMultiplier;
    const cItem: CadenceItem = {
      id: item.id,
      title: item.title,
      subDesc: item.subDesc,
      coaCode: item.coaCode,
      monthlyAmount,
      projectedAmount,
      samples: item.samples,
      cadence: item.cadence
    };

    if (item.cadence === 'WEEKLY_SITE') {
      weeklyItems.push(cItem);
    } else if (item.cadence === 'MONTHLY_FIXED') {
      monthlyFixedItems.push(cItem);
    } else {
      cyclicItems.push(cItem);
    }
  });

  // Sort each group by amount descending
  weeklyItems.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
  monthlyFixedItems.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
  cyclicItems.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const weeklyMonthlyTotal = weeklyItems.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const weeklyProjectedTotal = weeklyItems.reduce((sum, i) => sum + i.projectedAmount, 0);

  const fixedMonthlyTotal = monthlyFixedItems.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const fixedProjectedTotal = monthlyFixedItems.reduce((sum, i) => sum + i.projectedAmount, 0);

  const cyclicMonthlyTotal = cyclicItems.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const cyclicProjectedTotal = cyclicItems.reduce((sum, i) => sum + i.projectedAmount, 0);

  const cadenceGroups: CadenceGroup[] = [
    {
      id: 'WEEKLY_SITE',
      title: 'Beban Rutin Harian / Mingguan (Kasbon Site 10-Hari)',
      cadenceLabel: 'Perlu Kas Tiap 7 - 10 Hari',
      badge: 'Siklus Kasbon Lapangan',
      color: '#D4AF37', // Gold / Amber
      description: 'BBM Solar Rig/Pompa (51410), BBM Kendaraan (51320), Dapur & Makan Crew (54610), Oli Pelumas (51510), Upah THL (53211), Pulsa & Tol (51748).',
      monthlyTotal: weeklyMonthlyTotal,
      projectedTotal: weeklyProjectedTotal,
      items: weeklyItems
    },
    {
      id: 'MONTHLY_FIXED',
      title: 'Beban Rutin Bulanan (Payroll, Sewa & Utilitas Pasti)',
      cadenceLabel: 'Jatuh Tempo Akhir Bulan',
      badge: 'Fixed Monthly Outflow',
      color: '#294825', // Forest Green
      description: 'Gaji PJO, Tim Bor, Wellsite, Admin (51500), Gaji Karyawan HO (61100), Sewa Kendaraan (54110), Sewa Mess (54700), Listrik PLN (51741), Biaya Bank (72100).',
      monthlyTotal: fixedMonthlyTotal,
      projectedTotal: fixedProjectedTotal,
      items: monthlyFixedItems
    },
    {
      id: 'CYCLIC_PROJECT',
      title: 'Beban Berkala Siklus Proyek (Sparepart, Kimia & Rotasi)',
      cadenceLabel: 'Per Titik Bor & Rotasi 2-4 Mgg',
      badge: 'Siklus Proyek & Material',
      color: '#1E40AF', // Royal Blue
      description: 'Suku Cadang & Mata Bor (51520), Bahan Kimia Bentonit/Polimer (51611), Pipa PVC Casing (51712), Tiket Rotasi Kru CGK-PDG (54300), MCU K3 (51731).',
      monthlyTotal: cyclicMonthlyTotal,
      projectedTotal: cyclicProjectedTotal,
      items: cyclicItems
    }
  ];

  // Flat categories list for backward compatibility
  const categories: CategoryBreakdown[] = [
    ...weeklyItems.map(i => ({
      category: i.title,
      recurringAmount: i.monthlyAmount,
      projectedAmount: i.projectedAmount,
      description: i.subDesc,
      sampleItems: i.samples,
      cadence: 'WEEKLY_SITE' as CadenceType
    })),
    ...monthlyFixedItems.map(i => ({
      category: i.title,
      recurringAmount: i.monthlyAmount,
      projectedAmount: i.projectedAmount,
      description: i.subDesc,
      sampleItems: i.samples,
      cadence: 'MONTHLY_FIXED' as CadenceType
    })),
    ...cyclicItems.map(i => ({
      category: i.title,
      recurringAmount: i.monthlyAmount,
      projectedAmount: i.projectedAmount,
      description: i.subDesc,
      sampleItems: i.samples,
      cadence: 'CYCLIC_PROJECT' as CadenceType
    }))
  ];

  const historicalRecurringOpex = weeklyMonthlyTotal + fixedMonthlyTotal + cyclicMonthlyTotal;
  const projectedTotalRequired = weeklyProjectedTotal + fixedProjectedTotal + cyclicProjectedTotal;
  
  const projectedPayroll = monthlyFixedItems
    .filter(i => i.title.toLowerCase().includes('gaji') || i.title.toLowerCase().includes('upah'))
    .reduce((sum, i) => sum + i.projectedAmount, 0);

  const projectedOpex = projectedTotalRequired - projectedPayroll;

  // 5. Calculate Runway & Cash Adequacy
  const burnRatePerDay = projectedTotalRequired / horizonDays;
  const runwayDays = burnRatePerDay > 0 ? Math.floor(currentCashBalance / burnRatePerDay) : 999;
  const surplusDeficit = currentCashBalance - projectedTotalRequired;

  let cashStatus: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  if (surplusDeficit < 0) {
    cashStatus = 'CRITICAL';
  } else if (surplusDeficit < projectedTotalRequired * 0.2) {
    cashStatus = 'WARNING';
  }

  // 6. Inflow Opportunities (Unpaid AR Invoices)
  let potentialInflow = 0;
  arInvoices.forEach(inv => {
    if (inv.status !== 'Paid') {
      if (!selectedProjectId || inv.project_id === selectedProjectId) {
        const remaining = (inv.total_amount || 0) - (inv.amount_paid || 0);
        if (remaining > 0) potentialInflow += remaining;
      }
    }
  });

  const netCashAfterInflow = surplusDeficit + potentialInflow;

  const selectedProjectObj = projMap.get(selectedProjectId);
  const scopeName = selectedProjectObj 
    ? `${selectedProjectObj.code} - ${selectedProjectObj.name}`
    : 'Konsolidasi Seluruh Perusahaan (PT Coreterra Geo Engineering)';

  return {
    scopeName,
    currentCashBalance,
    horizonDays,
    horizonLabel,
    historicalTotalExpense,
    historicalOneOffExpense,
    historicalRecurringOpex,
    projectedWeeklyKasbon: weeklyProjectedTotal,
    projectedMonthlyFixed: fixedProjectedTotal,
    projectedCyclic: cyclicProjectedTotal,
    projectedPayroll,
    projectedOpex,
    projectedTotalRequired,
    cashStatus,
    surplusDeficit,
    runwayDays,
    burnRatePerDay,
    potentialInflow,
    netCashAfterInflow,
    cadenceGroups,
    categories,
    oneOffItems
  };
}
