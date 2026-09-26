from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Float, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class BaseModel(Base):
    __abstract__ = True
    id = Column(String, primary_key=True, default=generate_uuid)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)

class Company(BaseModel):
    __tablename__ = "companies"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    address = Column(String)
    tax_id = Column(String) # NPWP

    branches = relationship("Branch", back_populates="company")

class Branch(BaseModel):
    __tablename__ = "branches"

    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

    company = relationship("Company", back_populates="branches")
    cost_centers = relationship("CostCenter", back_populates="branch")

class CostCenter(BaseModel):
    __tablename__ = "cost_centers"

    branch_id = Column(String, ForeignKey("branches.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

    branch = relationship("Branch", back_populates="cost_centers")

# ====================
# Financial Master Data
# ====================
class ChartOfAccount(BaseModel):
    __tablename__ = "chart_of_accounts"

    account_code = Column(String, unique=True, index=True, nullable=False)
    account_name = Column(String, nullable=False)
    account_type = Column(String, nullable=False) # Asset, Liability, Equity, Revenue, Expense
    normal_balance = Column(String, nullable=False) # Debit, Credit
    is_header = Column(Boolean, default=False)
    parent_code = Column(String, nullable=True)

class TaxCode(BaseModel):
    __tablename__ = "tax_codes"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    rate = Column(String, nullable=False) # Store as string or numeric (e.g. '11', '2.5')
    description = Column(String)

class Currency(BaseModel):
    __tablename__ = "currencies"

    code = Column(String, unique=True, index=True, nullable=False) # e.g. IDR, USD
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=False)

class Bank(BaseModel):
    __tablename__ = "banks"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    account_number = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    currency_id = Column(String, ForeignKey("currencies.id"))
    coa_account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=True)

    currency = relationship("Currency")
    coa_account = relationship("ChartOfAccount")

# ====================
# Project Management
# ====================
class Project(BaseModel):
    __tablename__ = "projects"

    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="Planning")
    contract_value = Column(String, nullable=True) # Deprecated/informational
    contract_value_usd = Column(Float, default=0.0)
    contract_value_idr = Column(Float, default=0.0)

    company = relationship("Company")
    customer = relationship("Customer")
    areas = relationship("Area", back_populates="project", cascade="all, delete-orphan")
    rab_items = relationship("ProjectRab", back_populates="project", cascade="all, delete-orphan")


class ProjectRab(BaseModel):
    """Rencana Anggaran Biaya - Budget items per project line"""
    __tablename__ = "project_rabs"

    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    category = Column(String, nullable=False)  # e.g. 'I. Data Acquisition'
    description = Column(String, nullable=False)  # e.g. 'Senior Geophysist Engineer'
    qty = Column(Float, default=1.0)
    unit = Column(String, default="unit")  # man, pax, kg, unit, lump sum
    unit_cost_idr = Column(Float, default=0.0)
    total_cost_idr = Column(Float, default=0.0)  # qty * unit_cost_idr
    notes = Column(String, nullable=True)  # e.g. 'by Client'
    sort_order = Column(Float, default=0.0)  # for ordering rows

    project = relationship("Project", back_populates="rab_items")

class Area(BaseModel):
    __tablename__ = "areas"

    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

    project = relationship("Project", back_populates="areas")
    work_packages = relationship("WorkPackage", back_populates="area", cascade="all, delete-orphan")

