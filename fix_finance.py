import re

with open("backend/api/routes/finance.py", "r") as f:
    content = f.read()

# 1. Update get_expenses
old_get_expenses = r'''def get_expenses\(month: Optional\[str\] = None, skip: int = 0, limit: int = 1000, db: Session = Depends\(get_db\)\):
    query = db.query\(Expense\)
    if month:
        query = query.filter\(Expense.date.like\(f"\{month\}%"\)\)
    expenses = query.order_by\(Expense.date.desc\(\)\).offset\(skip\).limit\(limit\).all\(\)
    
    exp_ids = \[e.id for e in expenses\]
    journals = db.query\(Journal.ref_id, Journal.status, Journal.journal_number\).filter\(
        Journal.ref_id.in_\(exp_ids\),
        Journal.ref_type == "Expense"
    \).all\(\)
    journal_map = \{j\[0\]: \(j\[1\], j\[2\]\) for j in journals\}
    
    results = \[\]
    for exp in expenses:
        exp_dict = \{c.name: getattr\(exp, c.name\) for c in exp.__table__.columns\}
        j_info = journal_map.get\(exp.id\)
        exp_dict\['journal_status'\] = j_info\[0\] if j_info else "Draft"
        exp_dict\['journal_number'\] = j_info\[1\] if j_info else None
        results.append\(ExpenseResponse\(\*\*exp_dict\)\)
    return results'''

new_get_expenses = '''def get_expenses(month: Optional[str] = None, skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    query = db.query(Expense)
    if month:
        query = query.filter(Expense.date.like(f"{month}%"))
    expenses = query.order_by(Expense.date.desc()).offset(skip).limit(limit).all()
    
    exp_ids = [e.id for e in expenses]
    journals = db.query(Journal.ref_id, Journal.status, Journal.journal_number, Journal.attachment_path, Journal.attachment_path_2).filter(
        Journal.ref_id.in_(exp_ids),
        Journal.ref_type == "Expense"
    ).all()
    journal_map = {j[0]: j for j in journals}
    
    results = []
    for exp in expenses:
        exp_dict = {c.name: getattr(exp, c.name) for c in exp.__table__.columns}
        j_info = journal_map.get(exp.id)
        if j_info:
            exp_dict['journal_status'] = j_info[1]
            exp_dict['journal_number'] = j_info[2]
            if not exp_dict.get('attachment_path') and j_info[3]:
                exp_dict['attachment_path'] = j_info[3]
            if not exp_dict.get('attachment_path_2') and j_info[4]:
                exp_dict['attachment_path_2'] = j_info[4]
        else:
            exp_dict['journal_status'] = "Draft"
            exp_dict['journal_number'] = None
        results.append(ExpenseResponse(**exp_dict))
    return results'''

content = re.sub(old_get_expenses, new_get_expenses, content, count=1)

# 2. Update auto-journal creation in create_expense
old_create_expense = r'''    new_journal = Journal\(
        journal_number=journal_number,
        date=new_expense.date,
        description=f"Auto-journal for Expense \{new_expense.expense_number\}: \{new_expense.description\}",
        ref_type="Expense",
        ref_id=new_expense.id,
        status="Posted"
    \)'''

new_create_expense = '''    new_journal = Journal(
        journal_number=journal_number,
        date=new_expense.date,
        description=f"Auto-journal for Expense {new_expense.expense_number}: {new_expense.description}",
        ref_type="Expense",
        ref_id=new_expense.id,
        status="Posted",
        attachment_path=new_expense.attachment_path,
        attachment_path_2=new_expense.attachment_path_2
    )'''

content = re.sub(old_create_expense, new_create_expense, content, count=1)

with open("backend/api/routes/finance.py", "w") as f:
    f.write(content)
