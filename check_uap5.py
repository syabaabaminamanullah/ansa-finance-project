from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres')
df = pd.read_sql("SELECT po.id, po.po_number, po.total_amount, po.status, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE LOWER(v.name) LIKE '%uap%'", engine)
print("PO Data from Supabase:")
print(df)