class WorkPackage(BaseModel):
    __tablename__ = "work_packages"

    area_id = Column(String, ForeignKey("areas.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

    area = relationship("Area", back_populates="work_packages")
    activities = relationship("Activity", back_populates="work_package", cascade="all, delete-orphan")

class Activity(BaseModel):
    __tablename__ = "activities"

    work_package_id = Column(String, ForeignKey("work_packages.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

    work_package = relationship("WorkPackage", back_populates="activities")

# ====================
# Stakeholders
# ====================
class Customer(BaseModel):
    __tablename__ = "customers"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    npwp = Column(String)
    address = Column(String)
    contact = Column(String)
    
    # Financial Integration
    bank_id = Column(String, ForeignKey("banks.id"))
    bank_account_number = Column(String)
    bank_account_name = Column(String)
    term_of_payment = Column(String) # e.g. 'Net 30'
    receivable_account_id = Column(String, ForeignKey("chart_of_accounts.id"))

    bank = relationship("Bank")
    receivable_account = relationship("ChartOfAccount")

class Vendor(BaseModel):
    __tablename__ = "vendors"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    npwp = Column(String)
    address = Column(String)
    contact = Column(String)

    # Financial Integration
    bank_id = Column(String, ForeignKey("banks.id"))
    bank_account_number = Column(String)
    bank_account_name = Column(String)
    term_of_payment = Column(String)
    payable_account_id = Column(String, ForeignKey("chart_of_accounts.id"))

    bank = relationship("Bank")
    payable_account = relationship("ChartOfAccount")

# ====================
# Human Resources
# ====================
class Employee(BaseModel):
    __tablename__ = "employees"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    role = Column(String)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)
    cost_center_id = Column(String, ForeignKey("cost_centers.id"), nullable=True)
    crew_id = Column(String, ForeignKey("crews.id"), nullable=True)
    join_date = Column(String)

    branch = relationship("Branch")
    cost_center = relationship("CostCenter")
    crew = relationship("Crew", back_populates="members", foreign_keys=[crew_id])

class Crew(BaseModel):
    __tablename__ = "crews"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    leader_id = Column(String, ForeignKey("employees.id"), nullable=True)

    leader = relationship("Employee", foreign_keys=[leader_id])
    members = relationship("Employee", back_populates="crew", foreign_keys="Employee.crew_id")

class Shift(BaseModel):
    __tablename__ = "shifts"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    description = Column(String)

# ====================
# Asset & Inventory
# ====================
class Warehouse(BaseModel):
    __tablename__ = "warehouses"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    address = Column(String)
    manager_id = Column(String, ForeignKey("employees.id"), nullable=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)

    manager = relationship("Employee")
    branch = relationship("Branch")

class Rig(BaseModel):
    __tablename__ = "rigs"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    model_type = Column(String) # e.g. Spindle, Crawler, Jack-up
    capacity_depth = Column(Float) # in meters
    serial_number = Column(String)
    ownership_status = Column(String) # e.g. Owned, Rented
    status = Column(String) # e.g. Active, Maintenance, Inactive
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)

    branch = relationship("Branch")

class Equipment(BaseModel):
    __tablename__ = "equipments"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String) # e.g. Water Pump, Generator, SPT Hammer, Test Kit
    serial_number = Column(String)
    brand = Column(String)
    purchase_date = Column(String) # YYYY-MM-DD
    status = Column(String) # e.g. Active, Repair, Scrapped
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)

    warehouse = relationship("Warehouse")

class EquipmentAssignment(BaseModel):
    __tablename__ = "equipment_assignments"

    equipment_id = Column(String, ForeignKey("equipments.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    crew_id = Column(String, ForeignKey("crews.id"), nullable=True)
    dispatch_date = Column(String, nullable=False)
    return_date = Column(String, nullable=True)
    status = Column(String, nullable=False) # e.g. Dispatched, Returned
    notes = Column(String, nullable=True)

    equipment = relationship("Equipment")
    project = relationship("Project")
    crew = relationship("Crew")

class EquipmentMaintenance(BaseModel):
    __tablename__ = "equipment_maintenances"

    equipment_id = Column(String, ForeignKey("equipments.id"), nullable=False)
    date = Column(String, nullable=False)
    maintenance_type = Column(String, nullable=False) # e.g. Routine, Repair
    cost = Column(Float, default=0.0)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False) # e.g. Planned, In Progress, Completed

    equipment = relationship("Equipment")

class Material(BaseModel):
    __tablename__ = "materials"

    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String) # e.g. Mud/Chemical, Drilling Bits, Consumables, Fuel
    uom = Column(String, nullable=False) # Unit of Measurement e.g. bag, liter, pcs, box
    min_stock = Column(Float, default=0.0) # minimum stock level alert
    description = Column(String)

