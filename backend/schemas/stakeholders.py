from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# ====================
# Customer
# ====================
class CustomerBase(BaseModel):
    code: str
    name: str
    npwp: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    bank_id: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    term_of_payment: Optional[str] = None
    receivable_account_id: Optional[str] = None
    is_active: bool = True

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    npwp: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    bank_id: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    term_of_payment: Optional[str] = None
    receivable_account_id: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerResponse(CustomerBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ====================
# Vendor
# ====================
class VendorBase(BaseModel):
    code: str
    name: str
    npwp: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    bank_id: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    term_of_payment: Optional[str] = None
    payable_account_id: Optional[str] = None
    is_active: bool = True

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    npwp: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None
    bank_id: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    term_of_payment: Optional[str] = None
    payable_account_id: Optional[str] = None
    is_active: Optional[bool] = None

class VendorResponse(VendorBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
