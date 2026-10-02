from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('sqlite:///backend/ansa_erp.db')
df = pd.read_sql("SELECT po.id, po.po_number, po.total_amount, po.status, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE LOWER(v.name) LIKE '%uap%'", engine)
print("PO Data:")
print(df)
