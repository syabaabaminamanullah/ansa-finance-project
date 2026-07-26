from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from schemas.organization import BranchResponse, CostCenterResponse

# ====================
# Employee Schemas
# ====================
class EmployeeBase(BaseModel):
    code: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[str] = None
    cost_center_id: Optional[str] = None
    crew_id: Optional[str] = None
    join_date: Optional[str] = None
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[str] = None
    cost_center_id: Optional[str] = None
    crew_id: Optional[str] = None
    join_date: Optional[str] = None
    is_active: Optional[bool] = None

class CrewShortResponse(BaseModel):
    id: str
    code: str
    name: str
    model_config = ConfigDict(from_attributes=True)

class EmployeeResponse(EmployeeBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    branch: Optional[BranchResponse] = None
    cost_center: Optional[CostCenterResponse] = None
    crew: Optional[CrewShortResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

# ====================
# Crew Schemas
# ====================
class CrewBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    leader_id: Optional[str] = None
    is_active: bool = True

class CrewCreate(CrewBase):
    member_ids: Optional[List[str]] = None

class CrewUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    leader_id: Optional[str] = None
    member_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None

class EmployeeShortResponse(BaseModel):
    id: str
    code: str
    name: str
    role: Optional[str] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class CrewResponse(CrewBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    leader: Optional[EmployeeShortResponse] = None
    members: Optional[List[EmployeeShortResponse]] = []
    
    model_config = ConfigDict(from_attributes=True)

# ====================
# Shift Schemas
# ====================
class ShiftBase(BaseModel):
    code: str
    name: str
    start_time: str
    end_time: str
    description: Optional[str] = None
    is_active: bool = True

class ShiftCreate(ShiftBase):
    pass

class ShiftUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ShiftResponse(ShiftBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
