from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
import uuid

from db.database import get_db
from db.models import BillingSchedule, BillingTerm, Project, Customer, ArInvoice, Journal, JournalLine, ChartOfAccount

router = APIRouter()

# ---- Pydantic Schemas ----

class BillingTermInput(BaseModel):
    term_number: int
    term_name: str
    term_name_en: Optional[str] = None
    percentage: float
    amount: Optional[float] = None
    due_date: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None

class BillingScheduleCreate(BaseModel):
    project_id: Optional[str] = None
    customer_id: str
    contract_description: Optional[str] = None
    contract_number: Optional[str] = None
    total_contract_value: float
    currency: str = "IDR"
    exchange_rate: float = 1.0
    include_ppn: bool = False
    ppn_rate: float = 11.0
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    notes: Optional[str] = None
    terms: List[BillingTermInput]

class BillingTermCreate(BaseModel):
    term_number: Optional[int] = None
    term_name: str
    term_name_en: Optional[str] = None
    percentage: Optional[float] = 0.0
    amount: Optional[float] = 0.0
    due_date: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    unit: Optional[str] = "Lump Sump"

class BillingTermUpdate(BaseModel):
    term_name: Optional[str] = None
    term_name_en: Optional[str] = None
    percentage: Optional[float] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None

class BillingScheduleUpdate(BaseModel):
    project_id: Optional[str] = None
    customer_id: Optional[str] = None
    contract_description: Optional[str] = None
    contract_number: Optional[str] = None
    total_contract_value: Optional[float] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    include_ppn: Optional[bool] = None
    ppn_rate: Optional[float] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    notes: Optional[str] = None

class GenerateInvoiceRequest(BaseModel):
    invoice_date: str
    revenue_account_id: Optional[str] = None
    tax_account_id: Optional[str] = None
    ar_account_id: Optional[str] = None

# ---- Helper: generate schedule number ----

def generate_schedule_number(db: Session) -> str:
    count = db.query(BillingSchedule).count()
    return f"BS-{count + 1:04d}"

def generate_billing_invoice_number(db: Session, schedule: BillingSchedule, term: BillingTerm, invoice_date: str) -> str:
    """Format: INV/[seq]/[project_code]/[MM]/[YYYY]"""
    dt = datetime.strptime(invoice_date, "%Y-%m-%d")
    month = dt.strftime("%m")
    year = dt.strftime("%Y")

    project_code = "OH"
    if schedule.project_id:
        proj = db.query(Project).filter(Project.id == schedule.project_id).first()
        if proj and proj.code:
            project_code = proj.code

    # Count existing invoices this month for sequence
    prefix_like = f"INV/%/{project_code}/{month}/{year}"
    existing = db.query(BillingTerm).filter(
        BillingTerm.invoice_number.like(f"INV/%/{project_code}/{month}/{year}")
    ).count()

    seq = existing + 1
    return f"INV/{seq:03d}/{project_code}/{month}/{year}"

# ---- Routes ----

@router.post("/billing-schedules", status_code=201)
def create_billing_schedule(payload: BillingScheduleCreate, db: Session = Depends(get_db)):
    # Validate customer exists
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Create schedule
    schedule = BillingSchedule(
        id=str(uuid.uuid4()),
        project_id=payload.project_id,
        customer_id=payload.customer_id,
        schedule_number=generate_schedule_number(db),
        contract_description=payload.contract_description,
        contract_number=payload.contract_number,
        total_contract_value=payload.total_contract_value,
        currency=payload.currency,
        exchange_rate=payload.exchange_rate,
        include_ppn=payload.include_ppn,
        ppn_rate=payload.ppn_rate,
        bank_name=payload.bank_name,
        bank_account_number=payload.bank_account_number,
        bank_account_name=payload.bank_account_name,
        notes=payload.notes,
        status="Active"
    )
    db.add(schedule)
    db.flush()

    # Create terms
    for t in payload.terms:
        # Calculate amounts and percentage
        base_amount = t.amount if (t.amount and t.amount > 0) else (t.percentage / 100.0) * payload.total_contract_value
        pct = t.percentage if (t.percentage and t.percentage > 0) else ((base_amount / payload.total_contract_value * 100.0) if payload.total_contract_value > 0 else 0.0)
        tax_amount = (base_amount * payload.ppn_rate / 100.0) if payload.include_ppn else 0.0
        total = base_amount + tax_amount

        term = BillingTerm(
            id=str(uuid.uuid4()),
            billing_schedule_id=schedule.id,
            term_number=t.term_number,
            term_name=t.term_name,
            term_name_en=t.term_name_en,
            percentage=round(pct, 2),
            amount=base_amount,
            amount_before_tax=base_amount,
            tax_amount=tax_amount,
            total_amount=total,
            due_date=t.due_date,
            description=t.description,
            description_en=t.description_en,
            status="Pending"
        )
        db.add(term)

    db.commit()
    db.refresh(schedule)

    return _serialize_schedule(schedule)


