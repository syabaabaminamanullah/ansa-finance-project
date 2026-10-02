import requests
import json
from datetime import datetime

base_url = 'https://lode.annsa.site/api/v1'

# Fetch lookups
coas = requests.get(base_url + '/master-data/financials/coas').json()
coa_map = {c['id']: c['account_name'] for c in coas}

projects = requests.get(base_url + '/master-data/project-structure/projects').json()
proj_map = {p['id']: p.get('name', 'Unknown') for p in projects}

# Fetch Expenses
expenses = requests.get(base_url + '/finance/expenses?limit=10000').json()
# Fetch Journals
journals = requests.get(base_url + '/finance/journals?limit=10000').json()

# Generate Markdown
md = """---
Summary: Daftar seluruh transaksi keuangan untuk rekapitulasi.
UserFacing: true
RequestFeedback: false
---
# Daftar Seluruh Transaksi (Pengeluaran & Mutasi)

Di bawah ini adalah rekapitulasi seluruh pengeluaran (Expenses) dan jurnal mutasi kas yang ada di dalam database web app Anda hingga hari ini.

## 1. Transaksi Pengeluaran (Expenses)

| Tanggal | Deskripsi Lengkap | Project | Bank Pembayar | Nominal (Rp) | Admin (Rp) | Total (Rp) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""

# Sort expenses by date
expenses.sort(key=lambda x: (x.get('date') or x.get('expense_date', '2000-01-01'), x.get('created_at', '')))

for e in expenses:
    date = e.get('date') or e.get('expense_date', '')
    desc = e.get('description', '-').replace('\n', ' ')
    proj = proj_map.get(e.get('project_id'), '-')
    bank = coa_map.get(e.get('payment_account_id'), '-')
    
    amount = e.get('amount') or e.get('total_amount', 0)
    admin = e.get('admin_fee_amount') or e.get('admin_fee', 0)
    total = amount + admin
    
    # Formatting
    amount_str = f"{amount:,.0f}".replace(',', '.')
    admin_str = f"{admin:,.0f}".replace(',', '.')
    total_str = f"{total:,.0f}".replace(',', '.')
    
    md += f"| {date} | {desc} | {proj} | {bank} | {amount_str} | {admin_str} | {total_str} |\n"


md += "\n## 2. Mutasi Kas & Saldo Awal (Jurnal Manual)\n\n"
md += "> *Catatan: Tabel ini menampilkan jurnal yang **BUKAN** berasal dari pengeluaran otomatis di atas (contoh: pemindahan dana antar bank, saldo awal, atau penyesuaian manual).* \n\n"
md += "| Tanggal | No. Jurnal | Deskripsi | Total Debit (Rp) | Total Kredit (Rp) |\n"
md += "| :--- | :--- | :--- | :--- | :--- |\n"

journals.sort(key=lambda x: (x.get('date', '2000-01-01'), x.get('created_at', '')))
for j in journals:
    desc = j.get('description', '')
    if "Auto-journal for Expense" not in desc:
        date = j.get('date', '')
        no = j.get('journal_number', '')
        desc_clean = desc.replace('\n', ' ') if desc else '-'
        total_debit = sum(l.get('debit', 0) for l in j.get('lines', []))
        total_credit = sum(l.get('credit', 0) for l in j.get('lines', []))
        
        debit_str = f"{total_debit:,.0f}".replace(',', '.')
        credit_str = f"{total_credit:,.0f}".replace(',', '.')
        
        md += f"| {date} | {no} | {desc_clean} | {debit_str} | {credit_str} |\n"

with open(r'C:\Users\Hi\.gemini\antigravity\brain\7af03532-241b-4520-a00b-1af9d06dfc86\Daftar_Transaksi_Keseluruhan.md', 'w', encoding='utf-8') as f:
    f.write(md)

print("Markdown generated!")