class InventoryItem(BaseModel):
    __tablename__ = "inventory_items"

    material_id = Column(String, ForeignKey("materials.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Float, default=0.0)
    unit_cost = Column(Float, default=0.0)

    material = relationship("Material")
    warehouse = relationship("Warehouse")

class InventoryTransaction(BaseModel):
    __tablename__ = "inventory_transactions"

    transaction_number = Column(String, unique=True, index=True, nullable=False)
    date = Column(String, nullable=False)
    type = Column(String, nullable=False) # RECEIPT, ISSUE, TRANSFER, ADJUSTMENT
    source_warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    destination_warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    reference_number = Column(String, nullable=True)
    status = Column(String, default="Draft") # Draft, Posted, Cancelled
    notes = Column(String, nullable=True)

    source_warehouse = relationship("Warehouse", foreign_keys=[source_warehouse_id])
    destination_warehouse = relationship("Warehouse", foreign_keys=[destination_warehouse_id])
    project = relationship("Project")
    lines = relationship("InventoryTransactionLine", back_populates="transaction", cascade="all, delete-orphan")

class InventoryTransactionLine(BaseModel):
    __tablename__ = "inventory_transaction_lines"

    transaction_id = Column(String, ForeignKey("inventory_transactions.id"), nullable=False)
    material_id = Column(String, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, default=0.0)
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)

    transaction = relationship("InventoryTransaction", back_populates="lines")
    material = relationship("Material")

# ====================
# Project Operations
# ====================
class ProjectResource(BaseModel):
    __tablename__ = "project_resources"

    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    resource_type = Column(String, nullable=False) # 'Crew', 'Rig', 'Equipment'
    resource_id = Column(String, nullable=False) # ID of Crew, Rig, or Equipment
    start_date = Column(String, nullable=False) # YYYY-MM-DD
    end_date = Column(String, nullable=True) # YYYY-MM-DD
    notes = Column(String, nullable=True)

    project = relationship("Project")

class DailyProgressReport(BaseModel):
    __tablename__ = "daily_progress_reports"

    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    area_id = Column(String, ForeignKey("areas.id"), nullable=True)
    report_date = Column(String, nullable=False) # YYYY-MM-DD
    weather = Column(String, nullable=True)
    drilling_depth = Column(Float, default=0.0)
    activities_summary = Column(String, nullable=True)
    issues_encountered = Column(String, nullable=True)
    reported_by_id = Column(String, ForeignKey("employees.id"), nullable=True)
    status = Column(String, default="Draft") # Draft, Submitted, Approved

    project = relationship("Project")
    area = relationship("Area")
    reported_by = relationship("Employee")

# ====================
# Finance & Accounting
# ====================
class Journal(BaseModel):
    __tablename__ = "journals"

    journal_number = Column(String, unique=True, index=True, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    description = Column(String)
    ref_type = Column(String) # e.g. 'Manual', 'AP Invoice', 'AR Invoice'
    ref_id = Column(String) # ID of the reference document
    status = Column(String, default="Draft") # Draft, Posted
    attachment_path = Column(String, nullable=True)  # Path to uploaded bukti transfer
    attachment_path_2 = Column(String, nullable=True) # Path to dokumen dasar
    attachment_memo = Column(String, nullable=True)  # Memo/catatan tambahan untuk bukti

    lines = relationship("JournalLine", back_populates="journal", cascade="all, delete-orphan")

class JournalLine(BaseModel):
    __tablename__ = "journal_lines"

    journal_id = Column(String, ForeignKey("journals.id"), nullable=False)
    account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=False)
    cost_center_id = Column(String, ForeignKey("cost_centers.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    project_rab_id = Column(String, ForeignKey("project_rabs.id"), nullable=True)
    description = Column(String, nullable=True)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)

    journal = relationship("Journal", back_populates="lines")
    account = relationship("ChartOfAccount")
    cost_center = relationship("CostCenter")
    project = relationship("Project")
    project_rab = relationship("ProjectRab")

class ApInvoice(BaseModel):
    __tablename__ = "ap_invoices"

    invoice_number = Column(String, unique=True, index=True, nullable=False)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    date = Column(String, nullable=False) # YYYY-MM-DD
    due_date = Column(String, nullable=False) # YYYY-MM-DD
    description = Column(String, nullable=True)
    amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    status = Column(String, default="Draft") # Draft, Unpaid, Partial, Paid
    expense_account_id = Column(String, nullable=True)
    tax_account_id = Column(String, nullable=True)

    project_rab_id = Column(String, ForeignKey("project_rabs.id"), nullable=True)  # Optional RAB allocation
    vendor = relationship("Vendor")
    project = relationship("Project")
    project_rab = relationship("ProjectRab")

class ArInvoice(BaseModel):
    __tablename__ = "ar_invoices"

    invoice_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    date = Column(String, nullable=False) # YYYY-MM-DD
    due_date = Column(String, nullable=False) # YYYY-MM-DD
    description = Column(String, nullable=True)
    amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    status = Column(String, default="Draft") # Draft, Unpaid, Partial, Paid
    revenue_account_id = Column(String, nullable=True)
    tax_account_id = Column(String, nullable=True)
    milestone = Column(String, nullable=True, default="Field preparation")
    unit = Column(String, nullable=True, default="Lump Sump")
    po_number = Column(String, nullable=True)

    customer = relationship("Customer")
    project = relationship("Project")


class FixedAsset(BaseModel):
    __tablename__ = "fixed_assets"

    asset_number = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    asset_type = Column(String, nullable=True) # e.g. 'Rig', 'Equipment'
    purchase_date = Column(String, nullable=True)
    purchase_price = Column(Float, default=0.0)
    salvage_value = Column(Float, default=0.0)
    useful_life_years = Column(Integer, default=0)
    accumulated_depreciation = Column(Float, default=0.0)
    book_value = Column(Float, default=0.0)
    status = Column(String, default='Active')
    
    asset_account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=True)
    accumulated_depreciation_account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=True)
    depreciation_expense_account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=True)
    
    linked_rig_id = Column(String, ForeignKey("rigs.id"), nullable=True)
    linked_equipment_id = Column(String, ForeignKey("equipments.id"), nullable=True)
    
    rig = relationship("Rig", foreign_keys=[linked_rig_id])
    equipment = relationship("Equipment", foreign_keys=[linked_equipment_id])

