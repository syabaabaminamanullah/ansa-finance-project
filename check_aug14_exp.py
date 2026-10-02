import sys
sys.path.insert(0, 'backend')
from db.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("""
    SELECT expense_number, date, description
    FROM expenses
    WHERE date = '2026-08-14' OR id IN (
        SELECT ref_id FROM journals WHERE date = '2026-08-14' AND ref_type = 'expense'
    )
""")).fetchall()

for r in res:
    print(r)
