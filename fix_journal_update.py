import sys

def main():
    file_path = "backend/api/routes/finance.py"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    old_logic = """    # Sync linked journal lines project_id
    linked_journals = db.query(Journal).filter(Journal.ref_id == invoice_id).all()
    for j in linked_journals:
        for line in j.lines:
            line.project_id = db_invoice.project_id"""

    new_logic = """    # Sync linked journal lines
    linked_journals = db.query(Journal).filter(Journal.ref_id == invoice_id).all()
    for j in linked_journals:
        if j.ref_type == 'AR_Invoice':
            # This is the accrual journal. We must reconstruct its lines to reflect new amounts/accounts.
            # Delete old lines
            db.query(JournalLine).filter(JournalLine.journal_id == j.id).delete()
            
            # Create new lines
            new_lines = [
                JournalLine(
                    journal_id=j.id,
                    account_id=db_invoice.ar_account_id,
                    project_id=db_invoice.project_id,
                    description=f"Piutang Tagihan AR {db_invoice.invoice_number}",
                    debit=db_invoice.total_amount,
                    credit=0
                ),
                JournalLine(
                    journal_id=j.id,
                    account_id=db_invoice.revenue_account_id,
                    project_id=db_invoice.project_id,
                    description=f"Pendapatan Tagihan AR {db_invoice.invoice_number}",
                    debit=0,
                    credit=db_invoice.amount
                )
            ]
            if db_invoice.tax_amount > 0 and db_invoice.tax_account_id:
                new_lines.append(
                    JournalLine(
                        journal_id=j.id,
                        account_id=db_invoice.tax_account_id,
                        project_id=db_invoice.project_id,
                        description=f"PPN Keluaran AR {db_invoice.invoice_number}",
                        debit=0,
                        credit=db_invoice.tax_amount
                    )
                )
            db.add_all(new_lines)
            
            # Ensure the journal date matches invoice date
            j.date = db_invoice.date
            j.description = f"Auto-Journal: Pengakuan Piutang {db_invoice.invoice_number}"
            
        else:
            # For other journals (like payment receipts), just sync the project_id
            for line in j.lines:
                line.project_id = db_invoice.project_id"""

    if old_logic in content:
        content = content.replace(old_logic, new_logic)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Backend updated successfully.")
    else:
        print("Error: Could not find the old logic block in finance.py")

if __name__ == "__main__":
    main()