class Expense(BaseModel):
    __tablename__ = "expenses"

    expense_number = Column(String, unique=True, index=True, nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    description = Column(String, nullable=False)
    amount = Column(Float, default=0.0)
    expense_account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=False)
    payment_account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=False)
    status = Column(String, default="Draft") # Draft, Submitted, Approved, Paid
    
    admin_fee_amount = Column(Float, default=0.0)
    admin_fee_account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=True)

    attachment_path = Column(String, nullable=True)
    attachment_path_2 = Column(String, nullable=True)

    project_rab_id = Column(String, ForeignKey("project_rabs.id"), nullable=True)  # Optional RAB allocation
    fixed_asset_id = Column(String, ForeignKey("fixed_assets.id"), nullable=True) # Tag asset for maintenance/repairs
    employee = relationship("Employee")
    fixed_asset = relationship("FixedAsset")
    project = relationship("Project")
    project_rab = relationship("ProjectRab")
    expense_account = relationship("ChartOfAccount", foreign_keys=[expense_account_id])
    payment_account = relationship("ChartOfAccount", foreign_keys=[payment_account_id])

class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"
    po_number = Column(String, unique=True, index=True)
    vendor_id = Column(String, ForeignKey("vendors.id"))
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    date = Column(String)
    status = Column(String, default="Draft") # Draft, Approved, Completed, Cancelled
    subtotal = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    notes = Column(String, nullable=True)
    category = Column(String, default="Jasa Subkontraktor") # Jasa Subkontraktor, Material Proyek, Sewa Alat, Aset / Mesin Proyek, Aset Peralatan Kantor, Operasional Kantor
    payment_terms = Column(String, default="Net 30 Hari")   # Net 7 Hari, Net 14 Hari, Net 30 Hari, COD, Selesai Pekerjaan
    due_date = Column(String, nullable=True)               # YYYY-MM-DD
    account_id = Column(String, ForeignKey("chart_of_accounts.id"), nullable=True)

    # Track auto-generated documents
    ap_invoice_id = Column(String, nullable=True)  # ID of auto-created AP Invoice
    journal_id = Column(String, nullable=True)      # ID of auto-created Journal Entry

    vendor = relationship("Vendor", foreign_keys=[vendor_id])
    project = relationship("Project", foreign_keys=[project_id])
    account = relationship("ChartOfAccount", foreign_keys=[account_id])
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")

