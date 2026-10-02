import requests
from datetime import datetime

base_url = 'https://lode.annsa.site/api/v1'

coas = requests.get(base_url + '/master-data/financials/coas').json()
coa_map = {c['id']: c['account_name'] for c in coas}

projects = requests.get(base_url + '/master-data/project-structure/projects').json()
proj_map = {p['id']: p.get('name', 'Unknown') for p in projects}

expenses = requests.get(base_url + '/finance/expenses?limit=10000').json()
journals = requests.get(base_url + '/finance/journals?limit=10000').json()

html = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Seluruh Transaksi</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
        p.subtitle { text-align: center; font-style: italic; margin-top: 0; margin-bottom: 20px;}
        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 30px;}
        th, td { border: 1px solid #000; padding: 6px; text-align: left; vertical-align: top; }
        th { background-color: #f2f2f2; }
        .num { text-align: right; }
        .total-row { font-weight: bold; background-color: #e8e8e8; }
        .page-break { page-break-before: always; }
        @media print {
            body { margin: 0; }
            @page { size: landscape; }
        }
    </style>
</head>
<body>
    <h1>LAPORAN REKAPITULASI TRANSAKSI KEUANGAN</h1>
    <p class="subtitle">Dicetak pada: """ + datetime.now().strftime("%d %b %Y %H:%M") + """</p>
    
    <h2>1. Transaksi Pengeluaran (Keseluruhan)</h2>
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Project</th>
                <th>Bank Pembayar</th>
                <th class="num">Nominal (Rp)</th>
                <th class="num">Admin (Rp)</th>
                <th class="num">Total (Rp)</th>
            </tr>
        </thead>
        <tbody>
"""

expenses.sort(key=lambda x: (x.get('date') or x.get('expense_date', '2000-01-01'), x.get('created_at', '')))

grand_amount = 0
grand_admin = 0
grand_total = 0

for idx, e in enumerate(expenses):
    date = e.get('date') or e.get('expense_date', '')
    desc = e.get('description', '-').replace('\n', '<br>')
    proj_id = e.get('project_id')
    proj = proj_map.get(proj_id, '-') if proj_id else '-'
    bank = coa_map.get(e.get('payment_account_id'), '-')
    
    amount = e.get('amount') or e.get('total_amount', 0)
    admin = e.get('admin_fee_amount') or e.get('admin_fee', 0)
    total = amount + admin
    
    grand_amount += amount
    grand_admin += admin
    grand_total += total
    
    amount_str = f"{amount:,.0f}".replace(',', '.')
    admin_str = f"{admin:,.0f}".replace(',', '.')
    total_str = f"{total:,.0f}".replace(',', '.')
    
    html += f"<tr><td>{idx+1}</td><td>{date}</td><td>{desc}</td><td>{proj}</td><td>{bank}</td><td class='num'>{amount_str}</td><td class='num'>{admin_str}</td><td class='num'>{total_str}</td></tr>\n"

html += f"""
        <tr class="total-row">
            <td colspan="5" style="text-align:right;">GRAND TOTAL PENGELUARAN</td>
            <td class="num">{grand_amount:,.0f}</td>
            <td class="num">{grand_admin:,.0f}</td>
            <td class="num">{grand_total:,.0f}</td>
        </tr>
        </tbody>
    </table>
"""
# Replace comma to dot for grand total
html = html.replace(f"{grand_amount:,.0f}", f"{grand_amount:,.0f}".replace(',', '.'))
html = html.replace(f"{grand_admin:,.0f}", f"{grand_admin:,.0f}".replace(',', '.'))
html = html.replace(f"{grand_total:,.0f}", f"{grand_total:,.0f}".replace(',', '.'))

# GROUP BY PROJECT
html += """<div class="page-break"></div>
    <h2>2. Rekapitulasi Pengeluaran Per Project</h2>
"""

# Grouping
proj_groups = {}
for e in expenses:
    proj_id = e.get('project_id')
    proj_name = proj_map.get(proj_id, 'Non-Project / Overhead') if proj_id else 'Non-Project / Overhead'
    if proj_name not in proj_groups:
        proj_groups[proj_name] = []
    proj_groups[proj_name].append(e)

for proj_name, proj_expenses in proj_groups.items():
    html += f"<h3>Project: {proj_name}</h3>\n"
    html += """
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Bank Pembayar</th>
                <th class="num">Nominal (Rp)</th>
                <th class="num">Admin (Rp)</th>
                <th class="num">Total (Rp)</th>
            </tr>
        </thead>
        <tbody>
"""
    p_amount = 0
    p_admin = 0
    p_total = 0
    for idx, e in enumerate(proj_expenses):
        date = e.get('date') or e.get('expense_date', '')
        desc = e.get('description', '-').replace('\n', '<br>')
        bank = coa_map.get(e.get('payment_account_id'), '-')
        amount = e.get('amount') or e.get('total_amount', 0)
        admin = e.get('admin_fee_amount') or e.get('admin_fee', 0)
        total = amount + admin
        
        p_amount += amount
        p_admin += admin
        p_total += total
        
        amount_str = f"{amount:,.0f}".replace(',', '.')
        admin_str = f"{admin:,.0f}".replace(',', '.')
        total_str = f"{total:,.0f}".replace(',', '.')
        html += f"<tr><td>{idx+1}</td><td>{date}</td><td>{desc}</td><td>{bank}</td><td class='num'>{amount_str}</td><td class='num'>{admin_str}</td><td class='num'>{total_str}</td></tr>\n"
    
    pa_str = f"{p_amount:,.0f}".replace(',', '.')
    padm_str = f"{p_admin:,.0f}".replace(',', '.')
    pt_str = f"{p_total:,.0f}".replace(',', '.')
    
    html += f"""
        <tr class="total-row">
            <td colspan="4" style="text-align:right;">SUBTOTAL {proj_name}</td>
            <td class="num">{pa_str}</td>
            <td class="num">{padm_str}</td>
            <td class="num">{pt_str}</td>
        </tr>
        </tbody>
    </table>
"""

html += """
    <div class="page-break"></div>
    <h2 style="margin-top:40px;">3. Mutasi Kas & Jurnal Manual</h2>
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>No. Jurnal</th>
                <th>Deskripsi</th>
                <th class="num">Debit (Rp)</th>
                <th class="num">Kredit (Rp)</th>
            </tr>
        </thead>
        <tbody>
"""

journals.sort(key=lambda x: (x.get('date', '2000-01-01'), x.get('created_at', '')))
j_idx = 1
for j in journals:
    desc = j.get('description', '')
    if "Auto-journal for Expense" not in desc:
        date = j.get('date', '')
        no = j.get('journal_number', '')
        desc_clean = desc.replace('\n', '<br>') if desc else '-'
        total_debit = sum(l.get('debit', 0) for l in j.get('lines', []))
        total_credit = sum(l.get('credit', 0) for l in j.get('lines', []))
        
        debit_str = f"{total_debit:,.0f}".replace(',', '.')
        credit_str = f"{total_credit:,.0f}".replace(',', '.')
        
        html += f"<tr><td>{j_idx}</td><td>{date}</td><td>{no}</td><td>{desc_clean}</td><td class='num'>{debit_str}</td><td class='num'>{credit_str}</td></tr>\n"
        j_idx += 1

html += """
        </tbody>
    </table>
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
"""

with open(r'd:\web dev - ansa\ansa-finance-project\Laporan_Transaksi.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML generated!")
