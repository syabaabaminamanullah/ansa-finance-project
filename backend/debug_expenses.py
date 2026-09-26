import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres'

# Simulate what get_expenses does
from db.database import SessionLocal
from db.models import Expense, Journal
from schemas.finance import ExpenseResponse

db = SessionLocal()
try:
    expenses = db.query(Expense).order_by(Expense.date.desc()).limit(2).all()
    print(f"Found {len(expenses)} expenses")
    for exp in expenses:
        print(f"  - {exp.expense_number}: attachment_path={exp.attachment_path}, attachment_path_2={exp.attachment_path_2}")
    
    # Now try to build ExpenseResponse
    exp = expenses[0]
    exp_dict = {c.name: getattr(exp, c.name) for c in exp.__table__.columns}
    print(f"\nexp_dict keys: {list(exp_dict.keys())}")
    
    # Check journal query
    journals = db.query(Journal.ref_id, Journal.status, Journal.journal_number, Journal.attachment_path, Journal.attachment_path_2).filter(
        Journal.ref_id == exp.id,
        Journal.ref_type == "Expense"
    ).all()
    print(f"Found {len(journals)} journals for expense {exp.expense_number}")
    
    # Try creating response
    exp_dict['journal_status'] = 'Draft'
    exp_dict['journal_number'] = None
    try:
        resp = ExpenseResponse(**exp_dict)
        print(f"ExpenseResponse OK: {resp.expense_number}")
    except Exception as e:
        print(f"ExpenseResponse ERROR: {e}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
