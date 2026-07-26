from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from schemas.organization import BranchResponse
from schemas.hr import EmployeeResponse

# ====================
# Warehouse Schemas
# ====================
class WarehouseBase(BaseModel):
    code: str
    name: str
    address: Optional[str] = None
    manager_id: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    manager_id: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: Optional[bool] = None

class WarehouseResponse(WarehouseBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    manager: Optional[EmployeeResponse] = None
    branch: Optional[BranchResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ====================
# Rig Schemas
# ====================
class RigBase(BaseModel):
    code: str
    name: str
    model_type: Optional[str] = None
    capacity_depth: Optional[float] = None
    serial_number: Optional[str] = None
    ownership_status: Optional[str] = None
    status: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: bool = True

class RigCreate(RigBase):
    pass

class RigUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    model_type: Optional[str] = None
    capacity_depth: Optional[float] = None
    serial_number: Optional[str] = None
    ownership_status: Optional[str] = None
    status: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: Optional[bool] = None

class RigResponse(RigBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    branch: Optional[BranchResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ====================
# Equipment Schemas
# ====================
class EquipmentBase(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    serial_number: Optional[str] = None
    brand: Optional[str] = None
    purchase_date: Optional[str] = None
    status: Optional[str] = None
    warehouse_id: Optional[str] = None
    is_active: bool = True

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    serial_number: Optional[str] = None
    brand: Optional[str] = None
    purchase_date: Optional[str] = None
    status: Optional[str] = None
    warehouse_id: Optional[str] = None
    is_active: Optional[bool] = None

class EquipmentResponse(EquipmentBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    warehouse: Optional[WarehouseResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ====================
# Material Schemas
# ====================
class MaterialBase(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    uom: str
    min_stock: float = 0.0
    description: Optional[str] = None
    is_active: bool = True

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    uom: Optional[str] = None
    min_stock: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class MaterialResponse(MaterialBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ====================
# Inventory Item Schemas
# ====================
class InventoryItemBase(BaseModel):
    material_id: str
    warehouse_id: str
    quantity: float = 0.0
    unit_cost: float = 0.0
    is_active: bool = True

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    material_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    quantity: Optional[float] = None
    unit_cost: Optional[float] = None
    is_active: Optional[bool] = None

class InventoryItemResponse(InventoryItemBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    material: Optional[MaterialResponse] = None
    warehouse: Optional[WarehouseResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ====================
# Inventory Transaction Schemas
# ====================
class InventoryTransactionLineBase(BaseModel):
    material_id: str
    quantity: float
    unit_cost: float = 0.0
    total_cost: float = 0.0

class InventoryTransactionLineCreate(InventoryTransactionLineBase):
    pass

class InventoryTransactionLineResponse(InventoryTransactionLineBase):
    id: str
    transaction_id: str
    material: Optional[MaterialResponse] = None
    model_config = ConfigDict(from_attributes=True)

class InventoryTransactionBase(BaseModel):
    date: str
    type: str # RECEIPT, ISSUE, TRANSFER, ADJUSTMENT
    source_warehouse_id: Optional[str] = None
    destination_warehouse_id: Optional[str] = None
    project_id: Optional[str] = None
    reference_number: Optional[str] = None
    status: str = "Draft"
    notes: Optional[str] = None

class InventoryTransactionCreate(InventoryTransactionBase):
    lines: List[InventoryTransactionLineCreate]

class InventoryTransactionResponse(InventoryTransactionBase):
    id: str
    transaction_number: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    source_warehouse: Optional[WarehouseResponse] = None
    destination_warehouse: Optional[WarehouseResponse] = None
    lines: List[InventoryTransactionLineResponse] = []
    
    # from schemas.project import ProjectResponse
    # project: Optional[ProjectResponse] = None
    
    model_config = ConfigDict(from_attributes=True)
