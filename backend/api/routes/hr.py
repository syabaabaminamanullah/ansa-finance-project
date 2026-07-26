from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db.models import Employee, Crew, Shift
from schemas.hr import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    CrewCreate, CrewUpdate, CrewResponse,
    ShiftCreate, ShiftUpdate, ShiftResponse
)

router = APIRouter()

# ====================
# Employee Endpoints
# ====================
@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    db_emp = db.query(Employee).filter(Employee.code == employee.code).first()
    if db_emp:
        raise HTTPException(status_code=400, detail="Employee code already registered")
    new_employee = Employee(**employee.model_dump())
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return new_employee

@router.get("/employees", response_model=List[EmployeeResponse])
def get_employees(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Employee).offset(skip).limit(limit).all()

@router.get("/employees/{emp_id}", response_model=EmployeeResponse)
def get_employee(emp_id: str, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp

@router.put("/employees/{emp_id}", response_model=EmployeeResponse)
def update_employee(emp_id: str, emp_update: EmployeeUpdate, db: Session = Depends(get_db)):
    db_emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    for key, value in emp_update.model_dump(exclude_unset=True).items():
        setattr(db_emp, key, value)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@router.delete("/employees/{emp_id}")
def delete_employee(emp_id: str, db: Session = Depends(get_db)):
    db_emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Prevent delete if employee is a crew leader
    is_leader = db.query(Crew).filter(Crew.leader_id == emp_id).first()
    if is_leader:
        raise HTTPException(status_code=400, detail="Cannot delete Employee. Employee is registered as a Crew Leader.")
        
    db.delete(db_emp)
    db.commit()
    return {"ok": True}

# ====================
# Crew Endpoints
# ====================
@router.post("/crews", response_model=CrewResponse, status_code=status.HTTP_201_CREATED)
def create_crew(crew: CrewCreate, db: Session = Depends(get_db)):
    db_crew = db.query(Crew).filter(Crew.code == crew.code).first()
    if db_crew:
        raise HTTPException(status_code=400, detail="Crew code already registered")
    
    payload = crew.model_dump(exclude={"member_ids"})
    if "leader_id" in payload and not payload["leader_id"]:
        payload["leader_id"] = None
        
    new_crew = Crew(**payload)
    db.add(new_crew)
    db.commit()
    db.refresh(new_crew)
    
    if crew.member_ids is not None:
        db.query(Employee).filter(Employee.id.in_(crew.member_ids)).update({Employee.crew_id: new_crew.id}, synchronize_session=False)
        db.commit()
        db.refresh(new_crew)
        
    return new_crew

@router.get("/crews", response_model=List[CrewResponse])
def get_crews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Crew).offset(skip).limit(limit).all()

@router.get("/crews/{crew_id}", response_model=CrewResponse)
def get_crew(crew_id: str, db: Session = Depends(get_db)):
    crew = db.query(Crew).filter(Crew.id == crew_id).first()
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    return crew

@router.put("/crews/{crew_id}", response_model=CrewResponse)
def update_crew(crew_id: str, crew_update: CrewUpdate, db: Session = Depends(get_db)):
    db_crew = db.query(Crew).filter(Crew.id == crew_id).first()
    if not db_crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    payload = crew_update.model_dump(exclude_unset=True, exclude={"member_ids"})
    if "leader_id" in payload and not payload["leader_id"]:
        payload["leader_id"] = None
        
    for key, value in payload.items():
        setattr(db_crew, key, value)
    
    if crew_update.member_ids is not None:
        # Clear previous crew members
        db.query(Employee).filter(Employee.crew_id == crew_id).update({Employee.crew_id: None}, synchronize_session=False)
        # Assign new crew members
        if crew_update.member_ids:
            db.query(Employee).filter(Employee.id.in_(crew_update.member_ids)).update({Employee.crew_id: crew_id}, synchronize_session=False)
            
    db.commit()
    db.refresh(db_crew)
    return db_crew

@router.delete("/crews/{crew_id}")
def delete_crew(crew_id: str, db: Session = Depends(get_db)):
    db_crew = db.query(Crew).filter(Crew.id == crew_id).first()
    if not db_crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    
    # Check if there are active crew members, and set their crew_id to null
    db.query(Employee).filter(Employee.crew_id == crew_id).update({Employee.crew_id: None})
    db.delete(db_crew)
    db.commit()
    return {"ok": True}

# ====================
# Shift Endpoints
# ====================
@router.post("/shifts", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(shift: ShiftCreate, db: Session = Depends(get_db)):
    db_shift = db.query(Shift).filter(Shift.code == shift.code).first()
    if db_shift:
        raise HTTPException(status_code=400, detail="Shift code already registered")
    new_shift = Shift(**shift.model_dump())
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    return new_shift

@router.get("/shifts", response_model=List[ShiftResponse])
def get_shifts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Shift).offset(skip).limit(limit).all()

@router.get("/shifts/{shift_id}", response_model=ShiftResponse)
def get_shift(shift_id: str, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift

@router.put("/shifts/{shift_id}", response_model=ShiftResponse)
def update_shift(shift_id: str, shift_update: ShiftUpdate, db: Session = Depends(get_db)):
    db_shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    for key, value in shift_update.model_dump(exclude_unset=True).items():
        setattr(db_shift, key, value)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@router.delete("/shifts/{shift_id}")
def delete_shift(shift_id: str, db: Session = Depends(get_db)):
    db_shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(db_shift)
    db.commit()
    return {"ok": True}
