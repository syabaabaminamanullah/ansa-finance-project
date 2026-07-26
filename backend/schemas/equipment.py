from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from schemas.inventory import EquipmentResponse
from schemas.projects import ProjectResponse

# Equipment Assignment
class EquipmentAssignmentBase(BaseModel):
    equipment_id: str
    project_id: str
    crew_id: Optional[str] = None
    dispatch_date: str
    return_date: Optional[str] = None
    status: str
    notes: Optional[str] = None

class EquipmentAssignmentCreate(EquipmentAssignmentBase):
    pass

class EquipmentAssignmentUpdate(BaseModel):
    return_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class EquipmentAssignmentResponse(EquipmentAssignmentBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    equipment: Optional[EquipmentResponse] = None
    project: Optional[ProjectResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Equipment Maintenance
class EquipmentMaintenanceBase(BaseModel):
    equipment_id: str
    date: str
    maintenance_type: str
    cost: float
    description: Optional[str] = None
    status: str

class EquipmentMaintenanceCreate(EquipmentMaintenanceBase):
    pass

class EquipmentMaintenanceResponse(EquipmentMaintenanceBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    equipment: Optional[EquipmentResponse] = None

    model_config = ConfigDict(from_attributes=True)
