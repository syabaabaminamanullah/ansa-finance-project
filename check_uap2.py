from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('sqlite:///backend/ansa_erp.db')
df = pd.read_sql("SELECT * FROM purchase_orders WHERE LOWER(vendor_name) LIKE '%uap%' OR LOWER(description) LIKE '%uap%' OR LOWER(description) LIKE '%rebar%'", engine)
for _, row in df.iterrows():
    print(dict(row))
