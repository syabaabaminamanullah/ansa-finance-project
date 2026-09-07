# BillingSchedule & BillingTerm models added to models.py
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Float, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid

# (These are appended to the existing models.py)

class BillingSchedule(Base):
    __abstract__ = False
    __tablename__ = "billing_schedules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    schedule_number = Column(String, unique=True, nullable=False)  # e.g. BS-001
    contract_description = Column(Text, nullable=True)
    contract_number = Column(String, nullable=True)

    # Contract value
    total_contract_value = Column(Float, default=0.0)  # in base currency
    currency = Column(String, default="IDR")  # IDR or USD
    exchange_rate = Column(Float, default=1.0)  # USD->IDR rate

    # PPN settings
    include_ppn = Column(Boolean, default=False)
    ppn_rate = Column(Float, default=11.0)  # percent

    # Bank/payment info for invoice
    bank_name = Column(String, nullable=True)
    bank_account_number = Column(String, nullable=True)
    bank_account_name = Column(String, nullable=True)

    notes = Column(Text, nullable=True)
    status = Column(String, default="Active")  # Active, Completed, Cancelled

    # Relationships
    project = relationship("Project")
    customer = relationship("Customer")
    terms = relationship("BillingTerm", back_populates="billing_schedule", cascade="all, delete-orphan", order_by="BillingTerm.term_number")


class BillingTerm(Base):
    __abstract__ = False
    __tablename__ = "billing_terms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    billing_schedule_id = Column(String, ForeignKey("billing_schedules.id"), nullable=False)
    term_number = Column(Integer, nullable=False)  # 1, 2, 3, 4...
    term_name = Column(String, nullable=False)  # "Uang Muka (DP)", "Termin 1", "Pelunasan"
    term_name_en = Column(String, nullable=True)  # English: "Down Payment", "Milestone 1"

    percentage = Column(Float, default=0.0)  # e.g. 30.0 means 30%
    amount = Column(Float, default=0.0)  # calculated: percentage * total / 100
    amount_before_tax = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)  # amount + tax

    due_date = Column(String, nullable=True)  # YYYY-MM-DD
    description = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)

    # Invoice tracking
    status = Column(String, default="Pending")  # Pending, Invoiced, Paid
    invoice_number = Column(String, nullable=True)  # generated invoice number
    invoice_date = Column(String, nullable=True)
    ar_invoice_id = Column(String, nullable=True)  # FK to ar_invoices

    billing_schedule = relationship("BillingSchedule", back_populates="terms")
