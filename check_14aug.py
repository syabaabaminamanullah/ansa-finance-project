import sys
sys.path.insert(0, 'backend')
from db.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT date, journal_number, description FROM journals WHERE date = '2026-08-14'")).fetchall()
print('Journals on 2026-08-14:')
for r in res:
    print(r)
