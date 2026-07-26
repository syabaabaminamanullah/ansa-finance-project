from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db.models import Rig, Equipment, Warehouse, Material, InventoryItem
from schemas.inventory import (
    RigCreate, RigUpdate, RigResponse,
    EquipmentCreate, EquipmentUpdate, EquipmentResponse,
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    MaterialCreate, MaterialUpdate, MaterialResponse,
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse
)

router = APIRouter()

def create_crud_routes(router: APIRouter, model, create_schema, update_schema, response_schema, prefix: str):
    @router.post(prefix, response_model=response_schema, status_code=status.HTTP_201_CREATED)
    def create_item(item: create_schema, db: Session = Depends(get_db)):
        # Check code unique constraint if model has code
        if hasattr(model, 'code'):
            db_item = db.query(model).filter(model.code == item.code).first()
            if db_item:
                raise HTTPException(status_code=400, detail=f"{model.__name__} code already registered")
                
        # For InventoryItem, check if composite key already exists
        if model == InventoryItem:
            db_item = db.query(model).filter(
                model.material_id == item.material_id, 
                model.warehouse_id == item.warehouse_id
            ).first()
            if db_item:
                raise HTTPException(status_code=400, detail="Inventory item already exists in this warehouse. Use Update to modify stock.")
        
        payload = item.model_dump()
        # Convert empty strings to None for foreign key IDs
        for key in ["branch_id", "warehouse_id", "manager_id", "material_id"]:
            if key in payload and not payload[key]:
                payload[key] = None
                
        new_item = model(**payload)
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
            
        payload = item_update.model_dump(exclude_unset=True)
        # Convert empty strings to None for foreign keys
        for key in ["branch_id", "warehouse_id", "manager_id", "material_id"]:
            if key in payload and not payload[key]:
                payload[key] = None
                
        for key, value in payload.items():
            setattr(db_item, key, value)
            
        db.commit()
        db.refresh(db_item)
        return db_item

    @router.delete(f"{prefix}/{{item_id}}")
    def delete_item(item_id: str, db: Session = Depends(get_db)):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
            
        # Prevent delete constraints
        if model == Warehouse:
            # Check if there are active equipments in this warehouse
            has_equip = db.query(Equipment).filter(Equipment.warehouse_id == item_id).first()
            if has_equip:
                raise HTTPException(status_code=400, detail="Cannot delete warehouse. Equipment is stored here.")
            # Check if there is active stock
            has_stock = db.query(InventoryItem).filter(InventoryItem.warehouse_id == item_id, InventoryItem.quantity > 0).first()
            if has_stock:
                raise HTTPException(status_code=400, detail="Cannot delete warehouse. Stock items are present.")
                
        if model == Material:
            # Check if there is active stock in inventory items
            has_stock = db.query(InventoryItem).filter(InventoryItem.material_id == item_id).first()
            if has_stock:
                raise HTTPException(status_code=400, detail="Cannot delete material. It has active inventory stock mapping.")
                
        db.delete(db_item)
        db.commit()
        return {"ok": True}

create_crud_routes(router, Warehouse, WarehouseCreate, WarehouseUpdate, WarehouseResponse, "/warehouses")
create_crud_routes(router, Rig, RigCreate, RigUpdate, RigResponse, "/rigs")
create_crud_routes(router, Equipment, EquipmentCreate, EquipmentUpdate, EquipmentResponse, "/equipments")
create_crud_routes(router, Material, MaterialCreate, MaterialUpdate, MaterialResponse, "/materials")
create_crud_routes(router, InventoryItem, InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse, "/inventory-items")

from datetime import datetime
from sqlalchemy import func
from db.models import InventoryTransaction, InventoryTransactionLine, Journal, JournalLine, ChartOfAccount, Project
from schemas.inventory import InventoryTransactionCreate, InventoryTransactionResponse
from api.routes.finance import generate_transaction_number

