from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# ====================
# Project Resource Schemas
# ====================
class ProjectResourceBase(BaseModel):
    project_id: str
    resource_type: str
    resource_id: str
    start_date: str
    end_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class ProjectResourceCreate(ProjectResourceBase):
    pass

class ProjectResourceUpdate(BaseModel):
    project_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ProjectResourceResponse(ProjectResourceBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Optional metadata that we can inject at router level
    resource_name: Optional[str] = None
    resource_code: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# ====================
# Daily Progress Report Schemas
# ====================
class DailyProgressReportBase(BaseModel):
    project_id: str
    area_id: Optional[str] = None
    report_date: str
    weather: Optional[str] = None
    drilling_depth: float = 0.0
    activities_summary: Optional[str] = None
    issues_encountered: Optional[str] = None
    reported_by_id: Optional[str] = None
    status: str = "Draft"
    is_active: bool = True

class DailyProgressReportCreate(DailyProgressReportBase):
    pass

class DailyProgressReportUpdate(BaseModel):
    project_id: Optional[str] = None
    area_id: Optional[str] = None
    report_date: Optional[str] = None
    weather: Optional[str] = None
    drilling_depth: Optional[float] = None
    activities_summary: Optional[str] = None
    issues_encountered: Optional[str] = None
    reported_by_id: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class DailyProgressReportResponse(DailyProgressReportBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
