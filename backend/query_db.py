import sqlite3
import pprint

conn = sqlite3.connect('ansa_erp.db')
c = conn.cursor()

# Find project ID for magnetic
c.execute("SELECT id, name, code FROM projects WHERE name LIKE '%magnetic%' COLLATE NOCASE;")
project = c.fetchone()

if project:
    p_id = project[0]
    print(f"Project: {project[1]} ({project[2]})\n")

    # Get all expense journal lines for this project
    c.execute("""
        SELECT j.date, j.journal_number, j.description, coa.account_code, coa.account_name, jl.debit
        FROM journal_lines jl
        JOIN chart_of_accounts coa ON jl.account_id = coa.id
        JOIN journals j ON jl.journal_id = j.id
        WHERE jl.project_id = ? AND coa.account_type = 'Expense' AND j.status = 'Posted'
        ORDER BY j.date ASC, j.journal_number ASC
    """, (p_id,))
    
    rows = c.fetchall()
    
    total = 0
    print(f"{'Tanggal':<12} | {'No. Transaksi':<35} | {'Deskripsi':<65} | {'Nominal (Rp)':>15}")
    print("-" * 135)
    for r in rows:
        date_str, num, desc, coa_code, coa_name, amt = r
        total += amt
        print(f"{date_str:<12} | {num:<35} | {desc[:63]:<65} | {amt:>15,.0f}")
    print("-" * 135)
    print(f"{'TOTAL PENGELUARAN':<117} | {total:>15,.0f}")
