import requests
import json
import difflib

# PDF Transactions
trx_list = [
    {"date": "2026-09-01", "name": "AGUS SUWARDI", "amount": 9000000, "desc": "IKPT - Washbore Project (Gaji tim bor bulan Agustus setelah dipotong kasbon)"},
    {"date": "2026-09-01", "name": "RISKA PRAWITA", "amount": 5518629, "desc": "IKPT - Washbore Project (Gaji bulan Agustus)"},
    {"date": "2026-09-01", "name": "HENDRA RAMANDA", "amount": 5806452, "desc": "IKPT - Washbore Project (Gaji bulan Agustus)"},
    {"date": "2026-09-01", "name": "SYABAAB AMIN AMANULLAH", "amount": 4502500, "desc": "HO - Gaji bulan Agustus"},
    {"date": "2026-09-01", "name": "DUGIE GENTRI NUGROHO", "amount": 16006500, "desc": "IKPT - Washbore Project (Gaji bulan Agustus)"},
    {"date": "2026-09-04", "name": "HENDRA RAMANDA", "amount": 1000000, "desc": "IKPT - Washbore Project (Pengganti MCU)"},
    {"date": "2026-09-04", "name": "RISKA PRAWITA", "amount": 25002500, "desc": "IKPT - Washbore Project (Operasional 2-12 september)"},
    {"date": "2026-09-05", "name": "ASEP HAKIM", "amount": 15000000, "desc": "Geolistrik Project (Pembayaran Alat Geolistrik)"},
    {"date": "2026-09-06", "name": "DIAH WULANDARI", "amount": 25002500, "desc": "IKPT - Washbore Project (Pelunasan DP Rig)"},
    {"date": "2026-09-12", "name": "RISKA PRAWITA", "amount": 30502500, "desc": "IKPT -Washbore Project (Ops 13-22 Sept 2026)"},
    {"date": "2026-09-22", "name": "RISKA PRAWITA", "amount": 43102500, "desc": "IKPT - Washbore Project (Ops 22 sept - 02 okt)"},
    {"date": "2026-09-26", "name": "HARTAWI RISKHA", "amount": 6473167, "desc": "Volta - Geolistrik (Fee Ops)"},
    {"date": "2026-09-26", "name": "AGUS SUWARDI", "amount": 5000000, "desc": "Volta - Geolistrik (Fee Ops)"},
    {"date": "2026-09-26", "name": "SETYO MARDANI", "amount": 7804019, "desc": "Volta Geolistrik - (Ops dan Tiket)"},
    {"date": "2026-09-26", "name": "ASEP HAKIM", "amount": 14400000, "desc": "Volta - Geolistrik (Pelunasan alat dan sewa mobil)"},
    {"date": "2026-09-26", "name": "REAN AULIA RAHMAN", "amount": 8573167, "desc": "Volta - Geolistrik (Fee Ops)"},
    {"date": "2026-09-28", "name": "AGUS SUWARDI", "amount": 700000, "desc": "IKPT - Washbore Project (Ops site visit)"},
    {"date": "2026-09-28", "name": "SETYO MARDANI", "amount": 1251890, "desc": "IKPT - Washbore Project (Tiket visit Agus)"},
]

# Fetch from Live API
try:
    res_journals = requests.get('https://lode.annsa.site/api/v1/finance/journals?limit=1000')
    journals = res_journals.json()
except Exception as e:
    print("Error fetching journals:", e)
    journals = []

try:
    res_expenses = requests.get('https://lode.annsa.site/api/v1/finance/expenses?limit=1000')
    expenses = res_expenses.json()
except Exception as e:
    print("Error fetching expenses:", e)
    expenses = []

print(f"Fetched {len(journals)} journals and {len(expenses)} expenses.")

found_trxs = []
missing_trxs = []

def match_transaction(t, journals, expenses):
    target_amount = t['amount']
    # A transaction might be matched slightly differently (e.g. ignoring admin fee, or admin fee separate). Let's check both total amount and nominal amount.
    target_nominal = t['amount']
    # Admin fee could be 2500 or 6500. So we check amount +/- 10000
    
    # 1. Search in Journals
    for j in journals:
        j_amount = sum(line.get('debit', 0) for line in j.get('lines', []))
        if j_amount > 0 and abs(j_amount - target_amount) <= 10000:
            desc = (j.get('description', '') or '').lower()
            name_lower = t['name'].lower()
            if name_lower in desc or t['date'] in j.get('date', ''):
                return {"type": "Journal", "matched_data": j}
                
    # 2. Search in Expenses
    for e in expenses:
        e_amount = e.get('total_amount', 0)
        if e_amount > 0 and abs(e_amount - target_amount) <= 10000:
            desc = (e.get('description', '') or '').lower()
            name_lower = t['name'].lower()
            if name_lower in desc or t['date'] in e.get('expense_date', ''):
                return {"type": "Expense", "matched_data": e}
                
    return None

for t in trx_list:
    match = match_transaction(t, journals, expenses)
    if match:
        found_trxs.append({"pdf": t, "db": match})
    else:
        missing_trxs.append(t)

print(f"\n--- FOUND ({len(found_trxs)}) ---")
for f in found_trxs:
    pdf = f['pdf']
    db = f['db']
    db_desc = db['matched_data'].get('description', '')
    db_date = db['matched_data'].get('date') or db['matched_data'].get('expense_date')
    print(f"[V] {pdf['date']} | {pdf['name']} | {pdf['amount']}  -> MATCHED WITH {db['type']} | {db_date} | {db_desc}")

print(f"\n--- MISSING ({len(missing_trxs)}) ---")
for m in missing_trxs:
    print(f"[X] {m['date']} | {m['name']} | {m['amount']} | {m['desc']}")

