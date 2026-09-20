import sqlite3
import shutil
import datetime
import os
import re

DB_PATH = 'backend/ansa_erp.db'

def run_migration():
    # 1. Automatic Timestamped Backup
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"backend/ansa_erp.db.backup_pre_migration_{ts}"
    shutil.copy2(DB_PATH, backup_path)
    print(f"[*] Backup created: {backup_path} ({os.path.getsize(backup_path)} bytes)")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Verify initial snapshot
    c.execute("SELECT sum(debit), sum(credit) FROM journal_lines;")
    pre_debit, pre_credit = c.fetchone()
    c.execute("SELECT sum(amount) FROM expenses;")
    pre_exp = c.fetchone()[0]

    print(f"[*] Pre-migration state:")
    print(f"    Total Debit : {pre_debit:,.2f}")
    print(f"    Total Credit: {pre_credit:,.2f}")
    print(f"    Total Expenses: {pre_exp:,.2f}")

    # 2. Renumber Expenses chronologically
    c.execute("SELECT id, expense_number, date, created_at, description FROM expenses ORDER BY date ASC, id ASC;")
    expenses = c.fetchall()

    exp_map = {}
    exp_counters = {}

    for exp_id, old_num, date_str, created_at, desc in expenses:
        parts = date_str.split('-')
        yymm = f"{parts[0][-2:]}{parts[1]}"
        exp_counters[yymm] = exp_counters.get(yymm, 0) + 1
        new_num = f"EXP-{yymm}-{exp_counters[yymm]:04d}"
        exp_map[exp_id] = {
            "old_num": old_num,
            "new_num": new_num,
            "date": date_str
        }
        c.execute("UPDATE expenses SET expense_number = ? WHERE id = ?;", (new_num, exp_id))

    print(f"[+] Migrated {len(expenses)} expenses to format EXP-YYMM-XXXX.")

    # 3. Renumber Journals chronologically
    c.execute("SELECT id, journal_number, date, ref_type, ref_id, description FROM journals ORDER BY date ASC, id ASC;")
    journals = c.fetchall()

    jv_counters = {}
    for j_id, old_jnum, date_str, ref_type, ref_id, desc in journals:
        parts = date_str.split('-')
        yymm = f"{parts[0][-2:]}{parts[1]}"
        jv_counters[yymm] = jv_counters.get(yymm, 0) + 1
        new_jnum = f"JV-{yymm}-{jv_counters[yymm]:04d}"

        new_desc = desc
        if ref_type == 'Expense' and ref_id and ref_id in exp_map:
            new_exp_num = exp_map[ref_id]["new_num"]
            old_exp_num = exp_map[ref_id]["old_num"]
            if old_exp_num in new_desc:
                new_desc = new_desc.replace(old_exp_num, new_exp_num)
            elif "Auto-journal for Expense" in new_desc:
                new_desc = re.sub(r'Auto-journal for Expense [^:]+:', f'Auto-journal for Expense {new_exp_num}:', new_desc)
            else:
                new_desc = f"Auto-journal for Expense {new_exp_num}: {new_desc}"

        c.execute("UPDATE journals SET journal_number = ?, description = ? WHERE id = ?;", (new_jnum, new_desc, j_id))

    print(f"[+] Migrated {len(journals)} journals to format JV-YYMM-XXXX.")

    conn.commit()

    # 4. Verify post-migration audit
    c.execute("SELECT sum(debit), sum(credit) FROM journal_lines;")
    post_debit, post_credit = c.fetchone()
    c.execute("SELECT sum(amount) FROM expenses;")
    post_exp = c.fetchone()[0]

    diff_debit = abs(post_debit - pre_debit)
    diff_credit = abs(post_credit - pre_credit)
    diff_exp = abs(post_exp - pre_exp)

    print(f"[*] Post-migration audit:")
    print(f"    Debit diff : {diff_debit}")
    print(f"    Credit diff: {diff_credit}")
    print(f"    Expense diff: {diff_exp}")

    if diff_debit != 0 or diff_credit != 0 or diff_exp != 0:
        conn.rollback()
        conn.close()
        shutil.copy2(backup_path, DB_PATH)
        raise RuntimeError("Audit failed! Rolled back database to previous backup.")

    conn.close()
    print("[SUCCESS] All journals and expenses cleanly renumbered without any financial discrepancies!")

if __name__ == '__main__':
    run_migration()
