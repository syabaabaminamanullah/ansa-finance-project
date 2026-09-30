from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from db.database import get_db
from db.models import TaxWorker, TaxWorkerHistory, Project
import uuid

router = APIRouter()

class TaxWorkerCreate(BaseModel):
    name: str
    npwp: Optional[str] = None
    ptkp_status: Optional[str] = None
    base_salary: float = 0.0
    join_date: Optional[str] = None
    is_active: bool = True

class TaxWorkerUpdate(BaseModel):
    name: Optional[str] = None
    npwp: Optional[str] = None
    ptkp_status: Optional[str] = None
    base_salary: Optional[float] = None
    join_date: Optional[str] = None
    exit_date: Optional[str] = None
    is_active: Optional[bool] = None

class TaxWorkerHistoryCreate(BaseModel):
    worker_id: str
    project_id: Optional[str] = None
    period_month: str
    gross_salary: float
    tax_amount: float
    net_salary: float

@router.get("")
def get_tax_workers(db: Session = Depends(get_db)):
    workers = db.query(TaxWorker).order_by(TaxWorker.name).all()
    # Fetch history summary for each
    results = []
    for w in workers:
        hist = db.query(TaxWorkerHistory).filter(TaxWorkerHistory.worker_id == w.id).order_by(TaxWorkerHistory.period_month.desc()).all()
        hist_data = []
        for h in hist:
            proj = db.query(Project).filter(Project.id == h.project_id).first() if h.project_id else None
            hist_data.append({
                "id": h.id,
                "period_month": h.period_month,
                "project_name": proj.name if proj else "-",
                "gross_salary": h.gross_salary,
                "tax_amount": h.tax_amount,
                "net_salary": h.net_salary
            })
        
        results.append({
            "id": w.id,
            "name": w.name,
            "npwp": w.npwp,
            "ptkp_status": w.ptkp_status,
            "base_salary": w.base_salary,
            "join_date": w.join_date,
            "exit_date": w.exit_date,
            "is_active": w.is_active,
            "history": hist_data
        })
    return results

@router.post("")
def create_tax_worker(payload: TaxWorkerCreate, db: Session = Depends(get_db)):
    w = TaxWorker(
        id=str(uuid.uuid4()),
        name=payload.name,
        npwp=payload.npwp,
        ptkp_status=payload.ptkp_status,
        base_salary=payload.base_salary,
        join_date=payload.join_date,
        is_active=payload.is_active
    )
    db.add(w)
    db.commit()
    return {"message": "Worker created", "id": w.id}

@router.put("/{worker_id}")
def update_tax_worker(worker_id: str, payload: TaxWorkerUpdate, db: Session = Depends(get_db)):
    w = db.query(TaxWorker).filter(TaxWorker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    if payload.name is not None: w.name = payload.name
    if payload.npwp is not None: w.npwp = payload.npwp
    if payload.ptkp_status is not None: w.ptkp_status = payload.ptkp_status
    if payload.base_salary is not None: w.base_salary = payload.base_salary
    if payload.join_date is not None: w.join_date = payload.join_date
    if payload.exit_date is not None: w.exit_date = payload.exit_date
    if payload.is_active is not None: w.is_active = payload.is_active

    db.commit()
    return {"message": "Worker updated"}

@router.delete("/{worker_id}")
def delete_tax_worker(worker_id: str, db: Session = Depends(get_db)):
    w = db.query(TaxWorker).filter(TaxWorker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # delete history first
    db.query(TaxWorkerHistory).filter(TaxWorkerHistory.worker_id == worker_id).delete()
    db.delete(w)
    db.commit()
    return {"message": "Worker deleted"}

@router.post("/history")
def add_tax_history(payload: TaxWorkerHistoryCreate, db: Session = Depends(get_db)):
    h = TaxWorkerHistory(
        id=str(uuid.uuid4()),
        worker_id=payload.worker_id,
        project_id=payload.project_id,
        period_month=payload.period_month,
        gross_salary=payload.gross_salary,
        tax_amount=payload.tax_amount,
        net_salary=payload.net_salary
    )
    db.add(h)
    db.commit()
    return {"message": "History added", "id": h.id}

@router.delete("/history/{history_id}")
def delete_tax_history(history_id: str, db: Session = Depends(get_db)):
    h = db.query(TaxWorkerHistory).filter(TaxWorkerHistory.id == history_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="History not found")
    db.delete(h)
    db.commit()
    return {"message": "History deleted"}
