import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  description?: string;
  columns: Column<T>[];
  data: T[];
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string | number }>({ 
  title, 
  description, 
  columns, 
  data, 
  onAdd,
  onEdit,
  onDelete,
  onView,
  searchPlaceholder = "Search...",
  groupBy
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: keyof T, direction: 'asc' | 'desc'} | null>(null);
  
  // Basic search filter
  let filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sorting
  if (sortConfig) {
    filteredData.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      const result = aVal > bVal ? 1 : -1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }

  // Generate a list of keys that can be sorted (primitive values)
  const sortableKeys = data.length > 0 
    ? (Object.keys(data[0]) as Array<keyof T>).filter(k => typeof data[0][k] === 'string' || typeof data[0][k] === 'number')
    : [];

  const extractTextFromNode = (node: any): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractTextFromNode).join(' ').trim();
    if (node.props && node.props.children) return extractTextFromNode(node.props.children);
    return '';
  };

  const getExportData = () => {
    const headers = columns.map(col => col.header);
    const rows = filteredData.map(row => {
      return columns.map(col => {
        if (typeof col.accessor === 'function') {
          return extractTextFromNode(col.accessor(row));
        }
        const val = row[col.accessor];
        return (val === null || val === undefined) ? '' : String(val);
      });
    });
    return { headers, rows };
  };

  const handleDownload = () => {
    if (filteredData.length === 0) return;
    
    const { headers, rows } = getExportData();
    
    const dataToExport = rows.map(rowArray => {
      const rowObj: any = {};
      headers.forEach((h, i) => {
        rowObj[h] = rowArray[i];
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    XLSX.writeFile(workbook, `${title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.xlsx`);
    setShowDownloadMenu(false);
  };

  const handleDownloadPDF = () => {
    if (filteredData.length === 0) return;
    
    const { headers, rows } = getExportData();
    const doc = new jsPDF('landscape');

    // Add title
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    
    if (description) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(description, 14, 22);
    }

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: description ? 28 : 22,
      theme: 'grid',
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [63, 100, 78] }, // primary color approx
      willDrawCell: (data) => {
        const col = columns[data.column.index];
        if (col) {
          if (col.className?.includes('text-right')) {
            data.cell.styles.halign = 'right';
            
            // Format accounting style (Rp on left, number on right)
            if (data.section === 'body' && data.cell.raw) {
              const text = String(data.cell.raw).trim();
              if (text.startsWith('Rp')) {
                // Clear the default text drawing
                data.cell.text = ['']; 
              }
            }
          } else if (col.className?.includes('text-center')) {
            data.cell.styles.halign = 'center';
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const col = columns[data.column.index];
          if (col && col.className?.includes('text-right')) {
            const text = String(data.cell.raw).trim();
            if (text.startsWith('Rp')) {
              // Draw custom accounting format
              const rp = 'Rp';
              const num = text.replace(/^Rp\s*/, '');
              
              const y = data.cell.y + (data.cell.height / 2); // Exact vertical center
              const padX = 2; // Default padding
              
              doc.text(rp, data.cell.x + padX, y, { baseline: 'middle' });
              doc.text(num, data.cell.x + data.cell.width - padX, y, { align: 'right', baseline: 'middle' });
            }
          }
        }
      },
      didDrawPage: (data) => {
        const str = 'Halaman ' + doc.internal.getNumberOfPages() + ' dari {total_pages_count_string}';
        const dateStr = 'Dicetak pada: ' + new Date().toLocaleString('id-ID');
        
        doc.setFontSize(8);
        doc.setTextColor(150); // Gray color for footer
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        
        const marginLeft = typeof data.settings.margin === 'object' ? (data.settings.margin.left || 14) : 14;
        const marginRight = typeof data.settings.margin === 'object' ? (data.settings.margin.right || 14) : 14;

        doc.text(dateStr, marginLeft, pageHeight - 10);
        doc.text(str, pageWidth - marginRight, pageHeight - 10, { align: 'right' });
      }
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages('{total_pages_count_string}');
    }

    // Create a Blob and open it in a new tab instead of downloading directly
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    
    setShowDownloadMenu(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-w-0">
      {/* Header Actions */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-textPrimary">{title}</h2>
            {description && <p className="text-sm text-textSecondary mt-1">{description}</p>}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              <input 
                type="text" 
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-textPrimary"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowSort(!showSort)}
                className={`p-2 border rounded-lg transition-colors flex items-center justify-center ${showSort || sortConfig ? 'bg-primary/10 border-primary/20 text-primary' : 'border-border text-textSecondary hover:bg-background hover:text-textPrimary'}`}
                title="Sort Data"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {showSort && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b border-border bg-background/50">
                    <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Sort By</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                    {sortableKeys.length === 0 ? (
                      <div className="p-2 text-xs text-textSecondary text-center">No sortable columns</div>
                    ) : (
                      sortableKeys.map(key => (
                        <div key={String(key)} className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              setSortConfig({ key, direction: 'asc' });
                              setShowSort(false);
                            }}
                            className={`flex-1 text-left px-3 py-2 text-sm rounded-md transition-colors ${sortConfig?.key === key && sortConfig.direction === 'asc' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-background text-textPrimary'}`}
                          >
                            <span className="truncate block max-w-[120px]">{String(key)}</span>
                          </button>
                          <button 
                            onClick={() => {
                              setSortConfig({ key, direction: 'desc' });
                              setShowSort(false);
                            }}
                            className={`px-2 py-2 rounded-md transition-colors ${sortConfig?.key === key && sortConfig.direction === 'desc' ? 'bg-primary text-primary-foreground' : 'hover:bg-background text-textSecondary hover:text-textPrimary'}`}
                            title="Sort Descending"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                    {sortConfig && (
                      <div className="pt-2 mt-2 border-t border-border">
                        <button 
                          onClick={() => { setSortConfig(null); setShowSort(false); }}
                          className="w-full px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-md transition-colors"
                        >
                          Clear Sort
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className={`p-2 border rounded-lg transition-colors flex items-center justify-center ${showDownloadMenu ? 'bg-primary/10 border-primary/20 text-primary' : 'border-border text-textSecondary hover:bg-background hover:text-textPrimary'}`}
                title="Download Data"
              >
                <Download className="w-4 h-4" />
              </button>
              
              {showDownloadMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b border-border bg-background/50">
                    <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Export As</h4>
                  </div>
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={handleDownload}
                      className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-background text-textPrimary flex items-center gap-2"
                    >
                      <span className="font-medium text-success">Excel</span> (.xlsx)
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-background text-textPrimary flex items-center gap-2"
                    >
                      <span className="font-medium text-danger">PDF</span> (.pdf)
                    </button>
                  </div>
                </div>
              )}
            </div>
            {onAdd && (
              <button 
                onClick={onAdd}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-textSecondary font-medium">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={twMerge("px-6 py-4", col.className)}>
                  {col.header}
                </th>
              ))}
              {(onView || onEdit || onDelete) && (
                <th className="px-6 py-4 text-right w-16">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.length > 0 ? (
              filteredData.map((row, index) => {
                const currentGroup = groupBy ? groupBy(row) : null;
                const prevGroup = groupBy && index > 0 ? groupBy(filteredData[index - 1]) : null;
                const showGroupHeader = groupBy && currentGroup !== prevGroup;

                return (
                  <React.Fragment key={row.id}>
                    {showGroupHeader && (
                      <tr className="bg-secondary/5 border-y border-border">
                        <td colSpan={columns.length + (onView || onEdit || onDelete ? 1 : 0)} className="px-6 py-2 text-xs font-bold text-primary uppercase tracking-wider">
                          {currentGroup}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-background/50 transition-colors group">
                      {columns.map((col, i) => (
                        <td key={i} className={twMerge("px-6 py-4 text-textPrimary", col.className)}>
                          {typeof col.accessor === 'function' 
                            ? col.accessor(row) 
                            : (row[col.accessor] as React.ReactNode)}
                        </td>
                      ))}
                      {(onView || onEdit || onDelete) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onView && (
                              <button 
                                onClick={() => onView(row)}
                                className="p-1.5 text-textSecondary hover:text-primary hover:bg-secondary/20 rounded-md transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            {onEdit && (
                              <button 
                                onClick={() => onEdit(row)}
                                className="p-1.5 text-textSecondary hover:text-primary hover:bg-secondary/20 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {onDelete && (
                              <button 
                                onClick={() => onDelete(row)}
                                className="p-1.5 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (onView || onEdit || onDelete ? 1 : 0)} className="px-6 py-12 text-center text-textSecondary">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 mb-3 opacity-20" />
                    <p>No data found matching your criteria</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Summary */}
      <div className="p-4 border-t border-border mt-auto flex items-center justify-between text-sm text-textSecondary bg-card">
        <div>
          Showing all <span className="font-medium text-textPrimary">{filteredData.length}</span> entries
        </div>
      </div>
    </div>
  );
}