class PurchaseOrderItem(BaseModel):
    __tablename__ = "purchase_order_items"
    purchase_order_id = Column(String, ForeignKey("purchase_orders.id"))
    item_code = Column(String, nullable=True)
    description = Column(String)
    quantity = Column(Float, default=1.0)
    unit = Column(String, nullable=True)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")


# ====================
# Billing Schedule (Invoice Termin)
# ====================
class BillingSchedule(BaseModel):
    __tablename__ = "billing_schedules"

    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    schedule_number = Column(String, unique=True, nullable=False)
    contract_description = Column(String, nullable=True)
    contract_number = Column(String, nullable=True)

    total_contract_value = Column(Float, default=0.0)
    currency = Column(String, default="IDR")
    exchange_rate = Column(Float, default=1.0)

    include_ppn = Column(Boolean, default=False)
    ppn_rate = Column(Float, default=11.0)

    bank_name = Column(String, nullable=True)
    bank_account_number = Column(String, nullable=True)
    bank_account_name = Column(String, nullable=True)

    notes = Column(String, nullable=True)
    status = Column(String, default="Active")  # Active, Completed, Cancelled

    project = relationship("Project")
    customer = relationship("Customer")
    terms = relationship("BillingTerm", back_populates="billing_schedule",
                         cascade="all, delete-orphan", order_by="BillingTerm.term_number")


class BillingTerm(BaseModel):
    __tablename__ = "billing_terms"

    billing_schedule_id = Column(String, ForeignKey("billing_schedules.id"), nullable=False)
    term_number = Column(Integer, nullable=False)
    term_name = Column(String, nullable=False)          # e.g. "Uang Muka (DP)"
    term_name_en = Column(String, nullable=True)         # e.g. "Down Payment"

    percentage = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)
    amount_before_tax = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    due_date = Column(String, nullable=True)
    description = Column(String, nullable=True)
    description_en = Column(String, nullable=True)

    status = Column(String, default="Pending")          # Pending, Invoiced, Paid
    invoice_number = Column(String, nullable=True)
    invoice_date = Column(String, nullable=True)
    ar_invoice_id = Column(String, nullable=True)

    billing_schedule = relationship("BillingSchedule", back_populates="terms")


# ====================
# User & Admin Profile
# ====================
class UserProfile(BaseModel):
    __tablename__ = "user_profiles"

    name = Column(String, default="Super Admin", nullable=False)
    username = Column(String, default="admin", nullable=False)
    email = Column(String, default="admin@ansa.com", nullable=False)
    phone = Column(String, default="+62 812 3456 7890", nullable=True)
    photo = Column(Text, nullable=True) # Durable Base64 data URL
    password_hash = Column(String, nullable=True)
