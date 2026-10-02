from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('sqlite:///backend/db/local_test.db')
df = pd.read_sql("SELECT * FROM purchase_orders WHERE vendor_name LIKE '%UAP%' OR vendor_name LIKE '%uap%'", engine)
for _, row in df.iterrows():
    print(dict(row))
