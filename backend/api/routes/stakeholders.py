from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db.models import Customer, Vendor
from schemas.stakeholders import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    VendorCreate, VendorUpdate, VendorResponse
)

router = APIRouter()

def create_crud(router: APIRouter, model, create_schema, update_schema, response_schema, prefix: str):
    @router.post(prefix, response_model=response_schema, status_code=status.HTTP_201_CREATED)
    def create_item(item: create_schema, db: Session = Depends(get_db)):
        new_item = model(**item.model_dump())
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item

    @router.get(prefix, response_model=List[response_schema])
    def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
        return db.query(model).offset(skip).limit(limit).all()

    @router.get(f"{prefix}/{{item_id}}", response_model=response_schema)
    def read_item(item_id: str, db: Session = Depends(get_db)):
        item = db.query(model).filter(model.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item

    @router.put(f"{prefix}/{{item_id}}", response_model=response_schema)
    def update_item(item_id: str, item_update: update_schema, db: Session = Depends(get_db)):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
        for key, value in item_update.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
        return db_item

    @router.delete(f"{prefix}/{{item_id}}")
    def delete_item(item_id: str, db: Session = Depends(get_db)):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
        db.delete(db_item)
        db.commit()
        return {"ok": True}

create_crud(router, Customer, CustomerCreate, CustomerUpdate, CustomerResponse, "/customers")
create_crud(router, Vendor, VendorCreate, VendorUpdate, VendorResponse, "/vendors")
