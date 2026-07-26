import { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { ArrowLeft, Filter, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, financialsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface COA {
  id: string;
  account_code: string;
  account_name: string;
  normal_balance: string;
}

interface JournalLine {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

interface Journal {
  id: string;
  journal_number: string;
  date: string;
  description: string;
  status: string;
  lines: JournalLine[];
}

interface LedgerEntry {
  id: string;
  date: string;
  journal_number: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function GeneralLedgerPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const [_isLoading, setIsLoading] = useState(true);
  const addToast = useToastStore((state) => state.addToast);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [journalsRes, coasRes] = await Promise.all([
        financeApi.getJournals(),
        financialsApi.getCoas()
      ]);
      setJournals(journalsRes.data.filter((j: Journal) => j.status === 'Posted')); // Only posted journals
      const sortedCoas = coasRes.data.sort((a: COA, b: COA) => a.account_code.localeCompare(b.account_code));
      setCoas(sortedCoas);
      if (coasRes.data.length > 0) {
        setSelectedAccountId(coasRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch ledger data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const ledgerData = useMemo(() => {
    if (!selectedAccountId) return [];
    
    const account = coas.find(c => c.id === selectedAccountId);
    if (!account) return [];
    
    const entries: Omit<LedgerEntry, 'balance'>[] = [];
    
    journals.forEach(journal => {
      journal.lines.forEach(line => {
        if (line.account_id === selectedAccountId) {
          entries.push({
            id: line.id,
            date: journal.date,
            journal_number: journal.journal_number,
            description: line.description || journal.description || 'No description',
            debit: line.debit,
            credit: line.credit
          });
        }
      });
    });
    
    // Sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate running balance
    let runningBalance = 0;
    const isDebitNormal = account.normal_balance.toLowerCase() === 'debit';
    
    return entries.map(entry => {
      if (isDebitNormal) {
        runningBalance += (entry.debit - entry.credit);
      } else {
        runningBalance += (entry.credit - entry.debit);
      }
      return { ...entry, balance: runningBalance };
    });
  }, [journals, selectedAccountId, coas]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const columns = [
    { header: 'Date', accessor: 'date' as keyof LedgerEntry, className: 'w-32' },
    { header: 'Journal No.', accessor: 'journal_number' as keyof LedgerEntry, className: 'font-mono text-primary w-40' },
    { header: 'Description', accessor: 'description' as keyof LedgerEntry },
    { 
      header: 'Debit', 
      accessor: (row: LedgerEntry) => row.debit > 0 ? formatCurrency(row.debit) : '-',
      className: 'text-right w-36 text-textSecondary'
    },
    { 
      header: 'Credit', 
      accessor: (row: LedgerEntry) => row.credit > 0 ? formatCurrency(row.credit) : '-',
      className: 'text-right w-36 text-textSecondary'
    },
    { 
      header: 'Balance', 
      accessor: (row: LedgerEntry) => (
        <span className="font-semibold text-textPrimary">{formatCurrency(row.balance)}</span>
      ),
      className: 'text-right w-40 bg-background/50'
    },
  ];

  const selectedAccount = coas.find(c => c.id === selectedAccountId);

  const handleDownloadAllPDF = () => {
    if (coas.length === 0 || journals.length === 0) return;
    
    const doc = new jsPDF('landscape');
    let isFirst = true;

    doc.setFontSize(16);
    doc.text("General Ledger (All Accounts)", 14, 15);
    
    let currentY = 25;

    coas.forEach(account => {
      // Compute ledger data for this account
      const entries: Omit<LedgerEntry, 'balance'>[] = [];
      journals.forEach(journal => {
        journal.lines.forEach(line => {
          if (line.account_id === account.id) {
            entries.push({
              id: line.id,
              date: journal.date,
              journal_number: journal.journal_number,
              description: line.description || journal.description || 'No description',
              debit: line.debit,
              credit: line.credit
            });
          }
        });
      });

      if (entries.length === 0) return; // Skip empty accounts

      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let runningBalance = 0;
      const isDebitNormal = account.normal_balance.toLowerCase() === 'debit';
      
      const rows = entries.map(entry => {
        if (isDebitNormal) {
          runningBalance += (entry.debit - entry.credit);
        } else {
          runningBalance += (entry.credit - entry.debit);
        }
        return [
          entry.date,
          entry.journal_number,
          entry.description,
          entry.debit > 0 ? formatCurrency(entry.debit) : '-',
          entry.credit > 0 ? formatCurrency(entry.credit) : '-',
          formatCurrency(runningBalance)
        ];
      });

      if (!isFirst) {
        // If not enough space, add new page. Otherwise just add a gap.
        if (currentY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          currentY = 15;
        }
      }
      isFirst = false;

      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Account: ${account.account_code} - ${account.account_name} (Normal Balance: ${account.normal_balance})`, 14, currentY);
      
      autoTable(doc, {
        head: [['Date', 'Journal No.', 'Description', 'Debit', 'Credit', 'Balance']],
        body: rows,
        startY: currentY + 4,
        theme: 'grid',
        styles: { fontSize: 8, valign: 'middle' },
        headStyles: { fillColor: [63, 100, 78] },
        willDrawCell: (data) => {
          if ([3, 4, 5].includes(data.column.index)) {
            data.cell.styles.halign = 'right';
            if (data.section === 'body' && data.cell.raw) {
              const text = String(data.cell.raw).trim();
              if (text.startsWith('Rp')) data.cell.text = [''];
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && [3, 4, 5].includes(data.column.index)) {
            const text = String(data.cell.raw).trim();
            if (text.startsWith('Rp')) {
              const rp = 'Rp';
              const num = text.replace(/^Rp\s*/, '');
              const y = data.cell.y + (data.cell.height / 2);
              doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
              doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
            }
          }
        },
        didDrawPage: (data) => {
          const str = 'Halaman ' + doc.internal.getNumberOfPages() + ' dari {total_pages_count_string}';
          const dateStr = 'Dicetak pada: ' + new Date().toLocaleString('id-ID');
          
          doc.setFontSize(8);
          doc.setTextColor(150);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
          
          doc.text(dateStr, 14, pageHeight - 10);
          doc.text(str, pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 12;
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages('{total_pages_count_string}');
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">General Ledger</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">General Ledger</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px] max-w-md">
          <label className="text-sm font-medium text-textPrimary flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter Account
          </label>
          <select 
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
          >
            {coas.map(c => (
              <option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</option>
            ))}
          </select>
        </div>
        {selectedAccount && (
          <div className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-textSecondary h-[38px] flex items-center">
            Normal Balance: <span className="font-bold text-textPrimary ml-1 capitalize">{selectedAccount.normal_balance}</span>
          </div>
        )}
        <button
          onClick={handleDownloadAllPDF}
          className="ml-auto px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors h-[38px] flex items-center gap-2"
          title="Download All Accounts Ledger (PDF)"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download All (PDF)</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title={`Ledger: ${selectedAccount ? selectedAccount.account_name : '...'}`}
          description="View transactions and running balance for the selected account."
          columns={columns}
          data={ledgerData}
          searchPlaceholder="Search description or journal no..."
        />
      </div>
    </div>
  );
}
