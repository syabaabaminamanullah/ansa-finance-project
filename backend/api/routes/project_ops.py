from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db.database import get_db
from db import models
from schemas import project_ops

router = APIRouter()

# ====================
# Project Resource Routes
# ====================
@router.post("/resources", response_model=project_ops.ProjectResourceResponse)
def create_project_resource(resource: project_ops.ProjectResourceCreate, db: Session = Depends(get_db)):
    db_resource = models.ProjectResource(**resource.model_dump())
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

@router.get("/resources", response_model=List[project_ops.ProjectResourceResponse])
def get_project_resources(project_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.ProjectResource).filter(models.ProjectResource.is_active == True)
    if project_id:
        query = query.filter(models.ProjectResource.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.get("/resources/{resource_id}", response_model=project_ops.ProjectResourceResponse)
def get_project_resource(resource_id: str, db: Session = Depends(get_db)):
    db_resource = db.query(models.ProjectResource).filter(models.ProjectResource.id == resource_id).first()
    if db_resource is None:
        raise HTTPException(status_code=404, detail="Project Resource not found")
    return db_resource

@router.put("/resources/{resource_id}", response_model=project_ops.ProjectResourceResponse)
def update_project_resource(resource_id: str, resource: project_ops.ProjectResourceUpdate, db: Session = Depends(get_db)):
    db_resource = db.query(models.ProjectResource).filter(models.ProjectResource.id == resource_id).first()
    if db_resource is None:
        raise HTTPException(status_code=404, detail="Project Resource not found")
    
    update_data = resource.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_resource, key, value)
    
    db.commit()
    db.refresh(db_resource)
    return db_resource

@router.delete("/resources/{resource_id}")
def delete_project_resource(resource_id: str, db: Session = Depends(get_db)):
    db_resource = db.query(models.ProjectResource).filter(models.ProjectResource.id == resource_id).first()
    if db_resource is None:
        raise HTTPException(status_code=404, detail="Project Resource not found")
    
    db_resource.is_active = False # Soft delete
    db.commit()
    return {"message": "Project Resource deleted"}

# ====================
# Daily Progress Report Routes
# ====================
@router.post("/reports", response_model=project_ops.DailyProgressReportResponse)
def create_daily_report(report: project_ops.DailyProgressReportCreate, db: Session = Depends(get_db)):
    db_report = models.DailyProgressReport(**report.model_dump())
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/reports", response_model=List[project_ops.DailyProgressReportResponse])
def get_daily_reports(project_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.DailyProgressReport).filter(models.DailyProgressReport.is_active == True)
    if project_id:
        query = query.filter(models.DailyProgressReport.project_id == project_id)
    return query.offset(skip).limit(limit).all()

@router.get("/reports/{report_id}", response_model=project_ops.DailyProgressReportResponse)
def get_daily_report(report_id: str, db: Session = Depends(get_db)):
    db_report = db.query(models.DailyProgressReport).filter(models.DailyProgressReport.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Daily Report not found")
    return db_report

@router.put("/reports/{report_id}", response_model=project_ops.DailyProgressReportResponse)
def update_daily_report(report_id: str, report: project_ops.DailyProgressReportUpdate, db: Session = Depends(get_db)):
    db_report = db.query(models.DailyProgressReport).filter(models.DailyProgressReport.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Daily Report not found")
    
    update_data = report.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_report, key, value)
    
    db.commit()
    db.refresh(db_report)
    return db_report

@router.delete("/reports/{report_id}")
def delete_daily_report(report_id: str, db: Session = Depends(get_db)):
    db_report = db.query(models.DailyProgressReport).filter(models.DailyProgressReport.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Daily Report not found")
    
    db_report.is_active = False # Soft delete
    db.commit()
    return {"message": "Daily Report deleted"}
