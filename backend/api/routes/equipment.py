from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import uuid

from db.database import get_db
from db.models import Equipment, EquipmentAssignment, EquipmentMaintenance, Project, Crew
from schemas.equipment import EquipmentAssignmentCreate, EquipmentAssignmentUpdate, EquipmentAssignmentResponse
from schemas.equipment import EquipmentMaintenanceCreate, EquipmentMaintenanceResponse
from schemas.inventory import EquipmentResponse

router = APIRouter()

# --- Equipments (Master Data Override/Extension) ---
@router.get("/", response_model=List[EquipmentResponse])
def get_equipments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Equipment).offset(skip).limit(limit).all()

# --- Equipment Assignment (Dispatch & Return) ---
@router.get("/assignments", response_model=List[EquipmentAssignmentResponse])
def get_assignments(equipment_id: str = None, project_id: str = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(EquipmentAssignment)
    if equipment_id:
        query = query.filter(EquipmentAssignment.equipment_id == equipment_id)
    if project_id:
        query = query.filter(EquipmentAssignment.project_id == project_id)
    if status:
        query = query.filter(EquipmentAssignment.status == status)
    return query.order_by(desc(EquipmentAssignment.created_at)).all()

@router.post("/assignments", response_model=EquipmentAssignmentResponse)
def dispatch_equipment(assignment: EquipmentAssignmentCreate, db: Session = Depends(get_db)):
    # Create Assignment
    db_assignment = EquipmentAssignment(**assignment.dict(), id=str(uuid.uuid4()))
    db.add(db_assignment)
    
    # Update Equipment status
    equipment = db.query(Equipment).filter(Equipment.id == assignment.equipment_id).first()
    if equipment:
        equipment.status = 'Dispatched'
        
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.put("/assignments/{assignment_id}", response_model=EquipmentAssignmentResponse)
def return_equipment(assignment_id: str, payload: EquipmentAssignmentUpdate, db: Session = Depends(get_db)):
    db_assignment = db.query(EquipmentAssignment).filter(EquipmentAssignment.id == assignment_id).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if payload.return_date:
        db_assignment.return_date = payload.return_date
    if payload.status:
        db_assignment.status = payload.status
    if payload.notes:
        db_assignment.notes = payload.notes
        
    # If returned, update Equipment status back to Active
    if payload.status == 'Returned':
        equipment = db.query(Equipment).filter(Equipment.id == db_assignment.equipment_id).first()
        if equipment:
            equipment.status = 'Active'
            
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

# --- Equipment Maintenance ---
@router.get("/maintenance", response_model=List[EquipmentMaintenanceResponse])
def get_maintenance(equipment_id: str = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(EquipmentMaintenance)
    if equipment_id:
        query = query.filter(EquipmentMaintenance.equipment_id == equipment_id)
    if status:
        query = query.filter(EquipmentMaintenance.status == status)
    return query.order_by(desc(EquipmentMaintenance.created_at)).all()

@router.post("/maintenance", response_model=EquipmentMaintenanceResponse)
def add_maintenance(maintenance: EquipmentMaintenanceCreate, db: Session = Depends(get_db)):
    db_maintenance = EquipmentMaintenance(**maintenance.dict(), id=str(uuid.uuid4()))
    db.add(db_maintenance)
    
    # Update Equipment status if needed
    if maintenance.status in ['Planned', 'In Progress']:
        equipment = db.query(Equipment).filter(Equipment.id == maintenance.equipment_id).first()
        if equipment:
            equipment.status = 'Maintenance'
            
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance

@router.put("/maintenance/{maintenance_id}", response_model=EquipmentMaintenanceResponse)
def update_maintenance(maintenance_id: str, status: str, db: Session = Depends(get_db)):
    db_maintenance = db.query(EquipmentMaintenance).filter(EquipmentMaintenance.id == maintenance_id).first()
    if not db_maintenance:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
        
    db_maintenance.status = status
    
    # If completed, update equipment status
    if status == 'Completed':
        equipment = db.query(Equipment).filter(Equipment.id == db_maintenance.equipment_id).first()
        if equipment:
            equipment.status = 'Active'
            
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance
