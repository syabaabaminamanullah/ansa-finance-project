from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('sqlite:///backend/ansa_erp.db')
df = pd.read_sql("SELECT name FROM sqlite_master WHERE type='table'", engine)
print(df)
