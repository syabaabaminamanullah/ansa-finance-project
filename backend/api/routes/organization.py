from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db.models import Company, Branch, CostCenter
from schemas.organization import (
    CompanyCreate, CompanyUpdate, CompanyResponse,
    BranchCreate, BranchUpdate, BranchResponse,
    CostCenterCreate, CostCenterUpdate, CostCenterResponse
)

router = APIRouter()

# ====================
# Company Endpoints
# ====================
@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    db_company = db.query(Company).filter(Company.code == company.code).first()
    if db_company:
        raise HTTPException(status_code=400, detail="Company code already registered")
    
    new_company = Company(**company.model_dump())
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    return new_company

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Company).offset(skip).limit(limit).all()

@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company(company_id: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company(company_id: str, company_update: CompanyUpdate, db: Session = Depends(get_db)):
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    for key, value in company_update.model_dump(exclude_unset=True).items():
        setattr(db_company, key, value)
        
    db.commit()
    db.refresh(db_company)
    return db_company

# ====================
# Branch Endpoints
# ====================
@router.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(branch: BranchCreate, db: Session = Depends(get_db)):
    db_branch = db.query(Branch).filter(Branch.code == branch.code).first()
    if db_branch:
        raise HTTPException(status_code=400, detail="Branch code already registered")
    
    new_branch = Branch(**branch.model_dump())
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch

@router.get("/branches", response_model=List[BranchResponse])
def get_branches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Branch).offset(skip).limit(limit).all()

# ====================
# Cost Center Endpoints
# ====================
@router.post("/cost-centers", response_model=CostCenterResponse, status_code=status.HTTP_201_CREATED)
def create_cost_center(cost_center: CostCenterCreate, db: Session = Depends(get_db)):
    db_cc = db.query(CostCenter).filter(CostCenter.code == cost_center.code).first()
    if db_cc:
        raise HTTPException(status_code=400, detail="Cost Center code already registered")
    
    new_cc = CostCenter(**cost_center.model_dump())
    db.add(new_cc)
    db.commit()
    db.refresh(new_cc)
    return new_cc

@router.get("/cost-centers", response_model=List[CostCenterResponse])
def get_cost_centers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(CostCenter).offset(skip).limit(limit).all()
