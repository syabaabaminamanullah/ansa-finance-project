import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Image as ImageIcon, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { type FileItem } from '../../store/documentStore';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { clsx } from 'clsx';

interface FileViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export function FileViewerModal({ file, onClose }: FileViewerModalProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Excel Specific States
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');

  useEffect(() => {
    if (!file) {
      setHtmlContent(null);
      setError(null);
      setWorkbook(null);
      setActiveSheet('');
      return;
    }

    if (file.type === 'image' || file.type === 'pdf') {
      // These are natively supported, no parsing needed
      return;
    }

    // Handle Word and Excel parsing
    if (file.type === 'excel' || file.type === 'word') {
      if (!file.dataUrl) {
        // Fallback for mock files without dataUrl
        setHtmlContent(`
          <div style="padding: 2rem; text-align: center; color: #666;">
            <h3>Mock ${file.type === 'excel' ? 'Spreadsheet' : 'Document'}</h3>
            <p>This is a pre-populated mock file. Upload a real file to see actual content!</p>
          </div>
        `);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Extract base64 part
        const base64Data = file.dataUrl.split(',')[1];
        if (!base64Data) throw new Error("Invalid file data");
        
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        if (file.type === 'excel') {
          // Parse with xlsx
          const wb = XLSX.read(bytes.buffer, { type: 'array' });
          setWorkbook(wb);
          setActiveSheet(wb.SheetNames[0]);
          setIsLoading(false);
        } else if (file.type === 'word') {
          // Parse with mammoth
          mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
            .then(result => {
              // Wrap with some basic styling for docx
              setHtmlContent(`<div style="line-height: 1.6; font-family: sans-serif; padding: 1rem;">${result.value}</div>`);
              setIsLoading(false);
            })
            .catch(err => {
              console.error(err);
              setError("Failed to parse Word document.");
              setIsLoading(false);
            });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to process file for viewing.");
        setIsLoading(false);
      }
    }
  }, [file]);

  // Effect to handle Excel sheet switching
  useEffect(() => {
    if (file?.type === 'excel' && workbook && activeSheet) {
      const worksheet = workbook.Sheets[activeSheet];
      if (worksheet) {
        const html = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-table' });
        const styledHtml = html.replace('<table', '<table style="border-collapse: collapse; width: 100%; font-size: 14px; text-align: left;"')
                              .replaceAll('<td', '<td style="border: 1px solid #e5e7eb; padding: 6px;"');
        setHtmlContent(styledHtml);
      }
    }
  }, [workbook, activeSheet, file]);

  if (!file) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8" onClick={onClose}>
      <div 
        className="w-full max-w-5xl h-full max-h-[90vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            {file.type === 'pdf' && <FileText className="w-6 h-6 text-danger" />}
            {file.type === 'image' && <ImageIcon className="w-6 h-6 text-success" />}
            {file.type === 'excel' && <FileSpreadsheet className="w-6 h-6 text-success" />}
            {file.type === 'word' && <FileText className="w-6 h-6 text-blue-600" />}
            
            <div className="flex flex-col">
              <h3 className="font-medium text-textPrimary leading-none">{file.name}</h3>
              {file.size && <span className="text-xs text-textSecondary mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {file.dataUrl && (
              <a 
                href={file.dataUrl} 
                download={file.name}
                className="p-2 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="Download File"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 overflow-auto bg-[#f3f4f6] dark:bg-[#111] relative">
          
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-textSecondary">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Processing document...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-danger">
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="h-full w-full flex flex-col items-center justify-start p-4 overflow-hidden">
              
              {/* Image Preview */}
              {file.type === 'image' && (
                file.dataUrl ? (
                  <img src={file.dataUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded shadow" />
                ) : (
                  <div className="text-textSecondary">No image data available for mock.</div>
                )
              )}

              {/* PDF Preview */}
              {file.type === 'pdf' && (
                file.dataUrl ? (
                  <iframe src={file.dataUrl} className="w-full h-full rounded shadow bg-white" title="PDF Viewer" />
                ) : (
                  <div className="text-textSecondary">No PDF data available for mock.</div>
                )
              )}

              {/* Excel / Word Preview (HTML Conversion) */}
              {(file.type === 'excel' || file.type === 'word') && htmlContent && (
                <div 
                  className="w-full flex-1 max-w-5xl bg-white text-black p-4 sm:p-8 rounded shadow overflow-auto"
                  dangerouslySetInnerHTML={{ __html: htmlContent }} 
                />
              )}

              {/* Excel Sheet Tabs */}
              {file.type === 'excel' && workbook && workbook.SheetNames.length > 1 && (
                <div className="w-full max-w-5xl mt-4 flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide">
                  {workbook.SheetNames.map(sheetName => (
                    <button
                      key={sheetName}
                      onClick={() => setActiveSheet(sheetName)}
                      className={clsx(
                        "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors shadow-sm",
                        activeSheet === sheetName 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-white text-textPrimary hover:bg-secondary/10 border border-border"
                      )}
                    >
                      {sheetName}
                    </button>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
