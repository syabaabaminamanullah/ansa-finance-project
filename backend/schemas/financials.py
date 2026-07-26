from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# ====================
# Chart of Account
# ====================
class COABase(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    normal_balance: str
    is_active: bool = True

class COACreate(COABase):
    pass

class COAUpdate(BaseModel):
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    normal_balance: Optional[str] = None
    is_active: Optional[bool] = None

class COAResponse(COABase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ====================
# Tax Code
# ====================
class TaxCodeBase(BaseModel):
    code: str
    name: str
    rate: str
    description: Optional[str] = None
    is_active: bool = True

class TaxCodeCreate(TaxCodeBase):
    pass

class TaxCodeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    rate: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TaxCodeResponse(TaxCodeBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ====================
# Currency
# ====================
class CurrencyBase(BaseModel):
    code: str
    name: str
    symbol: str
    is_active: bool = True

class CurrencyCreate(CurrencyBase):
    pass

class CurrencyUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    symbol: Optional[str] = None
    is_active: Optional[bool] = None

class CurrencyResponse(CurrencyBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ====================
# Bank
# ====================
class BankBase(BaseModel):
    code: str
    name: str
    account_number: str
    account_name: str
    currency_id: Optional[str] = None
    is_active: bool = True

class BankCreate(BankBase):
    pass

class BankUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    currency_id: Optional[str] = None
    is_active: Optional[bool] = None

class BankResponse(BankBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    currency: Optional[CurrencyResponse] = None
    model_config = ConfigDict(from_attributes=True)
