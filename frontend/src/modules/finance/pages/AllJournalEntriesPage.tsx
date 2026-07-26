import { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { ArrowLeft, Filter, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, financialsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface COA {
  id: string;
  account_code: string;
  account_name: string;
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

interface FlatEntry {
  id: string;
  journal_id: string;
  date: string;
  journal_number: string;
  status: string;
  description: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  is_first_line?: boolean;
}

export function AllJournalEntriesPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  const [_isLoading, setIsLoading] = useState(true);
  const addToast = useToastStore((state) => state.addToast);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [journalsRes, coasRes] = await Promise.all([
        financeApi.getJournals(),
        financialsApi.getCoas()
      ]);
      setJournals(journalsRes.data);
      setCoas(coasRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch journal data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const flatEntries = useMemo(() => {
    const entries: FlatEntry[] = [];
    journals.forEach(journal => {
      // Apply date filter if set
      if (filterDateFrom && journal.date < filterDateFrom) return;
      if (filterDateTo && journal.date > filterDateTo) return;

      journal.lines.forEach(line => {
        const account = coas.find(c => c.id === line.account_id);
        entries.push({
          id: line.id,
          journal_id: journal.id,
          date: journal.date,
          journal_number: journal.journal_number,
          status: journal.status,
          description: line.description || journal.description || '-',
          account_code: account?.account_code || 'Unknown',
          account_name: account?.account_name || 'Unknown',
          debit: line.debit,
          credit: line.credit
        });
      });
    });
    
    // Sort by date desc, then by journal number, then debit before credit
    entries.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      if (a.journal_number !== b.journal_number) return a.journal_number.localeCompare(b.journal_number);
      return b.debit - a.debit; // Debits on top
    });
    
    // Mark the first line of each journal for visual grouping
    for (let i = 0; i < entries.length; i++) {
      if (i === 0 || entries[i].journal_number !== entries[i-1].journal_number) {
        entries[i].is_first_line = true;
      } else {
        entries[i].is_first_line = false;
      }
    }

    return entries;
  }, [journals, coas, filterDateFrom, filterDateTo]);

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const columns = [
    { 
      header: 'Date', 
      accessor: (row: FlatEntry) => row.is_first_line ? row.date : '',
      className: 'w-24 whitespace-nowrap text-textSecondary text-xs'
    },
    { 
      header: 'Journal No.', 
      accessor: (row: FlatEntry) => row.is_first_line ? row.journal_number : '',
      className: 'font-mono text-primary font-bold w-36 whitespace-nowrap text-xs' 
    },
    { 
      header: 'Account', 
      accessor: (row: FlatEntry) => (
        <div className={!row.is_first_line ? "pl-4 border-l-2 border-border/50" : ""}>
          <span className="font-mono font-medium block sm:inline">{row.account_code}</span>
          <span className="sm:ml-2 text-textSecondary text-xs">{row.account_name}</span>
        </div>
      ),
      className: 'min-w-[150px] w-1/4 whitespace-normal break-words'
    },
    { 
      header: 'Description', 
      accessor: 'description' as keyof FlatEntry, 
      className: 'min-w-[150px] w-1/4 whitespace-normal break-words text-xs' 
    },
    { 
      header: 'Debit', 
      accessor: (row: FlatEntry) => formatCurrency(row.debit),
      className: 'text-right min-w-[130px] whitespace-nowrap font-medium text-xs'
    },
    { 
      header: 'Credit', 
      accessor: (row: FlatEntry) => formatCurrency(row.credit),
      className: 'text-right min-w-[130px] whitespace-nowrap font-medium text-textSecondary text-xs'
    },
    { 
      header: 'Status / Action', 
      accessor: (row: FlatEntry) => row.is_first_line ? (
        <button
          onClick={() => toggleJournalStatus(row.journal_id, row.status)}
          className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all shadow-sm w-[70px] text-center ${
            row.status === 'Posted' 
              ? 'bg-success/10 text-success border border-success/20 hover:bg-warning hover:text-white hover:border-warning group' 
              : 'bg-warning/10 text-warning border border-warning/20 hover:bg-success hover:text-white hover:border-success group'
          }`}
          title={row.status === 'Posted' ? 'Click to Unpost' : 'Click to Post'}
        >
          <span className="block group-hover:hidden">{row.status}</span>
          <span className="hidden group-hover:block">{row.status === 'Posted' ? 'Unpost' : 'Post'}</span>
        </button>
      ) : '',
      className: 'w-28 text-center whitespace-nowrap'
    }
  ];

  const toggleJournalStatus = async (journalId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Posted' ? 'Draft' : 'Posted';
      await financeApi.updateJournalStatus(journalId, { status: newStatus });
      addToast('success', 'Status Updated', `Journal status changed to ${newStatus}`);
      fetchData();
    } catch (e) {
      addToast('error', 'Error', 'Failed to update journal status');
    }
  };

  const handleDownloadCSV = () => {
    if (flatEntries.length === 0) {
      addToast('warning', 'No Data', 'There is no data to download.');
      return;
    }

    const headers = ['Date', 'Journal No.', 'Account Code', 'Account Name', 'Description', 'Debit', 'Credit', 'Status'];
    const csvContent = [
      headers.join(','),
      ...flatEntries.map(e => [
        e.date,
        e.journal_number,
        e.account_code,
        `"${e.account_name}"`, // Quote strings that might contain commas
        `"${e.description}"`,
        e.debit,
        e.credit,
        e.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `All_Journals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col min-w-0 w-full overflow-hidden">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">All Journal Entries</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">All Journals</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-end justify-between shadow-sm">
        <div className="flex gap-4">
          <div className="space-y-1.5 min-w-[150px]">
            <label className="text-sm font-medium text-textPrimary flex items-center gap-2">
              <Filter className="w-4 h-4" /> From Date
            </label>
            <input 
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
            />
          </div>
          <div className="space-y-1.5 min-w-[150px]">
            <label className="text-sm font-medium text-textPrimary">To Date</label>
            <input 
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
            />
          </div>
        </div>
        
        <button 
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 min-w-0">
        <DataTable
          title="Journal Entries Detail"
          description="A comprehensive view of all journal entries including detailed lines."
          columns={columns}
          data={flatEntries}
          searchPlaceholder="Search journal no, account, description..."
          groupBy={(row) => row.date}
        />
      </div>
    </div>
  );
}
