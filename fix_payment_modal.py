import sys

def main():
    file_path = "frontend/src/modules/finance/pages/ArInvoicePage.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Fix the validation in processPayment
    old_validation = """    if (!paymentData.bank_account_id || !paymentData.revenue_account_id) {
      addToast('error', 'Validation Error', 'Bank and Revenue accounts are required.');
      return;
    }
    if (editingItem.tax_amount > 0 && !paymentData.tax_account_id) {
      addToast('error', 'Validation Error', 'Tax account is required since there is tax in this invoice.');
      return;
    }"""

    new_validation = """    if (!paymentData.bank_account_id) {
      addToast('error', 'Validation Error', 'Bank account is required.');
      return;
    }"""

    if old_validation in content:
        content = content.replace(old_validation, new_validation)
        print("Validation fixed.")
    else:
        print("Validation NOT FOUND!")

    # 2. Fix the UI blocks in the Payment Modal
    old_ui = """          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Revenue Account (Kredit Pendapatan) <span className="text-danger">*</span></label>
            <CoaSelect
              required
              accounts={revAccounts}
              value={paymentData.revenue_account_id}
              onChange={(val) => setPaymentData({ ...paymentData, revenue_account_id: val })}
              placeholder="-- Pilih Akun Pendapatan --"
            />
          </div>

          {(editingItem?.tax_amount || 0) > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Tax Account (Kredit Hutang PPN) <span className="text-danger">*</span></label>
              <CoaSelect
                required
                accounts={taxAccounts}
                value={paymentData.tax_account_id}
                onChange={(val) => setPaymentData({ ...paymentData, tax_account_id: val })}
                placeholder="-- Pilih Akun Hutang Pajak --"
              />
            </div>
          )}"""

    new_ui = """"""
    
    if old_ui in content:
        content = content.replace(old_ui, new_ui)
        print("UI Blocks removed.")
    else:
        print("UI Blocks NOT FOUND!")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("DONE PAYMENT REFACTORING!")

if __name__ == "__main__":
    main()
