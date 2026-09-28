import os

def rewrite_expense_modal():
    path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'ExpensePage.tsx')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the View Modal
    start_str = '      <Modal isOpen={isViewOpen} onClose={() => { setIsViewOpen(false); setPreviewPdf(null); }} title="Expense Details" maxWidth="max-w-xl">'
    
    if start_str not in content:
        print("Could not find start of View Modal.")
        return
        
    new_start_str = '      <Modal isOpen={isViewOpen} onClose={() => { setIsViewOpen(false); setPreviewPdf(null); }} title="Expense Details" maxWidth={previewPdf ? "max-w-5xl" : "max-w-xl"}>'
    
    content = content.replace(start_str, new_start_str)
    
    # Wrap the content in a grid
    old_wrapper = """        <Modal isOpen={isViewOpen} onClose={() => { setIsViewOpen(false); setPreviewPdf(null); }} title="Expense Details" maxWidth={previewPdf ? "max-w-5xl" : "max-w-xl"}>
          {editingItem && (
            <div className="space-y-6">"""
    
    new_wrapper = """        <Modal isOpen={isViewOpen} onClose={() => { setIsViewOpen(false); setPreviewPdf(null); }} title="Expense Details" maxWidth={previewPdf ? "max-w-6xl" : "max-w-xl"}>
          {editingItem && (
            <div className={previewPdf ? "grid grid-cols-2 gap-6" : "space-y-6"}>
              <div className="space-y-6">"""
    
    content = content.replace(old_wrapper, new_wrapper)
    
    # Now find the PDF viewer block and modify it
    old_pdf_block = """            {previewPdf && (
              <div className="bg-background border border-border rounded-lg mt-4 overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2 text-danger font-medium text-sm">
                    <FileText className="w-5 h-5" />
                    <span>Dokumen PDF</span>
                  </div>
                  <a 
                    href={getPreviewUrl(previewPdf)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Lihat Penuh</span>
                  </a>
                </div>
                <div className="h-[400px] w-full bg-muted/10">
                  <iframe 
                    src={getPreviewUrl(previewPdf)} 
                    className="w-full h-full border-0" 
                    title="PDF Viewer"
                  />
                </div>
              </div>
            )}"""
            
    new_pdf_block = """            </div>
              {previewPdf && (
                <div className="bg-background border border-border rounded-lg overflow-hidden flex flex-col h-full min-h-[500px]">
                  <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2 text-danger font-medium text-sm">
                      <FileText className="w-5 h-5" />
                      <span>Dokumen PDF</span>
                    </div>
                    <a 
                      href={getPreviewUrl(previewPdf)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Lihat Penuh</span>
                    </a>
                  </div>
                  <div className="flex-1 w-full bg-muted/10">
                    <iframe 
                      src={getPreviewUrl(previewPdf)} 
                      className="w-full h-full border-0 min-h-[500px]" 
                      title="PDF Viewer"
                    />
                  </div>
                </div>
              )}
            """
            
    content = content.replace(old_pdf_block, new_pdf_block)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("ExpensePage patched successfully.")

rewrite_expense_modal()
