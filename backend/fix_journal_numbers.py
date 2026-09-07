import sqlite3

conn = sqlite3.connect('ansa_erp.db')
c = conn.cursor()

def generate_num(date_str, project_id, tx_type):
    parts = date_str.split('-')
    formatted_date = f"{parts[2]}{parts[1]}{parts[0][-2:]}" if len(parts) == 3 else "000000"
    
    project_code = "OH"
    if project_id:
        c.execute("SELECT code FROM projects WHERE id = ?;", (project_id,))
        p = c.fetchone()
        if p and p[0]:
            project_code = p[0]
            
    prefix = f"{formatted_date}-{project_code}-{tx_type}-"
    c.execute("SELECT journal_number FROM journals WHERE journal_number LIKE ?;", (f"{prefix}%",))
    existing = [r[0] for r in c.fetchall()]
    
    max_seq = 0
    for val in existing:
        try:
            seq = int(val.split('-')[-1])
            if seq > max_seq: max_seq = seq
        except: pass
        
    return f"{prefix}{max_seq + 1:03d}"

# Specifically fix EXP-30365 and EXP-13138
c.execute("""
    SELECT j.id, j.journal_number, j.date, j.ref_type, jl.project_id, j.description
    FROM journals j
    JOIN journal_lines jl ON j.id = jl.journal_id
    WHERE j.description LIKE '%EXP-30365%' OR j.description LIKE '%EXP-13138%'
    GROUP BY j.id
""")
journals_to_fix = c.fetchall()

for j_id, j_num, j_date, ref_type, p_id, desc in journals_to_fix:
    tx_type = "EXP"
    new_num = generate_num(j_date, p_id, tx_type)
    print(f"Updating {j_num} -> {new_num} for {desc[:40]}")
    c.execute("UPDATE journals SET journal_number = ? WHERE id = ?;", (new_num, j_id))

conn.commit()
conn.close()
print("Successfully fixed target journal numbers!")
