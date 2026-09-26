import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres'
from sqlalchemy import create_engine, text

engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses' ORDER BY ordinal_position")).fetchall()
    print('expenses columns:', [r[0] for r in result])
    
    result2 = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'journals' ORDER BY ordinal_position")).fetchall()
    print('journals columns:', [r[0] for r in result2])
    
    # Quick test: can we actually query expenses?
    try:
        r = conn.execute(text("SELECT id, attachment_path, attachment_path_2 FROM expenses LIMIT 3")).fetchall()
        print('Sample expenses:', r)
    except Exception as e:
        print('ERROR querying expenses:', e)
    
    try:
        r = conn.execute(text("SELECT id, attachment_path, attachment_path_2 FROM journals LIMIT 3")).fetchall()
        print('Sample journals:', r)
    except Exception as e:
        print('ERROR querying journals:', e)
