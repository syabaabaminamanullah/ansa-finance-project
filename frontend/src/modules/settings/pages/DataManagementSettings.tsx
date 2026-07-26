import React, { useRef, useState } from 'react';
import { Database, Download, Upload, FileText, FileSpreadsheet, FileCode2, HardDrive, Play, AlertCircle, X } from 'lucide-react';
import { useToastStore } from '../../../store/toastStore';
import { dataManagementApi } from '../../../services/api';
import { Modal } from '../../../components/ui/Modal';

export function DataManagementSettings() {
  const addToast = useToastStore((state) => state.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadType, setUploadType] = useState<'db_restore' | 'excel_import' | 'pdf_upload' | 'py_script' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Script Execution Results Modal State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [scriptResult, setScriptResult] = useState<{
    message: string;
    stdout: string;
    stderr: string;
    exit_code: number;
    filename: string;
  } | null>(null);

  const handleBackup = async () => {
    setIsDownloading(true);
    try {
      addToast('success', 'Backup Started', 'Database backup is being generated...');
      const response = await dataManagementApi.backup();
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ansa_erp_backup_${new Date().toISOString().split('T')[0]}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Backup Completed', 'Database backup downloaded successfully.');
    } catch (error) {
      console.error(error);
      addToast('error', 'Backup Failed', 'Could not generate database backup.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportMaster = async () => {
    setIsDownloading(true);
    try {
      addToast('success', 'Export Started', 'Preparing master data export...');
      const response = await dataManagementApi.exportMaster();
      const blob = new Blob([response.data], { type: 'application/x-zip-compressed' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `master_data_export_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Export Successful', 'Master data ZIP downloaded (Chart of Accounts, Inventory, Employees).');
    } catch (error) {
      console.error(error);
      addToast('error', 'Export Failed', 'Could not export master data.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadInvoiceTemplates = async () => {
    setIsDownloading(true);
    try {
      addToast('success', 'Download Started', 'Fetching invoice templates...');
      const response = await dataManagementApi.downloadInvoiceTemplates();
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoice_template.html');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Download Successful', 'Invoice template downloaded.');
    } catch (error) {
      console.error(error);
      addToast('error', 'Download Failed', 'Could not download invoice templates.');
    } finally {
      setIsDownloading(false);
    }
  };

  const triggerUpload = (type: 'db_restore' | 'excel_import' | 'pdf_upload' | 'py_script') => {
    setUploadType(type);
    if (fileInputRef.current) {
      if (type === 'db_restore') {
        fileInputRef.current.accept = '.db,.sql';
      } else if (type === 'excel_import') {
        fileInputRef.current.accept = '.csv';
      } else if (type === 'pdf_upload') {
        fileInputRef.current.accept = '.pdf';
      } else if (type === 'py_script') {
        fileInputRef.current.accept = '.py';
      }
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType) return;

    setIsUploading(true);
    try {
      if (uploadType === 'db_restore') {
        addToast('success', 'Restoring Database', 'Uploading and restoring database file...');
        await dataManagementApi.restore(file);
        addToast('success', 'Restore Successful', 'Database has been restored successfully. Refresh to see changes.');
      } else if (uploadType === 'excel_import') {
        addToast('success', 'Importing Data', 'Processing master data CSV import...');
        const res = await dataManagementApi.importMaster(file);
        addToast('success', 'Import Successful', res.data.message || 'Master data imported successfully.');
      } else if (uploadType === 'pdf_upload') {
        addToast('success', 'Uploading PDF', 'Saving PDF attachment...');
        await dataManagementApi.uploadPdf(file);
        addToast('success', 'Upload Successful', `${file.name} uploaded successfully.`);
      } else if (uploadType === 'py_script') {
        addToast('success', 'Executing Script', 'Deploying and running Python script...');
        const res = await dataManagementApi.deployScript(file);
        setScriptResult({
          message: res.data.message,
          stdout: res.data.stdout,
          stderr: res.data.stderr,
          exit_code: res.data.exit_code,
          filename: file.name
        });
        setIsScriptModalOpen(true);
        if (res.data.exit_code === 0) {
          addToast('success', 'Execution Successful', 'Python script ran successfully.');
        } else {
          addToast('error', 'Execution Failed', 'Python script failed with errors.');
        }
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || 'An error occurred during file processing.';
      addToast('error', 'Operation Failed', errorMsg);
    } finally {
      setIsUploading(false);
      setUploadType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Data Management</h1>
        <p className="text-textSecondary mt-1">Import, export, and manage system databases and files.</p>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Database Management */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-primary/5 flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-textPrimary">Database (DB)</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-textSecondary mb-4">Create backups of your SQLite/PostgreSQL database or restore from an existing file.</p>
            
            <button onClick={handleBackup} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary/10 hover:border-primary transition-all text-sm font-medium disabled:opacity-50">
              <Download className="w-4 h-4 text-success" />
              Download Full DB Backup
            </button>
            <button onClick={() => triggerUpload('db_restore')} disabled={isUploading} className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary/10 hover:border-primary transition-all text-sm font-medium disabled:opacity-50">
              <Upload className="w-4 h-4 text-warning" />
              Restore DB from File
            </button>
          </div>
        </div>

        {/* Excel & Spreadsheets */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-success/5 flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-success" />
            <h2 className="font-bold text-textPrimary">Excel / CSV</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-textSecondary mb-4">Bulk import master data (Chart of Accounts, Inventory, Employees) or export reports.</p>
            
            <button onClick={handleExportMaster} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary/10 hover:border-success transition-all text-sm font-medium disabled:opacity-50">
              <Download className="w-4 h-4 text-success" />
              Export Master Data to Excel
            </button>
            <button onClick={() => triggerUpload('excel_import')} disabled={isUploading} className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary/10 hover:border-success transition-all text-sm font-medium disabled:opacity-50">
              <Upload className="w-4 h-4 text-warning" />
              Import Data from Excel/CSV
            </button>
          </div>
        </div>

        {/* Document (PDF) Management */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-danger/5 flex items-center gap-3">
            <FileText className="w-5 h-5 text-danger" />
            <h2 className="font-bold text-textPrimary">PDF Documents</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-textSecondary mb-4">Manage invoice templates, legal documents, and batch export PDF records.</p>
            
            <button onClick={handleDownloadInvoiceTemplates} disabled={isDownloading} className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary/10 hover:border-danger transition-all text-sm font-medium disabled:opacity-50">
              <Download className="w-4 h-4 text-success" />
              Download Invoice Templates
            </button>
            <button onClick={() => triggerUpload('pdf_upload')} disabled={isUploading} className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg hover:bg-secondary/10 hover:border-danger transition-all text-sm font-medium disabled:opacity-50">
              <Upload className="w-4 h-4 text-warning" />
              Upload PDF Attachments
            </button>
          </div>
        </div>

        {/* Python Scripts / Extensions */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-blue-500/5 flex items-center gap-3">
            <FileCode2 className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-textPrimary">Python Scripts (.py)</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-textSecondary mb-4">Upload custom Python scripts for advanced data processing, migrations, or custom API endpoints.</p>
            
            <button onClick={() => triggerUpload('py_script')} disabled={isUploading} className="w-full flex items-center justify-center gap-2 p-3 border border-border rounded-lg bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 hover:border-blue-500 transition-all text-sm font-medium disabled:opacity-50">
              <Upload className="w-4 h-4 text-blue-500" />
              Deploy Custom .py Script
            </button>
            <p className="text-xs text-textSecondary italic text-center mt-2">
              Note: Scripts uploaded will run in a sandboxed environment on the backend.
            </p>
          </div>
        </div>

      </div>
      
      {isUploading && (
        <div className="fixed bottom-6 right-6 bg-card border border-border shadow-lg p-4 rounded-lg flex items-center gap-3 animate-pulse z-50">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-textPrimary">Processing file upload...</p>
        </div>
      )}

      {isDownloading && (
        <div className="fixed bottom-6 right-6 bg-card border border-border shadow-lg p-4 rounded-lg flex items-center gap-3 animate-pulse z-50">
          <div className="w-5 h-5 border-2 border-success border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-textPrimary">Downloading file...</p>
        </div>
      )}

      {/* Script Execution Result Modal */}
      <Modal 
        isOpen={isScriptModalOpen} 
        onClose={() => setIsScriptModalOpen(false)} 
        title={`Execution Output: ${scriptResult?.filename}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className={`p-2 rounded-lg ${scriptResult?.exit_code === 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">{scriptResult?.message}</h3>
              <p className="text-xs text-textSecondary">Exit Code: {scriptResult?.exit_code}</p>
            </div>
          </div>

          {scriptResult?.stdout && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-success uppercase tracking-wider">Standard Output (stdout)</h4>
              <pre className="p-4 bg-background border border-border rounded-lg text-xs font-mono text-textPrimary overflow-auto max-h-60 whitespace-pre-wrap">
                {scriptResult.stdout}
              </pre>
            </div>
          )}

          {scriptResult?.stderr && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-danger uppercase tracking-wider">Standard Error (stderr)</h4>
              <pre className="p-4 bg-background border border-border rounded-lg text-xs font-mono text-danger overflow-auto max-h-60 whitespace-pre-wrap">
                {scriptResult.stderr}
              </pre>
            </div>
          )}

          {!scriptResult?.stdout && !scriptResult?.stderr && (
            <div className="text-center py-6 text-textSecondary text-sm italic">
              Script ran and terminated with no console output.
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border mt-4">
            <button 
              type="button" 
              onClick={() => setIsScriptModalOpen(false)} 
              className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary"
            >
              Close Output
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
