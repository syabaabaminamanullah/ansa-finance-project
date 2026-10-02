import sys

def main():
    file_path = "frontend/src/modules/finance/pages/ArInvoicePage.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the Payment Status block
    old_payment_status = """          <div className="space-y-1.5 w-1/2">
            <label className="text-sm font-medium text-textPrimary">Payment Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>"""

    new_payment_status = """          {editingItem && (
            <div className="space-y-1.5 w-1/2">
              <label className="text-sm font-medium text-textPrimary">Payment Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary disabled:opacity-50">
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
          </div>"""

    if old_payment_status in content:
        content = content.replace(old_payment_status, new_payment_status)
    else:
        print("old_payment_status NOT FOUND!")

    old_form_actions = """          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Invoice</button>
          </div>"""

    new_form_actions = """          {!editingItem && (
            <div className="mt-4 p-4 border border-border rounded-lg bg-primary/5">
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
                  <p className="text-xs text-textSecondary mt-1">* Sistem otomatis membuat Jurnal Piutang sekaligus Pelunasan Kas.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Invoice</button>
          </div>"""

    if old_form_actions in content:
        content = content.replace(old_form_actions, new_form_actions)
    else:
        print("old_form_actions NOT FOUND!")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("DONE REFACTORING UI!")

if __name__ == "__main__":
    main()
