import sys
import uuid
import os
sys.path.append(os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import ChartOfAccount

DATABASE_URL = "postgresql://postgres.fwacrmkszcirrddvygpq:5Naopatx17!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

tax_coas = [
    # Asset
    {"account_code": "11601", "account_name": "PPN Masukan (VAT In)", "account_type": "Current Asset", "normal_balance": "Debit"},
    
    # Liability
    {"account_code": "21201", "account_name": "PPN Keluaran (VAT Out)", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21202", "account_name": "Hutang PPh Pasal 21", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21203", "account_name": "Hutang PPh Pasal 23", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21204", "account_name": "Hutang PPh Pasal 4 ayat (2) Final", "account_type": "Current Liability", "normal_balance": "Credit"},
    
    # Expense
    {"account_code": "81100", "account_name": "Beban Pajak Penghasilan Badan", "account_type": "Expense", "normal_balance": "Debit"}
]

for coa_data in tax_coas:
    existing = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == coa_data["account_code"]).first()
    if existing:
        existing.account_name = coa_data["account_name"]
        existing.account_type = coa_data["account_type"]
        existing.normal_balance = coa_data["normal_balance"]
    else:
        new_coa = ChartOfAccount(
            id=str(uuid.uuid4()),
            **coa_data
        )
        db.add(new_coa)

# Update existing 21200 to be general
existing_21200 = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == "21200").first()
if existing_21200:
    existing_21200.account_name = "Hutang Pajak (Lainnya)"

db.commit()
print("Tax COAs added/updated successfully.")