@router.get("/transactions", response_model=List[InventoryTransactionResponse])
def list_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(InventoryTransaction).order_by(InventoryTransaction.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/transactions/{transaction_id}", response_model=InventoryTransactionResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.query(InventoryTransaction).filter(InventoryTransaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.post("/transactions", response_model=InventoryTransactionResponse)
def create_transaction(tx: InventoryTransactionCreate, db: Session = Depends(get_db)):
    tx_code = "RCV" if tx.type == "RECEIPT" else ("ISS" if tx.type == "ISSUE" else "TRF")
    
    txn_num = generate_transaction_number(db, tx.date, tx.project_id, tx_code, InventoryTransaction, "transaction_number")
    
    new_tx = InventoryTransaction(
        transaction_number=txn_num,
        date=tx.date,
        type=tx.type,
        source_warehouse_id=tx.source_warehouse_id,
        destination_warehouse_id=tx.destination_warehouse_id,
        project_id=tx.project_id,
        reference_number=tx.reference_number,
        status="Draft",
        notes=tx.notes
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)

    for line in tx.lines:
        new_line = InventoryTransactionLine(
            transaction_id=new_tx.id,
            material_id=line.material_id,
            quantity=line.quantity,
            unit_cost=line.unit_cost,
            total_cost=line.quantity * line.unit_cost
        )
        db.add(new_line)
    
    db.commit()
    db.refresh(new_tx)
    return new_tx

@router.post("/transactions/{transaction_id}/post")
def post_transaction(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.query(InventoryTransaction).filter(InventoryTransaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.status == "Posted":
        raise HTTPException(status_code=400, detail="Transaction already posted")

    total_value = 0.0
    for line in tx.lines:
        if tx.type == "RECEIPT":
            item = db.query(InventoryItem).filter(
                InventoryItem.material_id == line.material_id,
                InventoryItem.warehouse_id == tx.destination_warehouse_id
            ).first()
            if not item:
                item = InventoryItem(
                    material_id=line.material_id, 
                    warehouse_id=tx.destination_warehouse_id,
                    quantity=line.quantity,
                    unit_cost=line.unit_cost
                )
                db.add(item)
            else:
                old_val = item.quantity * item.unit_cost
                new_val = line.quantity * line.unit_cost
                new_qty = item.quantity + line.quantity
                item.unit_cost = (old_val + new_val) / new_qty if new_qty > 0 else 0
                item.quantity = new_qty
            total_value += line.quantity * line.unit_cost

        elif tx.type == "ISSUE":
            item = db.query(InventoryItem).filter(
                InventoryItem.material_id == line.material_id,
                InventoryItem.warehouse_id == tx.source_warehouse_id
            ).first()
            if not item or item.quantity < line.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for material ID {line.material_id}")
            
            issue_cost = line.quantity * item.unit_cost
            line.unit_cost = item.unit_cost
            line.total_cost = issue_cost
            total_value += issue_cost
            item.quantity -= line.quantity
        
        elif tx.type == "TRANSFER":
            src = db.query(InventoryItem).filter(
                InventoryItem.material_id == line.material_id,
                InventoryItem.warehouse_id == tx.source_warehouse_id
            ).first()
            if not src or src.quantity < line.quantity:
                raise HTTPException(status_code=400, detail="Insufficient stock for transfer")
            
            transfer_cost = src.unit_cost
            line.unit_cost = transfer_cost
            line.total_cost = line.quantity * transfer_cost
            src.quantity -= line.quantity
            
            dst = db.query(InventoryItem).filter(
                InventoryItem.material_id == line.material_id,
                InventoryItem.warehouse_id == tx.destination_warehouse_id
            ).first()
            if not dst:
                dst = InventoryItem(
                    material_id=line.material_id,
                    warehouse_id=tx.destination_warehouse_id,
                    quantity=line.quantity,
                    unit_cost=transfer_cost
                )
                db.add(dst)
            else:
                old_val = dst.quantity * dst.unit_cost
                new_val = line.quantity * transfer_cost
                new_qty = dst.quantity + line.quantity
                dst.unit_cost = (old_val + new_val) / new_qty if new_qty > 0 else 0
                dst.quantity = new_qty

    if tx.type == "ISSUE" and tx.project_id:
        inventory_acct = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == "1150").first()
        expense_acct = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == "5110").first()
        
        if inventory_acct and expense_acct:
            j_num = generate_transaction_number(db, tx.date, tx.project_id, "JV", Journal, "journal_number")
            journal = Journal(
                journal_number=j_num,
                date=tx.date,
                description=f"Material Issue for Project: {tx.transaction_number}",
                ref_type="Inventory_Issue",
                ref_id=tx.id,
                status="Posted"
            )
            db.add(journal)
            db.flush()
            
            db.add(JournalLine(journal_id=journal.id, account_id=expense_acct.id, project_id=tx.project_id, debit=total_value, credit=0, description="Material Cost"))
            db.add(JournalLine(journal_id=journal.id, account_id=inventory_acct.id, project_id=tx.project_id, debit=0, credit=total_value, description="Inventory Issue"))

    tx.status = "Posted"
    db.commit()
    return {"message": "Transaction posted successfully"}
