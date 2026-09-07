from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# ====================
# Journal Line
# ====================
class JournalLineBase(BaseModel):
    account_id: str
    cost_center_id: Optional[str] = None
    project_id: Optional[str] = None
    project_rab_id: Optional[str] = None
    description: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0

class JournalLineCreate(JournalLineBase):
    pass

class JournalLineResponse(JournalLineBase):
    id: str
    journal_id: str
    model_config = ConfigDict(from_attributes=True)

# ====================
# Journal
# ====================
class JournalBase(BaseModel):
    journal_number: str
    date: str
    description: Optional[str] = None
    ref_type: Optional[str] = None
    ref_id: Optional[str] = None
    status: str = "Draft"

class JournalCreate(JournalBase):
    lines: List[JournalLineCreate]

class JournalUpdate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class JournalResponse(JournalBase):
    id: str
    created_at: datetime
    attachment_path: Optional[str] = None
    attachment_memo: Optional[str] = None
    lines: List[JournalLineResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ====================
# AP Invoice
# ====================
class ApInvoiceBase(BaseModel):
    invoice_number: str
    vendor_id: str
    project_id: Optional[str] = None
    project_rab_id: Optional[str] = None
    date: str
    due_date: str
    description: Optional[str] = None
    amount: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    status: str = "Draft"
    amount_paid: float = 0.0
    expense_account_id: Optional[str] = None
    tax_account_id: Optional[str] = None

class ApInvoiceCreate(ApInvoiceBase):
    pass

class ApInvoiceUpdate(BaseModel):
    date: Optional[str] = None
    due_date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    status: Optional[str] = None
    amount_paid: Optional[float] = None
    expense_account_id: Optional[str] = None
    tax_account_id: Optional[str] = None

class ApInvoiceResponse(ApInvoiceBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ====================
# AR Invoice
# ====================
class ArInvoiceBase(BaseModel):
    invoice_number: str
    customer_id: str
    project_id: Optional[str] = None
    date: str
    due_date: str
    description: Optional[str] = None
    amount: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0
    status: str = "Draft"
    amount_paid: float = 0.0
    revenue_account_id: Optional[str] = None
    tax_account_id: Optional[str] = None

class ArInvoiceCreate(ArInvoiceBase):
    pass

class ArInvoiceUpdate(BaseModel):
    date: Optional[str] = None
    due_date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    status: Optional[str] = None
    amount_paid: Optional[float] = None
    revenue_account_id: Optional[str] = None
    tax_account_id: Optional[str] = None

class ArInvoiceResponse(ArInvoiceBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ====================
# Payment Request
# ====================
class PaymentRequest(BaseModel):
    amount: float
    payment_account_id: str
    date: str
    description: str

# ====================
# Expense (Kas Kecil / Claim)
# ====================
class ExpenseBase(BaseModel):
    expense_number: str
    date: str
    employee_id: Optional[str] = None
    project_id: Optional[str] = None
    project_rab_id: Optional[str] = None
    description: str
    amount: float
    expense_account_id: str
    payment_account_id: str
    status: str = "Draft"
    admin_fee_amount: float = 0.0
    admin_fee_account_id: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    admin_fee_amount: Optional[float] = None
    admin_fee_account_id: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
