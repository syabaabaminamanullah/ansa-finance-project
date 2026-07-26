from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from db.database import get_db
from db.models import FixedAsset, Journal, JournalLine
from schemas.assets import FixedAsset as FixedAssetSchema, FixedAssetCreate
from datetime import datetime

router = APIRouter()

@router.get("/fixed-assets", response_model=List[FixedAssetSchema])
def get_fixed_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(FixedAsset).offset(skip).limit(limit).all()

@router.post("/fixed-assets", response_model=FixedAssetSchema)
def create_fixed_asset(asset: FixedAssetCreate, db: Session = Depends(get_db)):
    db_asset = FixedAsset(**asset.dict(), id=str(uuid.uuid4()))
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.post("/fixed-assets/run-depreciation")
def run_depreciation_engine(db: Session = Depends(get_db)):
    # 1. Get all active assets that still have book value
    assets = db.query(FixedAsset).filter(FixedAsset.status == 'Active').all()
    
    total_depreciated = 0
    today = datetime.now().strftime('%Y-%m-%d')
    journal_number = f"DEP-{datetime.now().strftime('%y%m')}-{uuid.uuid4().hex[:4].upper()}"
    
    # We will aggregate all depreciation into a single manual journal for the month
    journal_lines = []
    
    for asset in assets:
        if asset.useful_life_years <= 0 or asset.book_value <= asset.salvage_value:
            continue
            
        # Monthly straight-line depreciation
        dep_amount = (asset.purchase_price - asset.salvage_value) / (asset.useful_life_years * 12)
        
        # Don't depreciate more than book value
        if asset.book_value - dep_amount < asset.salvage_value:
            dep_amount = asset.book_value - asset.salvage_value
            
        if dep_amount <= 0:
            continue
            
        # Update Asset
        asset.accumulated_depreciation += dep_amount
        asset.book_value -= dep_amount
        total_depreciated += dep_amount
        
        # Build Journal Lines if accounts exist
        if asset.depreciation_expense_account_id and asset.accumulated_depreciation_account_id:
            # Debit: Depreciation Expense
            journal_lines.append({
                "account_id": asset.depreciation_expense_account_id,
                "description": f"Depreciation for {asset.asset_number} - {asset.name}",
                "debit": dep_amount,
                "credit": 0.0
            })
            # Credit: Accumulated Depreciation
            journal_lines.append({
                "account_id": asset.accumulated_depreciation_account_id,
                "description": f"Depreciation for {asset.asset_number} - {asset.name}",
                "debit": 0.0,
                "credit": dep_amount
            })
            
    if total_depreciated > 0 and journal_lines:
        # Create Journal
        new_journal = Journal(
            journal_number=journal_number,
            date=today,
            description=f"Auto-journal for Monthly Depreciation ({today})",
            ref_type="Depreciation",
            ref_id="BATCH",
            status="Posted"
        )
        db.add(new_journal)
        db.commit()
        db.refresh(new_journal)
        
        # Add Lines
        for line_data in journal_lines:
            line = JournalLine(
                journal_id=new_journal.id,
                account_id=line_data["account_id"],
                description=line_data["description"],
                debit=line_data["debit"],
                credit=line_data["credit"]
            )
            db.add(line)
        db.commit()
        
    return {"ok": True, "message": "Depreciation engine ran successfully", "total_depreciated": total_depreciated}
