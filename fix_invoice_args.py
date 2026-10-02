import sys

def main():
    file_path = "frontend/src/modules/finance/pages/ArInvoicePage.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    old_args = """                  unit: row.unit || 'Lump Sump',
                  amount: Number(row.total_amount) || Number(row.amount) || 21090000,
                  prevBilledTotal: prevBilledTotal,"""

    new_args = """                  unit: row.unit || 'Lump Sump',
                  amount: Number(row.total_amount) || 21090000,
                  baseAmount: Number(row.amount) || 0,
                  taxAmount: Number(row.tax_amount) || 0,
                  ppnRate: (Number(row.amount) > 0 && Number(row.tax_amount) > 0) ? Math.round((Number(row.tax_amount) / Number(row.amount)) * 100) : 12,
                  prevBilledTotal: prevBilledTotal,"""

    if old_args in content:
        content = content.replace(old_args, new_args)
        print("ArInvoicePage updated.")
    else:
        print("ArInvoicePage target string NOT FOUND.")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    main()
