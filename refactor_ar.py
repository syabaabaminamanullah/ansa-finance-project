import re
import sys

def main():
    file_path = "frontend/src/modules/finance/pages/ArInvoicePage.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add arAccounts list
    if "const arAccounts = coas.filter" not in content:
        content = content.replace(
            "const bankAccounts = coas.filter(c => c.account_type.toLowerCase() === 'asset');",
            "const bankAccounts = coas.filter(c => c.account_type.toLowerCase() === 'asset');\n    const arAccounts = coas.filter(c => c.account_type.toLowerCase() === 'asset');"
        )
        
    # 2. Modify handleSave
    old_handle_save_try = """    setIsSaving(true);
    try {
      if (editingItem) {
        await financeApi.updateArInvoice(editingItem.id, payload);
        addToast('success', 'Invoice Updated', `Invoice ${formData.invoice_number} has been updated.`);
      } else {
        await financeApi.createArInvoice(payload);
        addToast('success', 'Invoice Created', `Invoice ${formData.invoice_number} has been created.`);
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {"""

    new_handle_save_try = """    setIsSaving(true);
    try {
      if (editingItem) {
        await financeApi.updateArInvoice(editingItem.id, payload);
        addToast('success', 'Invoice Updated', `Invoice ${formData.invoice_number} has been updated.`);
      } else {
        const payloadCreate = { ...payload, status: paidToday ? 'Paid' : 'Unpaid' };
        const res = await financeApi.createArInvoice(payloadCreate);
        const savedInvoice = res.data;
        
        // JURNAL 1: PENGAKUAN PIUTANG (ACCRUAL)
        const piutangLines = [
          {
            account_id: formData.ar_account_id,
            project_id: formData.project_id || undefined,
            description: `Piutang Tagihan AR ${savedInvoice.invoice_number}`,
            debit: formData.total_amount,
            credit: 0
          },
          {
            account_id: formData.revenue_account_id,
            project_id: formData.project_id || undefined,
            description: `Pendapatan Tagihan AR ${savedInvoice.invoice_number}`,
            debit: 0,
            credit: formData.amount
          }
        ];
        
        if (formData.tax_amount > 0 && formData.tax_account_id) {
           piutangLines.push({
             account_id: formData.tax_account_id,
             project_id: formData.project_id || undefined,
             description: `PPN Keluaran AR ${savedInvoice.invoice_number}`,
             debit: 0,
             credit: formData.tax_amount
           });
        }
        
        await financeApi.createJournal({
          journal_number: `JV-INV-${savedInvoice.invoice_number}`,
          date: formData.date,
          description: `Auto-Journal: Pengakuan Piutang ${savedInvoice.invoice_number}`,
          status: 'Posted',
          ref_type: 'AR_Invoice',
          ref_id: savedInvoice.id,
          lines: piutangLines,
        });

        // JURNAL 2: PELUNASAN (JIKA SHORTCUT LUNAS HARI INI)
        if (paidToday && shortcutBankAccountId) {
           const kasLines = [
             {
               account_id: shortcutBankAccountId,
               project_id: formData.project_id || undefined,
               description: `Penerimaan Kas (Lunas Langsung) AR ${savedInvoice.invoice_number}`,
               debit: formData.total_amount,
               credit: 0
             },
             {
               account_id: formData.ar_account_id,
               project_id: formData.project_id || undefined,
               description: `Pelunasan Piutang AR ${savedInvoice.invoice_number}`,
               debit: 0,
               credit: formData.total_amount
             }
           ];
           
           await financeApi.createJournal({
              journal_number: `JV-REC-${savedInvoice.invoice_number}`,
              date: formData.date,
              description: `Auto-Journal: Penerimaan Kas ${savedInvoice.invoice_number}`,
              status: 'Posted',
              ref_type: 'AR_Invoice_Receipt',
              ref_id: savedInvoice.id,
              lines: kasLines,
           });
        }
        
        addToast('success', 'Invoice Created', `Invoice ${savedInvoice.invoice_number} has been created & journaled.`);
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {"""
    
    content = content.replace(old_handle_save_try, new_handle_save_try)
    
    # 3. Modify processPayment
    old_process_payment_try = """    setIsSaving(true);
    try {
      // 1. Create Auto Journal
      const journalLines = [
        {
          account_id: paymentData.bank_account_id,
          project_id: editingItem.project_id || undefined,
          description: `Payment Received for AR ${editingItem.invoice_number}`,
          debit: editingItem.total_amount,
          credit: 0
        },
        {
          account_id: paymentData.revenue_account_id,
          project_id: editingItem.project_id || undefined,
          description: `Revenue for AR ${editingItem.invoice_number}`,
          debit: 0,
          credit: editingItem.amount
        }
      ];

      if (editingItem.tax_amount > 0) {
        journalLines.push({
          account_id: paymentData.tax_account_id,
          project_id: editingItem.project_id || undefined,
          description: `PPN Out for AR ${editingItem.invoice_number}`,
          debit: 0,
          credit: editingItem.tax_amount
        });
      }

      await financeApi.createJournal({"""

    new_process_payment_try = """    setIsSaving(true);
    try {
      // 1. Create Auto Journal (Cash Basis Pelunasan)
      const journalLines = [
        {
          account_id: paymentData.bank_account_id,
          project_id: editingItem.project_id || undefined,
          description: `Payment Received for AR ${editingItem.invoice_number}`,
          debit: editingItem.total_amount,
          credit: 0
        },
        {
          account_id: editingItem.ar_account_id || paymentData.revenue_account_id, // Fallback for old invoices
          project_id: editingItem.project_id || undefined,
          description: `Pelunasan Piutang AR ${editingItem.invoice_number}`,
          debit: 0,
          credit: editingItem.total_amount
        }
      ];

      // Pajak tidak di-kredit lagi di sini karena sudah di-kredit saat Pengakuan Piutang (Create Invoice).

      await financeApi.createJournal({"""
    
    content = content.replace(old_process_payment_try, new_process_payment_try)

    # 4. Modify Form UI (Hide Status, Add AR Account, Add Shortcut)
    old_payment_status_div = """            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Payment Status</label>
              <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>"""

    new_payment_status_div = """            {editingItem && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Payment Status</label>
                <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary disabled:opacity-50">
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">AR Account (Akun Piutang) <span className="text-danger">*</span></label>
              <CoaSelect
                required
                accounts={arAccounts}
                value={formData.ar_account_id || ''}
                onChange={(val) => setFormData({ ...formData, ar_account_id: val })}
                placeholder="-- Pilih Akun Piutang --"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Revenue Account (Akun Pendapatan) <span className="text-danger">*</span></label>
              <CoaSelect
                required
                accounts={revAccounts}
                value={formData.revenue_account_id || ''}
                onChange={(val) => setFormData({ ...formData, revenue_account_id: val })}
                placeholder="-- Pilih Akun Pendapatan --"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Tax Account (Akun PPN)</label>
              <CoaSelect
                accounts={taxAccounts}
                value={formData.tax_account_id || ''}
                onChange={(val) => setFormData({ ...formData, tax_account_id: val })}
                placeholder="-- Pilih Akun Hutang PPN (opsional) --"
              />
            </div>
"""
    content = content.replace(old_payment_status_div, new_payment_status_div)
    
    # 5. Add the shortcut UI right before the form actions
    old_form_actions = """            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Invoice</button>
            </div>"""

    new_form_actions = """            
            {!editingItem && (
              <div className="col-span-2 mt-4 p-4 border border-border rounded-lg bg-primary/5">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-primary">
                  <input type="checkbox" checked={paidToday} onChange={(e) => setPaidToday(e.target.checked)} className="w-4 h-4 text-primary rounded border-border" />
                  Langsung catat sebagai Lunas (Paid Today)
                </label>
                {paidToday && (
                  <div className="mt-3 space-y-1.5">
                    <label className="text-sm font-medium text-textPrimary">Uang Masuk ke Rekening Bank Mana? <span className="text-danger">*</span></label>
                    <CoaSelect
                      required={paidToday}
                      accounts={bankAccounts}
                      value={shortcutBankAccountId}
                      onChange={setShortcutBankAccountId}
                      placeholder="-- Pilih Akun Kas/Bank Penerima --"
                    />
                    <p className="text-xs text-textSecondary mt-1">* Sistem akan otomatis membuat Jurnal Piutang sekaligus Jurnal Pelunasan Kas.</p>
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2 flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Invoice</button>
            </div>"""
    
    content = content.replace(old_form_actions, new_form_actions)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("DONE REFACTORING!")

if __name__ == "__main__":
    main()
