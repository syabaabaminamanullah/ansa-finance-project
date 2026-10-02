from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('sqlite:///backend/ansa_erp.db')
df = pd.read_sql("SELECT po.*, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE LOWER(v.name) LIKE '%uap%' OR LOWER(po.description) LIKE '%uap%' OR LOWER(po.description) LIKE '%rebar%'", engine)
for _, row in df.iterrows():
    print(dict(row))
