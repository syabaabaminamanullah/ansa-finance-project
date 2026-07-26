from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# ====================
# Company Schemas
# ====================
class CompanyBase(BaseModel):
    code: str
    name: str
    address: Optional[str] = None
    tax_id: Optional[str] = None
    is_active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    code: Optional[str] = None
    name: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# ====================
# Branch Schemas
# ====================
class BranchBase(BaseModel):
    company_id: str
    code: str
    name: str
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class BranchResponse(BranchBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    company: Optional[CompanyResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ====================
# Cost Center Schemas
# ====================
class CostCenterBase(BaseModel):
    branch_id: str
    code: str
    name: str
    is_active: bool = True

class CostCenterCreate(CostCenterBase):
    pass

class CostCenterUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class CostCenterResponse(CostCenterBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    branch: Optional[BranchResponse] = None

    model_config = ConfigDict(from_attributes=True)
