import os, sys
os.environ['DATABASE_URL'] = 'postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres'

# Test all the endpoints that are failing
from db.database import SessionLocal
db = SessionLocal()

# Test 1: expenses
try:
    from api.routes.finance import get_expenses
    result = get_expenses(db=db, limit=1)
    print(f"OK get_expenses: {len(result)} items")
except Exception as e:
    print(f"FAIL get_expenses: {e}")

# Test 2: journals  
try:
    from api.routes.finance import get_journals
    result = get_journals(db=db, limit=1)
    print(f"OK get_journals: {len(result)} items")
except Exception as e:
    print(f"FAIL get_journals: {e}")

# Test 3: all journal entries
try:
    from api.routes.finance import get_all_journal_entries
    result = get_all_journal_entries(db=db, limit=1)
    print(f"OK get_all_journal_entries: {len(result)} items")
except Exception as e:
    print(f"FAIL get_all_journal_entries: {e}")

# Test 4: ledger / COA
try:
    from api.routes.finance import get_chart_of_accounts
    result = get_chart_of_accounts(db=db)
    print(f"OK get_chart_of_accounts: {len(result)} items")
except Exception as e:
    print(f"FAIL get_chart_of_accounts: {e}")

# Test 5: dashboard  
try:
    from api.routes.finance import get_dashboard_data
    result = get_dashboard_data(db=db)
    print(f"OK get_dashboard_data")
except Exception as e:
    print(f"FAIL get_dashboard_data: {e}")

db.close()
print("\nAll endpoint tests done.")