@router.get("/billing-schedules")
def list_billing_schedules(db: Session = Depends(get_db)):
    schedules = db.query(BillingSchedule).order_by(BillingSchedule.created_at.desc()).all()
    return [_serialize_schedule(s) for s in schedules]


@router.get("/billing-schedules/{schedule_id}")
def get_billing_schedule(schedule_id: str, db: Session = Depends(get_db)):
    schedule = db.query(BillingSchedule).filter(BillingSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Billing schedule not found")
    return _serialize_schedule(schedule)


@router.put("/billing-schedules/{schedule_id}")
def update_billing_schedule(schedule_id: str, payload: BillingScheduleUpdate, db: Session = Depends(get_db)):
    schedule = db.query(BillingSchedule).filter(BillingSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    for key, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(schedule, key, val)

    db.commit()
    db.refresh(schedule)
    return _serialize_schedule(schedule)

@router.put("/billing-schedules/{schedule_id}/terms/{term_id}")
def update_billing_term(schedule_id: str, term_id: str, payload: BillingTermUpdate, db: Session = Depends(get_db)):
    term = db.query(BillingTerm).filter(
        BillingTerm.id == term_id,
        BillingTerm.billing_schedule_id == schedule_id
    ).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")

    for key, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(term, key, val)

    # Recalculate amounts if percentage or amount changed
    if payload.percentage is not None or payload.amount is not None:
        schedule = db.query(BillingSchedule).filter(BillingSchedule.id == schedule_id).first()
        base = term.amount if payload.amount is None else payload.amount
        if payload.percentage is not None and payload.amount is None and schedule:
            base = (payload.percentage / 100.0) * schedule.total_contract_value
        tax = (base * schedule.ppn_rate / 100.0) if (schedule and schedule.include_ppn) else 0.0
        term.amount = base
        term.amount_before_tax = base
        term.tax_amount = tax
        term.total_amount = base + tax

    # Also update linked AR Invoice if present
    if term.ar_invoice_id:
        ar = db.query(ArInvoice).filter(ArInvoice.id == term.ar_invoice_id).first()
        if ar:
            if payload.invoice_number:
                ar.invoice_number = payload.invoice_number
            if payload.invoice_date:
                ar.date = payload.invoice_date
            if payload.due_date:
                ar.due_date = payload.due_date
            if payload.amount is not None or payload.percentage is not None:
                ar.amount = term.amount_before_tax
                ar.tax_amount = term.tax_amount
                ar.total_amount = term.total_amount

    db.commit()
    db.refresh(term)
    return _serialize_term(term)


@router.post("/billing-schedules/{schedule_id}/terms/{term_id}/generate-invoice")
def generate_invoice_for_term(
    schedule_id: str,
    term_id: str,
    payload: GenerateInvoiceRequest,
    db: Session = Depends(get_db)
):
    schedule = db.query(BillingSchedule).filter(BillingSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    term = db.query(BillingTerm).filter(
        BillingTerm.id == term_id,
        BillingTerm.billing_schedule_id == schedule_id
    ).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    if term.status == "Invoiced" or term.status == "Paid":
        raise HTTPException(status_code=400, detail="Invoice already generated for this term")

    # Check previous terms are invoiced (except term 1)
    if term.term_number > 1:
        prev = db.query(BillingTerm).filter(
            BillingTerm.billing_schedule_id == schedule_id,
            BillingTerm.term_number == term.term_number - 1
        ).first()
        if prev and prev.status == "Pending":
            raise HTTPException(
                status_code=400,
                detail=f"Termin {term.term_number - 1} belum dibuatkan invoice. Harap buat invoice termin sebelumnya terlebih dahulu."
            )

    # Generate invoice number
    inv_number = generate_billing_invoice_number(db, schedule, term, payload.invoice_date)

    # Create AR Invoice
    project_desc = ""
    if schedule.project_id:
        proj = db.query(Project).filter(Project.id == schedule.project_id).first()
        if proj:
            project_desc = f" - {proj.name}"

    ar_inv = ArInvoice(
        id=str(uuid.uuid4()),
        invoice_number=inv_number,
        customer_id=schedule.customer_id,
        project_id=schedule.project_id,
        date=payload.invoice_date,
        due_date=term.due_date or payload.invoice_date,
        description=f"{term.term_name} {project_desc} | {term.description or ''}".strip(" |"),
        amount=term.amount_before_tax,
        tax_amount=term.tax_amount,
        total_amount=term.total_amount,
        amount_paid=0.0,
        status="Unpaid",
        revenue_account_id=payload.revenue_account_id,
        tax_account_id=payload.tax_account_id,
    )
    db.add(ar_inv)

    # Update term
    term.status = "Invoiced"
    term.invoice_number = inv_number
    term.invoice_date = payload.invoice_date
    term.ar_invoice_id = ar_inv.id

    db.commit()
    db.refresh(term)

    return {
        "message": "Invoice berhasil dibuat",
        "invoice_number": inv_number,
        "ar_invoice_id": ar_inv.id,
        "term": _serialize_term(term)
    }


@router.put("/billing-schedules/{schedule_id}/terms/{term_id}/mark-paid")
def mark_term_paid(schedule_id: str, term_id: str, db: Session = Depends(get_db)):
    term = db.query(BillingTerm).filter(
        BillingTerm.id == term_id,
        BillingTerm.billing_schedule_id == schedule_id
    ).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    term.status = "Paid"
    # Also update AR Invoice if linked
    if term.ar_invoice_id:
        ar = db.query(ArInvoice).filter(ArInvoice.id == term.ar_invoice_id).first()
        if ar:
            ar.status = "Paid"
            ar.amount_paid = ar.total_amount
    db.commit()
    return {"message": "Termin marked as Paid"}


@router.post("/billing-schedules/{schedule_id}/terms", status_code=201)
def add_billing_term(schedule_id: str, payload: BillingTermCreate, db: Session = Depends(get_db)):
    schedule = db.query(BillingSchedule).filter(BillingSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    existing_count = db.query(BillingTerm).filter(BillingTerm.billing_schedule_id == schedule_id).count()
    term_num = payload.term_number or (existing_count + 1)

    base = payload.amount if (payload.amount and payload.amount > 0) else ((payload.percentage / 100.0) * schedule.total_contract_value if payload.percentage else 0.0)
    pct = payload.percentage if (payload.percentage and payload.percentage > 0) else (((base / schedule.total_contract_value) * 100.0) if schedule.total_contract_value > 0 else 0.0)
    tax = (base * schedule.ppn_rate / 100.0) if schedule.include_ppn else 0.0

    term = BillingTerm(
        id=str(uuid.uuid4()),
        billing_schedule_id=schedule.id,
        term_number=term_num,
        term_name=payload.term_name,
        term_name_en=payload.term_name_en,
        percentage=round(pct, 2),
        amount=base,
        amount_before_tax=base,
        tax_amount=tax,
        total_amount=base + tax,
        due_date=payload.due_date,
        description=payload.description,
        description_en=payload.description_en,
        unit=payload.unit or "Lump Sump",
        status="Pending"
    )
    db.add(term)
    db.commit()
    db.refresh(term)
    return _serialize_term(term)

@router.delete("/billing-schedules/{schedule_id}/terms/{term_id}")
def delete_billing_term(schedule_id: str, term_id: str, db: Session = Depends(get_db)):
    term = db.query(BillingTerm).filter(
        BillingTerm.id == term_id,
        BillingTerm.billing_schedule_id == schedule_id
    ).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    if term.status != "Pending":
        raise HTTPException(status_code=400, detail="Cannot delete an Invoiced or Paid term")

    db.delete(term)
    db.commit()
    return {"message": "Term deleted successfully"}

@router.delete("/billing-schedules/{schedule_id}")
def delete_billing_schedule(schedule_id: str, db: Session = Depends(get_db)):
    schedule = db.query(BillingSchedule).filter(BillingSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(schedule)
    db.commit()
    return {"message": "Deleted"}


# ---- Serializers ----

def _serialize_term(t: BillingTerm) -> dict:
    return {
        "id": t.id,
        "billing_schedule_id": t.billing_schedule_id,
        "term_number": t.term_number,
        "term_name": t.term_name,
        "term_name_en": t.term_name_en,
        "percentage": t.percentage,
        "amount": t.amount,
        "amount_before_tax": t.amount_before_tax,
        "tax_amount": t.tax_amount,
        "total_amount": t.total_amount,
        "due_date": t.due_date,
        "description": t.description,
        "description_en": t.description_en,
        "status": t.status,
        "invoice_number": t.invoice_number,
        "invoice_date": t.invoice_date,
        "ar_invoice_id": t.ar_invoice_id,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _serialize_schedule(s: BillingSchedule) -> dict:
    return {
        "id": s.id,
        "schedule_number": s.schedule_number,
        "project_id": s.project_id,
        "customer_id": s.customer_id,
        "project_name": s.project.name if s.project else None,
        "project_code": s.project.code if s.project else None,
        "customer_name": s.customer.name if s.customer else None,
        "contract_description": s.contract_description,
        "contract_number": s.contract_number,
        "total_contract_value": s.total_contract_value,
        "currency": s.currency,
        "exchange_rate": s.exchange_rate,
        "include_ppn": s.include_ppn,
        "ppn_rate": s.ppn_rate,
        "bank_name": s.bank_name,
        "bank_account_number": s.bank_account_number,
        "bank_account_name": s.bank_account_name,
        "notes": s.notes,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "terms": [_serialize_term(t) for t in s.terms],
        "total_invoiced": sum(t.total_amount for t in s.terms if t.status in ("Invoiced", "Paid")),
        "total_paid": sum(t.total_amount for t in s.terms if t.status == "Paid"),
        "terms_count": len(s.terms),
    }
