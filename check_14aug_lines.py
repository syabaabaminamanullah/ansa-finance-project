import sys
sys.path.insert(0, 'backend')
from db.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("""
    SELECT j.date, j.journal_number, j.description, jl.project_id, p.code as pcode
    FROM journals j
    JOIN journal_lines jl ON j.id = jl.journal_id
    LEFT JOIN projects p ON p.id = jl.project_id
    WHERE j.date = '2026-08-14'
""")).fetchall()

for r in set(res):
    print(r)
