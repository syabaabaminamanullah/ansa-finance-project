import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Briefcase, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, financialsApi, projectsApi, stakeholdersApi, rabApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DataTable } from '../../../components/ui/DataTable';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Project {
  id: string;
  name: string;
  contract_value: string;
  contract_value_usd: number;
  contract_value_idr: number;
  customer_id?: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  contact: string;
}

interface Expense {
  id: string;
  expense_number: string;
  date: string;
  project_id?: string;
  description: string;
  amount: number;
  status: string;
}

interface ApInvoice {
  id: string;
  invoice_number: string;
  project_id?: string;
  date: string;
  description: string;
  total_amount: number;
  status: string;
}

interface ArInvoice {
  id: string;
  invoice_number: string;
  project_id?: string;
  date: string;
  description: string;
  total_amount: number;
  status: string;
}

interface Transaction {
  id: string;
  date: string;
  number: string;
  type: string;
  description: string;
  amount: number;
  status: string;
}

// Premium muted color palette for charts to match earthy theme
const COLORS = ['#3d5a80', '#e07a5f', '#81b29a', '#f2cc8f', '#98c1d9', '#293241'];

export function ProjectFinancialReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [apInvoices, setApInvoices] = useState<ApInvoice[]>([]);
  const [arInvoices, setArInvoices] = useState<ArInvoice[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [coas, setCoas] = useState<any[]>([]);
  
  const [_isLoading, setIsLoading] = useState(true);
  const [rabItems, setRabItems] = useState<any[]>([]);
  const addToast = useToastStore((state) => state.addToast);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [projRes, expRes, apRes, arRes, custRes, jourRes, coasRes] = await Promise.all([
          projectsApi.getProjects(),
          financeApi.getExpenses(),
          financeApi.getApInvoices(),
          financeApi.getArInvoices(),
          stakeholdersApi.getCustomers(),
          financeApi.getJournals(),
          financialsApi.getCoas()
        ]);
        setProjects(projRes.data);
        setExpenses(expRes.data);
        setApInvoices(apRes.data);
        setArInvoices(arRes.data);
        setCustomers(custRes.data);
        setJournals(jourRes.data);
        setCoas(coasRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        addToast('error', 'Connection Error', 'Failed to fetch financial data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [addToast]);

  // Fetch RAB items when project changes
  useEffect(() => {
    if (!selectedProjectId) { setRabItems([]); return; }
    rabApi.getByProject(selectedProjectId).then(r => setRabItems(r.data)).catch(() => setRabItems([]));
  }, [selectedProjectId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const formatCurrencyUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const projectData = useMemo(() => {
    if (!selectedProjectId) return null;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return null;

    const customer = customers.find(c => c.id === project.customer_id);

    const projExpenses = expenses.filter(e => e.project_id === selectedProjectId);
    const projAp = apInvoices.filter(i => i.project_id === selectedProjectId);
    const projAr = arInvoices.filter(i => i.project_id === selectedProjectId);
    
    // Create a set of expense account IDs (starts with 5 - COGS) to match P&L exactly
    const expenseAccountIds = new Set(coas.filter(c => 
      c.account_code.startsWith('5')
    ).map(c => c.id));
    
    // Income accounts for reference (starts with 4)
    const incomeAccountIds = new Set(coas.filter(c => 
      c.account_code.startsWith('4')
    ).map(c => c.id));

    // ==========================================
    // AKURASI DATA P&L (Berdasarkan Jurnal)
    // ==========================================
    let totalActualCost = 0;
    let totalBilled = 0;

    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      const pLines = j.lines?.filter((l: any) => l.project_id === selectedProjectId) || [];
      if (pLines.length === 0) return;

      pLines.forEach((l: any) => {
        if (incomeAccountIds.has(l.account_id)) {
          totalBilled += (l.credit - l.debit);
        }
        if (expenseAccountIds.has(l.account_id)) {
          totalActualCost += (l.debit - l.credit);
        }
      });
    });
    
    const budgetIDR = project.contract_value_idr || 0;
    const budgetUSD = project.contract_value_usd || 0;
    const remainingBudget = budgetIDR - totalActualCost;

    const projJournals = journals
      .filter(j => 
        j.status === 'Posted' && 
        j.lines?.some((l: any) => l.project_id === selectedProjectId) &&
        !(j.description || '').startsWith('Auto-journal for ')
      )
      .map(j => {
        const pLines = j.lines.filter((l: any) => l.project_id === selectedProjectId);
        const amount = pLines.reduce((sum: number, l: any) => sum + (expenseAccountIds.has(l.account_id) ? l.debit : 0), 0);
        return {
          id: j.id,
          date: j.date,
          number: j.journal_number || j.number || '-',
          description: j.description || '-',
          amount: amount,
          status: j.status
        };
      })
      .filter(j => j.amount > 0);

    // Combine transactions for the table
    const transactions: Transaction[] = [
      ...projExpenses.map(e => ({
        id: e.id,
        date: e.date,
        number: e.expense_number,
        type: 'Direct Expense',
        description: e.description,
        amount: e.amount,
        status: e.status
      })),
      ...projAp.map(i => ({
        id: i.id,
        date: i.date,
        number: i.invoice_number,
        type: 'AP Invoice (Vendor)',
        description: i.description || '-',
        amount: i.total_amount,
        status: i.status
      })),
      ...projAr.map(i => ({
        id: i.id,
        date: i.date,
        number: i.invoice_number,
        type: 'AR Invoice (Income)',
        description: i.description || '-',
        amount: i.total_amount,
        status: i.status
      })),
      ...projJournals.map(j => ({
        id: j.id,
        date: j.date,
        number: j.number,
        type: 'Manual Journal (Expense)',
        description: j.description,
        amount: j.amount,
        status: j.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      project,
      customer,
      budgetIDR,
      budgetUSD,
      totalActualCost,
      remainingBudget,
      totalBilled: totalBilled,
      transactions,
      costBreakdown: [
        { name: 'Total Project Cost (COGS)', value: totalActualCost }
      ].filter(item => item.value > 0),
      budgetStatus: [
        { name: 'Spent', value: totalActualCost },
        { name: 'Remaining', value: Math.max(0, remainingBudget) }
      ]
    };
  }, [selectedProjectId, projects, expenses, apInvoices, arInvoices, journals, coas]);

  const transactionColumns = [
    { header: 'Date', accessor: 'date' as keyof Transaction, className: 'w-24 whitespace-nowrap' },
    { header: 'Transaction No.', accessor: 'number' as keyof Transaction, className: 'font-mono text-primary font-medium w-32' },
    { header: 'Type', accessor: (row: Transaction) => (
      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
        row.type === 'Direct Expense' ? 'bg-orange-500/10 text-orange-600' : 
        row.type === 'AR Invoice (Income)' ? 'bg-success/10 text-success' :
        row.type === 'Manual Journal (Expense)' ? 'bg-blue-500/10 text-blue-600' :
        'bg-purple-500/10 text-purple-600'
      }`}>
        {row.type}
      </span>
    )},
    { header: 'Description', accessor: 'description' as keyof Transaction },
    { header: 'Amount', accessor: (row: Transaction) => formatCurrency(row.amount), className: 'text-right font-medium' },
    { header: 'Status', accessor: (row: Transaction) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        ['Paid', 'Posted'].includes(row.status) ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
      }`}>
        {row.status}
      </span>
    ), className: 'w-24' },
  ];

  const handleDownloadConsolidatedPDF = () => {
    if (projects.length === 0) {
      addToast('error', 'No Data', 'No projects available to generate report.');
      return;
    }
    
    // Aggregation logic
    let totalGlobalIncome = 0;
    let totalGlobalExpense = 0;
    let totalNonProjectIncome = 0;
    let totalNonProjectExpense = 0;
    let totalCompanyCash = 0;

    const projectSummaries: any[] = [];
    const coaRecap: Record<string, { code: string, name: string, debit: number, credit: number }> = {};
    const comprehensiveJournals: any[] = [];
    const projectDetails: Record<string, any[]> = {};

    const incomeAccountIds = new Set(coas.filter(c => c.account_code.startsWith('4')).map(c => c.id));
    const expenseAccountIds = new Set(coas.filter(c => c.account_code.startsWith('5') || c.account_code.startsWith('6') || c.account_code.startsWith('7')).map(c => c.id));
    const cashAccountIds = new Set(coas.filter(c => ['1110','1121','1122','1123','1124','1125'].includes(c.account_code)).map(c => c.id));

    // Calculate company-wide cash and non-project expenses/incomes
    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      j.lines?.forEach((l: any) => {
        if (cashAccountIds.has(l.account_id)) {
          totalCompanyCash += (l.debit - l.credit);
        }
        if (!l.project_id) {
          if (incomeAccountIds.has(l.account_id)) {
            totalNonProjectIncome += (l.credit - l.debit);
          }
          if (expenseAccountIds.has(l.account_id)) {
            totalNonProjectExpense += (l.debit - l.credit);
          }
        }
      });
    });

    projects.forEach(project => {
      let totalIncome = 0;
      let totalExpense = 0;
      const details: any[] = [];

      // Gunakan HANYA jurnal yang sudah di-post (sama seperti P&L)
      journals.forEach(j => {
        if (j.status !== 'Posted') return;

        const pLines = j.lines?.filter((l: any) => l.project_id === project.id) || [];
        if (pLines.length === 0) return;
        
        let jIncome = 0;
        let jExpense = 0;
        
        pLines.forEach((l: any) => {
          if (incomeAccountIds.has(l.account_id)) {
            jIncome += (l.credit - l.debit);
          }
          if (expenseAccountIds.has(l.account_id)) {
            jExpense += (l.debit - l.credit);
          }
        });

        if (jIncome !== 0) {
          totalIncome += jIncome;
          details.push({
             date: j.date,
             ref: j.journal_number,
             description: `Income: ${j.description}`,
             income: jIncome,
             expense: 0
          });
        }
        if (jExpense !== 0) {
          totalExpense += jExpense;
          details.push({
             date: j.date,
             ref: j.journal_number,
             description: `Expense (COGS): ${j.description}`,
             income: 0,
             expense: jExpense
          });
        }
      });

      details.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      projectDetails[project.id] = details;

      if (totalIncome !== 0 || totalExpense !== 0) {
        projectSummaries.push({
          name: project.name,
          income: totalIncome,
          expense: totalExpense
        });
        totalGlobalIncome += totalIncome;
        totalGlobalExpense += totalExpense;
      }
    });

    const processedJournalIds = new Set();
    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      const hasProject = j.lines?.some((l: any) => !!l.project_id);
      if (!hasProject) return;

      if (!processedJournalIds.has(j.id)) {
        processedJournalIds.add(j.id);
        
        let shouldIncludeJournal = false;

        j.lines.forEach((l: any) => {
          if (l.project_id) {
            const isIncome = l.credit > 0 && incomeAccountIds.has(l.account_id);
            const isExpense = l.debit > 0 && expenseAccountIds.has(l.account_id);
            
            if (isIncome || isExpense) {
              shouldIncludeJournal = true;
              const coa = coas.find(c => c.id === l.account_id);
              if (coa) {
                if (!coaRecap[coa.id]) coaRecap[coa.id] = { code: coa.account_code, name: coa.account_name, debit: 0, credit: 0 };
                coaRecap[coa.id].debit += l.debit;
                coaRecap[coa.id].credit += l.credit;
              }
            }
          }
        });

        if (shouldIncludeJournal) {
          j.lines.forEach((l: any) => {
            const coa = coas.find(c => c.id === l.account_id);
            const proj = projects.find(p => p.id === l.project_id);
            comprehensiveJournals.push({
              date: j.date,
              journal_id: j.id,
              account: coa ? `${coa.account_code} ${coa.account_name}` : 'Unknown',
              description: l.description || j.description || '-',
              ref: j.journal_number,
              project: proj ? proj.name : '-',
              debit: l.debit,
              credit: l.credit
            });
          });
        }
      }
    });

    const doc = new jsPDF('landscape', 'mm', 'a4'); 
    const printDate = new Date().toLocaleString('id-ID');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Page 1: Header
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Tanggal Laporan: ${printDate}`, pageWidth - 14, 15, { align: 'right' });
    doc.text(`Dicetak oleh: Sistem Keuangan PT Ansa`, pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(20, 60, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN KEUANGAN KONSOLIDASI & JURNAL UMUM', 14, 30);
    
    doc.setDrawColor(20, 60, 100);
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);

    doc.setFontSize(11);
    doc.setFillColor(240, 245, 250);
    doc.rect(14, 38, pageWidth - 28, 8, 'F');
    doc.text('RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)', 16, 43.5);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('A. Total Keuangan Berdasarkan Proyek', 14, 53);

    const tableARows = projectSummaries.map((p, i) => [
      `${i + 1}. ${p.name}`,
      formatCurrency(p.income),
      formatCurrency(p.expense),
      formatCurrency(p.income - p.expense)
    ]);
    tableARows.push(['TOTAL KESELURUHAN', formatCurrency(totalGlobalIncome), formatCurrency(totalGlobalExpense), formatCurrency(totalGlobalIncome - totalGlobalExpense)]);

    autoTable(doc, {
      head: [['Nama Proyek', 'Total Pemasukan (Rp)', 'Total Pengeluaran (Rp)', 'Gross Profit (Rp)']],
      body: tableARows,
      startY: 56,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
        }
        if (data.row.index === tableARows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index > 0) data.cell.styles.textColor = [200, 0, 0];
        } else if (data.column.index === 3 && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('-Rp')) data.cell.styles.textColor = [200, 0, 0];
          else if (text !== 'Rp 0') data.cell.styles.textColor = [0, 150, 0];
        }
      },
      didDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          let rp = '';
          let num = '';
          if (text.startsWith('Rp')) {
            rp = 'Rp';
            num = text.replace(/^Rp\s*/, '');
          } else if (text.startsWith('-Rp')) {
            rp = '-Rp';
            num = text.replace(/^-Rp\s*/, '');
          }
          if (rp && num) {
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // SECTION B: Keuangan Operasional Perusahaan (Non-Proyek)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('B. Total Keuangan Operasional Perusahaan (Non-Proyek)', 14, currentY);

    const tableBRows = [
      ['Operasional Pusat / Overhead', formatCurrency(totalNonProjectIncome), formatCurrency(totalNonProjectExpense), formatCurrency(totalNonProjectIncome - totalNonProjectExpense)]
    ];

    autoTable(doc, {
      head: [['Keterangan', 'Total Pemasukan (Rp)', 'Total Pengeluaran (Rp)', 'Net (Rp)']],
      body: tableBRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
        }
        if (data.column.index === 3 && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('-Rp')) data.cell.styles.textColor = [200, 0, 0];
          else if (text !== 'Rp 0') data.cell.styles.textColor = [0, 150, 0];
        }
      },
      didDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          let rp = '';
          let num = '';
          if (text.startsWith('Rp')) { rp = 'Rp'; num = text.replace(/^Rp\s*/, ''); }
          else if (text.startsWith('-Rp')) { rp = '-Rp'; num = text.replace(/^-Rp\s*/, ''); }
          if (rp && num) {
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // SECTION C: Posisi Saldo Kas Keseluruhan
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('C. Ringkasan Konsolidasi & Posisi Kas Perusahaan Saat Ini', 14, currentY);
    
    const totalAllIncome = totalGlobalIncome + totalNonProjectIncome;
    const totalAllExpense = totalGlobalExpense + totalNonProjectExpense;
    
    const tableCRows = [
      ['Total Proyek', formatCurrency(totalGlobalIncome), formatCurrency(totalGlobalExpense), formatCurrency(totalGlobalIncome - totalGlobalExpense)],
      ['Total Non-Proyek', formatCurrency(totalNonProjectIncome), formatCurrency(totalNonProjectExpense), formatCurrency(totalNonProjectIncome - totalNonProjectExpense)],
      ['TOTAL KONSOLIDASI (LABA/RUGI BERSIH)', formatCurrency(totalAllIncome), formatCurrency(totalAllExpense), formatCurrency(totalAllIncome - totalAllExpense)],
      ['SALDO KAS & BANK TERKINI (POSISI RIIL)', '', '', formatCurrency(totalCompanyCash)]
    ];

    autoTable(doc, {
      head: [['Ringkasan', 'Total Pemasukan (Rp)', 'Total Pengeluaran (Rp)', 'Net / Saldo (Rp)']],
      body: tableCRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [240, 245, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
        }
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.row.index === 3) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [20, 60, 100];
          data.cell.styles.textColor = [255, 255, 255];
        } else if (data.column.index === 3 && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('-Rp')) data.cell.styles.textColor = [200, 0, 0];
          else if (text !== 'Rp 0') data.cell.styles.textColor = [0, 150, 0];
        }
      },
      didDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          let rp = '';
          let num = '';
          if (text.startsWith('Rp')) { rp = 'Rp'; num = text.replace(/^Rp\s*/, ''); }
          else if (text.startsWith('-Rp')) { rp = '-Rp'; num = text.replace(/^-Rp\s*/, ''); }
          if (rp && num) {
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('D. Rekapitulasi Berdasarkan Kategori Akun (COA)', 14, currentY);

    const coaArray = Object.values(coaRecap).sort((a, b) => a.code.localeCompare(b.code));
    let totalDebit = 0;
    let totalCredit = 0;
    const tableDRows = coaArray.map(c => {
      totalDebit += c.debit;
      totalCredit += c.credit;
      return [
        c.code,
        c.name,
        c.debit > 0 ? formatCurrency(c.debit) : '-',
        c.credit > 0 ? formatCurrency(c.credit) : '-'
      ];
    });
    tableDRows.push(['', 'TOTAL', formatCurrency(totalDebit), formatCurrency(totalCredit)]);

    autoTable(doc, {
      head: [['Kode Akun', 'Nama Akun', 'Total Debit (Rp)', 'Total Kredit (Rp)']],
      body: tableDRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) data.cell.text = [''];
        }
        if (data.row.index === tableDRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index > 1) data.cell.styles.textColor = [200, 0, 0];
        }
      },
      didDrawCell: (data) => {
        if ([2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) {
            const rp = 'Rp';
            const num = text.replace(/^Rp\s*/, '');
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    // PAGE 2: BAGIAN I (Rincian per Proyek)
    let projIndex = 1;
    for (const [projId, details] of Object.entries(projectDetails)) {
      if (details.length === 0) continue;
      const p = projects.find(x => x.id === projId);
      
      doc.addPage();
      
      const drawProjectHeader = (data: any) => {
        if (data.pageNumber === 1) {
          doc.setFontSize(11);
          doc.setFillColor(240, 245, 250);
          doc.rect(14, 14, pageWidth - 28, 8, 'F');
          doc.setTextColor(20, 60, 100);
          doc.setFont('helvetica', 'bold');
          doc.text('BAGIAN I: RINCIAN KEUANGAN PER PROYEK', 16, 19.5);
        }
        
        const isContinued = data.pageNumber > 1 ? ' (Lanjutan)' : '';
        const headerY = data.pageNumber === 1 ? 28 : 15;
        
        doc.setFontSize(10);
        doc.setTextColor(20, 60, 100);
        doc.setFont('helvetica', 'bold');
        doc.text(`${projIndex}. Proyek: ${p?.name?.toUpperCase()}${isContinued}`, 14, headerY);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nilai Proyek (Kontrak): ${formatCurrency(p?.contract_value_idr || 0)}`, 14, headerY + 5);
      };
      
      let pTotalIn = 0;
      let pTotalEx = 0;
      
      const rRows = details.map(d => {
        pTotalIn += d.income;
        pTotalEx += d.expense;
        return [
          `- ${d.description} (${d.date})`,
          d.income > 0 ? formatCurrency(d.income) : '-',
          d.expense > 0 ? formatCurrency(d.expense) : '-'
        ];
      });
      
      rRows.push(['Subtotal', formatCurrency(pTotalIn), formatCurrency(pTotalEx)]);
      rRows.push(['SISA SALDO (Pemasukan - Pengeluaran)', '', formatCurrency(pTotalIn - pTotalEx)]);
      
      autoTable(doc, {
        head: [['Komponen Aktual Tervalidasi', 'Pemasukan (Rp)', 'Pengeluaran (Rp)']],
        body: rRows,
        startY: 38,
        theme: 'grid',
        margin: { top: 25, bottom: 25 },
        styles: { fontSize: 8, valign: 'middle' },
        headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didDrawPage: drawProjectHeader,
        willDrawCell: (data) => {
          if ([1, 2].includes(data.column.index)) {
            data.cell.styles.halign = 'right';
            const text = String(data.cell.raw);
            if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
          }
          if (data.row.index >= rRows.length - 2) {
            data.cell.styles.fontStyle = 'bold';
            if (data.row.index === rRows.length - 1) {
              data.cell.styles.fillColor = [240, 245, 250];
              if (data.column.index === 2) {
                const val = pTotalIn - pTotalEx;
                if (val < 0) data.cell.styles.textColor = [200, 0, 0];
                else if (val > 0) data.cell.styles.textColor = [0, 150, 0];
              }
            }
          }
        },
        didDrawCell: (data) => {
          if ([1, 2].includes(data.column.index) && data.section === 'body') {
            const text = String(data.cell.raw);
            let rp = '';
            let num = '';
            if (text.startsWith('Rp')) {
              rp = 'Rp';
              num = text.replace(/^Rp\s*/, '');
            } else if (text.startsWith('-Rp')) {
              rp = '-Rp';
              num = text.replace(/^-Rp\s*/, '');
            }
            
            if (rp && num) {
              const y = data.cell.y + (data.cell.height / 2);
              doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
              doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
            }
          }
        }
      });
      
      projIndex++;
    }

    // PAGE 3: BAGIAN II (Jurnal Komprehensif)
    doc.addPage();
    doc.setFontSize(11);
    doc.setFillColor(240, 245, 250);
    doc.rect(14, 14, pageWidth - 28, 8, 'F');
    doc.setTextColor(20, 60, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('BAGIAN II: JURNAL UMUM KOMPREHENSIF', 16, 19.5);
    
    const groupedJournals: any[] = [];
    let currentJournalId = '';
    comprehensiveJournals.forEach(j => {
      if (j.journal_id !== currentJournalId) {
        currentJournalId = j.journal_id;
        groupedJournals.push(j);
      } else {
        groupedJournals.push({ ...j, date: '', ref: '' });
      }
    });

    let gTotalDebit = 0;
    let gTotalCredit = 0;

    const gRows = groupedJournals.map(j => {
      gTotalDebit += j.debit;
      gTotalCredit += j.credit;
      
      const accText = `${j.account}\n(${j.description})`;
      
      return [
        j.date,
        accText,
        j.ref,
        j.project,
        j.debit > 0 ? formatCurrency(j.debit) : '-',
        j.credit > 0 ? formatCurrency(j.credit) : '-'
      ];
    });
    
    gRows.push(['', 'TOTAL KESELURUHAN DEBIT & KREDIT', '', '', formatCurrency(gTotalDebit), formatCurrency(gTotalCredit)]);

    autoTable(doc, {
      head: [['Tanggal', 'Akun & Keterangan', 'Ref', 'Tag Proyek', 'Debit (Rp)', 'Kredit (Rp)']],
      body: gRows,
      startY: 28,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [240, 245, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 
        1: { cellWidth: 80 }, // Much wider in landscape
        3: { cellWidth: 50 }  // Wider project tags
      },
      willDrawCell: (data) => {
        if ([4, 5].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) data.cell.text = [''];
        }
        if (data.row.index === gRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [20, 60, 100];
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
      didDrawCell: (data) => {
        if ([4, 5].includes(data.column.index) && data.section === 'body' && data.row.index < gRows.length - 1) {
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) {
            const rp = 'Rp';
            const num = text.replace(/^Rp\s*/, '');
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, 195, { align: 'right' });
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Project Financial Reports</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">Project Reports</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <label className="text-sm font-bold text-textPrimary mb-2 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" /> Select Project to Analyze
        </label>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full max-w-xl px-4 py-3 bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
          >
            <option value="">-- Choose a Project --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
          <button
            onClick={handleDownloadConsolidatedPDF}
            className="px-5 py-3 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors flex items-center gap-2 whitespace-nowrap"
            title="Download Consolidated Financial Report (All Projects)"
          >
            <Download className="w-4 h-4" />
            Download Consolidated PDF
          </button>
        </div>
      </div>

      {projectData && (
        <div className="space-y-6">
          {/* Project Details Section */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8 justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-textPrimary">{projectData.project.name}</h2>
              <p className="text-sm font-mono text-textSecondary mt-1">{projectData.project.code}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-textSecondary w-24">Client:</span>
                  <span className="font-medium text-textPrimary">{projectData.customer?.name || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-textSecondary w-24">Address:</span>
                  <span className="font-medium text-textPrimary">{projectData.customer?.address || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-textSecondary w-24">Status:</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold uppercase">{projectData.project.status}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right border-l border-border pl-8 min-w-[200px]">
              <p className="text-sm text-textSecondary mb-1">Contract Budget</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(projectData.budgetIDR)}</p>
              {projectData.budgetUSD > 0 && (
                <p className="text-sm font-medium text-textSecondary mt-1">{formatCurrencyUSD(projectData.budgetUSD)}</p>
              )}
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-sm text-textSecondary mb-1">Gross Profit (Invoiced - Cost)</p>
                <p className={`text-2xl font-bold ${projectData.totalBilled - projectData.totalActualCost >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(projectData.totalBilled - projectData.totalActualCost)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3 text-textSecondary mb-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><DollarSign className="w-5 h-5" /></div>
                <span className="font-medium text-sm">Contract Budget (IDR)</span>
              </div>
              <h3 className="text-2xl font-bold text-textPrimary">{formatCurrency(projectData.budgetIDR)}</h3>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3 text-textSecondary mb-3">
                <div className="p-2 bg-danger/10 rounded-lg text-danger"><TrendingDown className="w-5 h-5" /></div>
                <span className="font-medium text-sm">Actual Cost (Spent)</span>
              </div>
              <h3 className="text-2xl font-bold text-danger">{formatCurrency(projectData.totalActualCost)}</h3>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3 text-textSecondary mb-3">
                <div className="p-2 bg-success/10 rounded-lg text-success"><PieChartIcon className="w-5 h-5" /></div>
                <span className="font-medium text-sm">Remaining Budget</span>
              </div>
              <h3 className={`text-2xl font-bold ${projectData.remainingBudget >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(projectData.remainingBudget)}
              </h3>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3 text-textSecondary mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><TrendingUp className="w-5 h-5" /></div>
                <span className="font-medium text-sm">Total Invoiced (AR)</span>
              </div>
              <h3 className="text-2xl font-bold text-blue-500">{formatCurrency(projectData.totalBilled)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-bold text-textPrimary mb-4">Budget Utilization (IDR)</h3>
              {projectData.budgetIDR > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectData.budgetStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell key="cell-0" fill="#e07a5f" /> {/* Spent -> Terracotta */}
                        <Cell key="cell-1" fill="#81b29a" /> {/* Remaining -> Sage Green */}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-textSecondary text-sm border-2 border-dashed border-border rounded-xl">
                  Contract Budget is zero or not properly defined.
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-bold text-textPrimary mb-4">Cost Breakdown by Category</h3>
              {projectData.totalActualCost > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectData.costBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {projectData.costBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-textSecondary text-sm border-2 border-dashed border-border rounded-xl">
                  No costs recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="h-[500px]">
             <DataTable 
               title="Project Expenses & Invoices" 
               description="Detailed log of all costs attributed to this project."
               columns={transactionColumns}
               data={projectData.transactions}
               searchPlaceholder="Search transactions..."
             />
          </div>

          {/* ===== RAB vs ACTUAL DETAIL TABLE ===== */}
          {rabItems.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-textPrimary">Detail RAB vs Aktual per Item Pekerjaan</h3>
                <p className="text-sm text-textSecondary mt-1">Perbandingan anggaran rencana dengan biaya yang sudah dikeluarkan, per baris kegiatan.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-background text-textSecondary">
                    <tr>
                      <th className="px-5 py-3">Item Pekerjaan</th>
                      <th className="px-5 py-3 text-right">Budget (IDR)</th>
                      <th className="px-5 py-3 text-right">Aktual (IDR)</th>
                      <th className="px-5 py-3 text-right">Sisa</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rabItems.map(rab => {
                      // Sum all expenses and AP invoices tagged to this RAB item
                      const actualExp = expenses.filter(e => e.project_id === selectedProjectId && (e as any).project_rab_id === rab.id).reduce((s, e) => s + e.amount, 0);
                      const actualAp = apInvoices.filter(i => i.project_id === selectedProjectId && (i as any).project_rab_id === rab.id).reduce((s, i) => s + i.total_amount, 0);
                      const actual = actualExp + actualAp;
                      const sisa = rab.total_cost_idr - actual;
                      const pct = rab.total_cost_idr > 0 ? Math.round((actual / rab.total_cost_idr) * 100) : 0;
                      const isOver = sisa < 0;
                      return (
                        <tr key={rab.id} className="hover:bg-background/50">
                          <td className="px-5 py-3">
                            <div className="font-medium text-textPrimary">{rab.description}</div>
                            <div className="text-xs text-textSecondary">{rab.category} · {rab.qty} {rab.unit}</div>
                          </td>
                          <td className="px-5 py-3 text-right font-mono">{formatCurrency(rab.total_cost_idr)}</td>
                          <td className="px-5 py-3 text-right font-mono font-medium text-textPrimary">{formatCurrency(actual)}</td>
                          <td className={`px-5 py-3 text-right font-bold ${isOver ? 'text-danger' : 'text-success'}`}>{formatCurrency(sisa)}</td>
                          <td className="px-5 py-3 text-center">
                            {rab.total_cost_idr === 0 ? (
                              <span className="px-2 py-1 rounded text-xs bg-border text-textSecondary">No Budget</span>
                            ) : isOver ? (
                              <span className="px-2 py-1 rounded text-xs bg-danger/10 text-danger font-bold">❌ Over {pct}%</span>
                            ) : pct >= 80 ? (
                              <span className="px-2 py-1 rounded text-xs bg-warning/10 text-warning font-bold">⚠️ {pct}%</span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-success/10 text-success font-bold">✅ {pct}%</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 font-bold">
                      <td className="px-5 py-3 text-textPrimary">TOTAL</td>
                      <td className="px-5 py-3 text-right text-textPrimary">{formatCurrency(rabItems.reduce((s, r) => s + r.total_cost_idr, 0))}</td>
                      <td className="px-5 py-3 text-right text-textPrimary">{formatCurrency(projectData.totalActualCost)}</td>
                      <td className={`px-5 py-3 text-right ${projectData.remainingBudget >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(projectData.remainingBudget)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
