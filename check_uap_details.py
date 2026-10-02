from sqlalchemy import create_engine, text
import pandas as pd
engine = create_engine('postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres')
query = text("SELECT po.id, po.po_number, po.total_amount, po.tax_amount, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE v.name LIKE '%USAHA ANUGERAH%'")
with engine.connect() as conn:
    df = pd.read_sql(query, conn)
for _, row in df.iterrows():
    print(dict(row))
