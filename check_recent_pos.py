from sqlalchemy import create_engine, text
import pandas as pd
engine = create_engine('postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres')
query = text("SELECT po.id, po.po_number, po.total_amount, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id ORDER BY po.created_at DESC LIMIT 10")
with engine.connect() as conn:
    df = pd.read_sql(query, conn)
print("Recent POs:")
print(df)
