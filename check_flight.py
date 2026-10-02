import sys
sys.path.insert(0, 'backend')
from db.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("""
    SELECT expense_number, date, description, status, amount
    FROM expenses
    WHERE description LIKE '%Flight Dugie%'
""")).fetchall()
print(res)
