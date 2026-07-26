from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FixedAssetBase(BaseModel):
    asset_number: str
    name: str
    description: Optional[str] = None
    asset_type: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: float = 0.0
    salvage_value: float = 0.0
    useful_life_years: int = 0
    accumulated_depreciation: float = 0.0
    book_value: float = 0.0
    status: str = 'Active'
    linked_rig_id: Optional[str] = None
    linked_equipment_id: Optional[str] = None
    asset_account_id: Optional[str] = None
    accumulated_depreciation_account_id: Optional[str] = None
    depreciation_expense_account_id: Optional[str] = None

class FixedAssetCreate(FixedAssetBase):
    pass

class FixedAsset(FixedAssetBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
