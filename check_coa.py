from sqlalchemy import create_engine
import pandas as pd
engine = create_engine('sqlite:///backend/ansa_erp.db')
df = pd.read_sql("SELECT account_code, account_name, account_type FROM chart_of_accounts WHERE account_name LIKE '%Pajak%' OR account_name LIKE '%PPh%' OR account_name LIKE '%PPN%' OR account_name LIKE '%Piutang%' OR account_name LIKE '%Utang%' OR account_name LIKE '%Hutang%' OR account_name LIKE '%Kas%' OR account_name LIKE '%Bank%' OR account_name LIKE '%Pendapatan%' OR account_name LIKE '%Biaya%'", engine)
print(df.to_string())
