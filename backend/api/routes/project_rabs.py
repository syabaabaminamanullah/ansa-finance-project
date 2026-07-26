from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import uuid, csv, io

from db.database import get_db
from db.models import ProjectRab

router = APIRouter()

def generate_uuid():
    return str(uuid.uuid4())

# ---- Schemas ----
class ProjectRabCreate(BaseModel):
    project_id: str
    category: str
    description: str
    qty: float = 1.0
    unit: str = "unit"
    unit_cost_idr: float = 0.0
    total_cost_idr: float = 0.0
    notes: Optional[str] = None
    sort_order: float = 0.0

class ProjectRabUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    qty: Optional[float] = None
    unit: Optional[str] = None
    unit_cost_idr: Optional[float] = None
    total_cost_idr: Optional[float] = None
    notes: Optional[str] = None
    sort_order: Optional[float] = None

class ProjectRabResponse(ProjectRabCreate):
    id: str
    is_active: bool = True

    class Config:
        from_attributes = True

# ---- Routes ----
@router.post("/project-rabs", response_model=ProjectRabResponse, status_code=status.HTTP_201_CREATED)
def create_rab(item: ProjectRabCreate, db: Session = Depends(get_db)):
    # Auto-calculate total if not provided
    if item.total_cost_idr == 0.0 and item.qty > 0 and item.unit_cost_idr > 0:
        item.total_cost_idr = item.qty * item.unit_cost_idr
    new_item = ProjectRab(id=generate_uuid(), **item.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/project-rabs", response_model=List[ProjectRabResponse])
def get_all_rabs(db: Session = Depends(get_db)):
    return db.query(ProjectRab).filter(ProjectRab.is_active == True).order_by(ProjectRab.sort_order).all()

@router.get("/project-rabs/by-project/{project_id}", response_model=List[ProjectRabResponse])
def get_rabs_by_project(project_id: str, db: Session = Depends(get_db)):
    return db.query(ProjectRab).filter(
        ProjectRab.project_id == project_id,
        ProjectRab.is_active == True
    ).order_by(ProjectRab.sort_order).all()

@router.get("/project-rabs/{item_id}", response_model=ProjectRabResponse)
def get_rab(item_id: str, db: Session = Depends(get_db)):
    item = db.query(ProjectRab).filter(ProjectRab.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="RAB item not found")
    return item

@router.put("/project-rabs/{item_id}", response_model=ProjectRabResponse)
def update_rab(item_id: str, update: ProjectRabUpdate, db: Session = Depends(get_db)):
    item = db.query(ProjectRab).filter(ProjectRab.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="RAB item not found")
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    # Recalculate total
    item.total_cost_idr = item.qty * item.unit_cost_idr
    db.commit()
    db.refresh(item)
    return item

@router.delete("/project-rabs/{item_id}")
def delete_rab(item_id: str, db: Session = Depends(get_db)):
    item = db.query(ProjectRab).filter(ProjectRab.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="RAB item not found")
    item.is_active = False
    db.commit()
    return {"ok": True}

@router.post("/project-rabs/import/{project_id}")
async def import_rab_csv(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import RAB from CSV file.
    Expected columns: category, description, qty, unit, unit_cost_idr, notes
    """
    content = await file.read()
    text = content.decode("utf-8-sig")  # handle BOM from Excel
    reader = csv.DictReader(io.StringIO(text))
    
    created = 0
    errors = []
    for i, row in enumerate(reader):
        try:
            qty = float(row.get("qty", 1) or 1)
            unit_cost = float(row.get("unit_cost_idr", 0) or 0)
            new_item = ProjectRab(
                id=generate_uuid(),
                project_id=project_id,
                category=row.get("category", "Uncategorized").strip(),
                description=row.get("description", "").strip(),
                qty=qty,
                unit=row.get("unit", "unit").strip(),
                unit_cost_idr=unit_cost,
                total_cost_idr=qty * unit_cost,
                notes=row.get("notes", "").strip() or None,
                sort_order=float(i),
                is_active=True
            )
            db.add(new_item)
            created += 1
        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")
    
    db.commit()
    return {"created": created, "errors": errors}
