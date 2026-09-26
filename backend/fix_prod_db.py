import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres'
from sqlalchemy import create_engine, text

engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    # Add missing attachment_path to expenses table
    try:
        conn.execute(text("ALTER TABLE expenses ADD COLUMN attachment_path VARCHAR"))
        conn.commit()
        print("SUCCESS: Added attachment_path to expenses")
    except Exception as e:
        conn.rollback()
        print(f"attachment_path on expenses: {e}")

    # Verify both columns exist now
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses' AND column_name LIKE 'attachment%' ORDER BY column_name")).fetchall()
    print('expenses attachment columns:', [r[0] for r in result])

    result2 = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'journals' AND column_name LIKE 'attachment%' ORDER BY column_name")).fetchall()
    print('journals attachment columns:', [r[0] for r in result2])
    
    # Quick sanity test
    try:
        r = conn.execute(text("SELECT id, attachment_path, attachment_path_2 FROM expenses LIMIT 1")).fetchall()
        print("expenses query OK:", r)
    except Exception as e:
        print("expenses query FAILED:", e)
        
    try:
        r = conn.execute(text("SELECT id, attachment_path, attachment_path_2 FROM journals LIMIT 1")).fetchall()
        print("journals query OK:", r)
    except Exception as e:
        print("journals query FAILED:", e)

print("\nDone! The backend should work now.")
