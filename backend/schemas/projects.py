from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# ====================
# Activity
# ====================
class ActivityBase(BaseModel):
    work_package_id: str
    code: str
    name: str
    is_active: bool = True

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class ActivityResponse(ActivityBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ====================
# Work Package
# ====================
class WorkPackageBase(BaseModel):
    area_id: str
    code: str
    name: str
    is_active: bool = True

class WorkPackageCreate(WorkPackageBase):
    pass

class WorkPackageUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class WorkPackageResponse(WorkPackageBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    activities: List[ActivityResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ====================
# Area
# ====================
class AreaBase(BaseModel):
    project_id: str
    code: str
    name: str
    is_active: bool = True

class AreaCreate(AreaBase):
    pass

class AreaUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class AreaResponse(AreaBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    work_packages: List[WorkPackageResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ====================
# Project
# ====================
class ProjectBase(BaseModel):
    company_id: str
    customer_id: Optional[str] = None
    code: str
    name: str
    status: str = "Planning"
    contract_value: Optional[str] = None
    contract_value_usd: float = 0.0
    contract_value_idr: float = 0.0
    is_active: bool = True

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    company_id: Optional[str] = None
    customer_id: Optional[str] = None
    code: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    contract_value: Optional[str] = None
    contract_value_usd: Optional[float] = None
    contract_value_idr: Optional[float] = None
    is_active: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    areas: List[AreaResponse] = []
    model_config = ConfigDict(from_attributes=True)
