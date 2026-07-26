from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PurchaseOrderItemBase(BaseModel):
    description: str
    quantity: float
    unit_price: float
    total_price: float

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItem(PurchaseOrderItemBase):
    id: str
    purchase_order_id: str
    
    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    po_number: str
    vendor_id: str
    project_id: Optional[str] = None
    date: str
    status: str = "Draft"
    total_amount: float = 0.0
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrder(PurchaseOrderBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[PurchaseOrderItem] = []
    
    # We could include vendor name and project name in the response for convenience
    vendor_name: Optional[str] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True
