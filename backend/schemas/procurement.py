from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PurchaseOrderItemBase(BaseModel):
    item_code: Optional[str] = None
    description: str
    quantity: float
    unit: Optional[str] = None
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
    category: Optional[str] = "Jasa Subkontraktor"
    payment_terms: Optional[str] = "Net 30 Hari"
    due_date: Optional[str] = None
    account_id: Optional[str] = None
    subtotal: Optional[float] = 0.0
    tax_rate: Optional[float] = 0.0
    tax_amount: Optional[float] = 0.0
    total_amount: float = 0.0
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrder(PurchaseOrderBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[PurchaseOrderItem] = []
    
    # Enriched fields for vendor, project, and accounting
    vendor_name: Optional[str] = None
    vendor_code: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_contact: Optional[str] = None
    vendor_phone: Optional[str] = None
    vendor_npwp: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    ap_invoice_id: Optional[str] = None
    journal_id: Optional[str] = None
    ap_invoice_number: Optional[str] = None
    ap_status: Optional[str] = None # Unpaid, Partial, Paid
    amount_paid: Optional[float] = 0.0

    class Config:
        from_attributes = True
