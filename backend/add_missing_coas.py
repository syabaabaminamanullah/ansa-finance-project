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

missing_coas = [
    # Accumulated Depreciations
    {"account_code": "12310", "account_name": "Akum. Penyusutan Peralatan Lab", "account_type": "Asset", "normal_balance": "Credit"},
    {"account_code": "12410", "account_name": "Akum. Penyusutan Peralatan Kantor", "account_type": "Asset", "normal_balance": "Credit"},
    
    # Payables
    {"account_code": "21210", "account_name": "Hutang Gaji", "account_type": "Current Liability", "normal_balance": "Credit"},
    {"account_code": "21220", "account_name": "Hutang BPJS", "account_type": "Current Liability", "normal_balance": "Credit"},
    
    # Project Expenses
    {"account_code": "51751", "account_name": "Biaya Asuransi Proyek (CAR)", "account_type": "Expense", "normal_balance": "Debit"},
]

for coa_data in missing_coas:
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

db.commit()
print("Missing COAs added/updated successfully.")
