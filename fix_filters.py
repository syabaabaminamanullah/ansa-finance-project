import sys

def main():
    file_path = "frontend/src/modules/finance/pages/ArInvoicePage.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    old_filters = """  const bankAccounts = coas.filter(c => c.account_type.toLowerCase() === 'asset');
    const arAccounts = coas.filter(c => c.account_type.toLowerCase() === 'asset');
  const revAccounts = coas.filter(c => c.account_type.toLowerCase() === 'revenue');
  const taxAccounts = coas.filter(c => c.account_type.toLowerCase() === 'liability');"""

    new_filters = """  const bankAccounts = coas.filter(c => c.account_type.toLowerCase().includes('asset'));
  const arAccounts = coas.filter(c => c.account_type.toLowerCase().includes('asset'));
  const revAccounts = coas.filter(c => c.account_type.toLowerCase().includes('revenue'));
  const taxAccounts = coas.filter(c => c.account_type.toLowerCase().includes('liabilit'));"""

    if old_filters in content:
        content = content.replace(old_filters, new_filters)
        print("Filters fixed.")
    else:
        # try line by line
        content = content.replace("coas.filter(c => c.account_type.toLowerCase() === 'asset')", "coas.filter(c => c.account_type.toLowerCase().includes('asset'))")
        content = content.replace("coas.filter(c => c.account_type.toLowerCase() === 'revenue')", "coas.filter(c => c.account_type.toLowerCase().includes('revenue'))")
        content = content.replace("coas.filter(c => c.account_type.toLowerCase() === 'liability')", "coas.filter(c => c.account_type.toLowerCase().includes('liabilit'))")
        print("Filters fixed line by line.")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    main()
