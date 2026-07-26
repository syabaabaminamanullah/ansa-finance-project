from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime, timedelta

from db.database import get_db
from db.models import (
    PurchaseOrder as DB_PurchaseOrder,
    PurchaseOrderItem as DB_PurchaseOrderItem,
    Vendor, Project,
    ApInvoice, Journal, JournalLine, ChartOfAccount
)
from schemas.procurement import PurchaseOrder, PurchaseOrderCreate

router = APIRouter()


def _enrich_po(po, db: Session) -> PurchaseOrder:
    """Helper: tambahkan vendor_name dan project_name ke response."""
    vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
    project = db.query(Project).filter(Project.id == po.project_id).first() if po.project_id else None

    result = PurchaseOrder.from_orm(po)
    result.vendor_name = vendor.name if vendor else None
    result.project_name = project.name if project else None
    return result


def _get_default_expense_account(db: Session) -> str:
    """Cari akun Biaya Subkontraktor (5110) sebagai default."""
    acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == "5110").first()
    if not acc:
        # Fallback: akun expense pertama yang ada
        acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_type == "Expense").first()
    return acc.id if acc else None


def _get_ap_account(db: Session) -> str:
    """Cari akun Hutang Usaha (2110)."""
    acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == "2110").first()
    return acc.id if acc else None


def _auto_create_ap_and_journal(po: DB_PurchaseOrder, db: Session):
    """
    Dipanggil saat PO berstatus Completed.
    Membuat:
      1. AP Invoice (Hutang Vendor) — status Unpaid
      2. Journal Entry — Debit Biaya, Credit Hutang Usaha
    """
    today = datetime.utcnow().strftime("%Y-%m-%d")
    due_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")

    # ── 1. Buat AP Invoice ──────────────────────────────────────────────
    ap_number = f"AP-{datetime.utcnow().strftime('%Y%m%d')}-{po.po_number}"

    # Cek apakah AP Invoice dari PO ini sudah pernah dibuat
    existing_ap = db.query(ApInvoice).filter(ApInvoice.invoice_number == ap_number).first()
    if existing_ap:
        return  # Sudah ada, skip

    expense_account_id = _get_default_expense_account(db)
    ap_account_id = _get_ap_account(db)

    ap_invoice = ApInvoice(
        id=str(uuid.uuid4()),
        invoice_number=ap_number,
        vendor_id=po.vendor_id,
        project_id=po.project_id,
        date=today,
        due_date=due_date,
        description=f"AP dari PO {po.po_number} - {', '.join([item.description for item in po.items[:2]])}",
        amount=po.total_amount,
        tax_amount=0.0,
        total_amount=po.total_amount,
        amount_paid=0.0,
        status="Unpaid",
        expense_account_id=expense_account_id,
    )
    db.add(ap_invoice)

    # ── 2. Buat Journal Entry ───────────────────────────────────────────
    journal_number = f"JNL-PO-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
    vendor_name = vendor.name if vendor else "Unknown Vendor"

    journal = Journal(
        id=str(uuid.uuid4()),
        journal_number=journal_number,
        date=today,
        description=f"Biaya dari PO {po.po_number} ({vendor_name})",
        ref_type="Purchase Order",
        ref_id=po.id,
        status="Posted"
    )
    db.add(journal)

    # Debit: Biaya Subkontraktor / Expense
    if expense_account_id:
        debit_line = JournalLine(
            id=str(uuid.uuid4()),
            journal_id=journal.id,
            account_id=expense_account_id,
            project_id=po.project_id,
            description=f"Biaya jasa - PO {po.po_number}",
            debit=po.total_amount,
            credit=0.0
        )
        db.add(debit_line)

    # Credit: Hutang Usaha (AP)
    if ap_account_id:
        credit_line = JournalLine(
            id=str(uuid.uuid4()),
            journal_id=journal.id,
            account_id=ap_account_id,
            project_id=po.project_id,
            description=f"Hutang ke {vendor_name} - PO {po.po_number}",
            debit=0.0,
            credit=po.total_amount
        )
        db.add(credit_line)

    db.commit()


# ═══════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════

@router.post("/po", response_model=PurchaseOrder)
def create_purchase_order(po: PurchaseOrderCreate, db: Session = Depends(get_db)):
    db_po = DB_PurchaseOrder(
        id=str(uuid.uuid4()),
        po_number=po.po_number,
        vendor_id=po.vendor_id,
        project_id=po.project_id,
        date=po.date,
        status=po.status,
        total_amount=po.total_amount,
        notes=po.notes
    )
    db.add(db_po)

    for item in po.items:
        db_item = DB_PurchaseOrderItem(
            id=str(uuid.uuid4()),
            purchase_order_id=db_po.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_po)
    return _enrich_po(db_po, db)


@router.get("/po", response_model=List[PurchaseOrder])
def get_purchase_orders(db: Session = Depends(get_db)):
    pos = db.query(DB_PurchaseOrder).order_by(DB_PurchaseOrder.created_at.desc()).all()
    return [_enrich_po(p, db) for p in pos]


@router.put("/po/{po_id}/status")
def update_po_status(po_id: str, status: str, db: Session = Depends(get_db)):
    db_po = db.query(DB_PurchaseOrder).filter(DB_PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    old_status = db_po.status
    db_po.status = status
    db.commit()
    db.refresh(db_po)

    # ── INTEGRASI OTOMATIS saat PO Completed ───────────────────────────
    if status == "Completed" and old_status != "Completed":
        _auto_create_ap_and_journal(db_po, db)

    return _enrich_po(db_po, db)


@router.delete("/po/{po_id}")
def delete_purchase_order(po_id: str, db: Session = Depends(get_db)):
    db_po = db.query(DB_PurchaseOrder).filter(DB_PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    # Cascade delete associated Journal
    journals = db.query(Journal).filter(Journal.ref_id == po_id).all()
    for jnl in journals:
        db.query(JournalLine).filter(JournalLine.journal_id == jnl.id).delete()
        db.delete(jnl)
        
    # Cascade delete associated AP Invoice (by description match since we didn't save ap_invoice_id in retro script)
    ap = db.query(ApInvoice).filter(ApInvoice.description.contains(db_po.po_number)).first()
    if ap:
        db.delete(ap)

    # Delete PO Items and PO
    db.query(DB_PurchaseOrderItem).filter(
        DB_PurchaseOrderItem.purchase_order_id == po_id
    ).delete()
    db.delete(db_po)
    
    db.commit()
    return {"detail": "Purchase order and its financial records deleted successfully"}


@router.get("/po/{po_id}/ap-invoice")
def get_po_ap_invoice(po_id: str, db: Session = Depends(get_db)):
    """Cek apakah PO ini sudah punya AP Invoice terkait."""
    db_po = db.query(DB_PurchaseOrder).filter(DB_PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    ap_number = f"AP-{datetime.utcnow().strftime('%Y%m%d')}-{db_po.po_number}"
    # Cari berdasarkan vendor + amount + ref
    ap = db.query(ApInvoice).filter(
        ApInvoice.vendor_id == db_po.vendor_id,
        ApInvoice.total_amount == db_po.total_amount,
        ApInvoice.description.contains(db_po.po_number)
    ).first()

    if not ap:
        return {"has_ap_invoice": False, "ap_invoice": None}

    return {
        "has_ap_invoice": True,
        "ap_invoice": {
            "id": ap.id,
            "invoice_number": ap.invoice_number,
            "status": ap.status,
            "total_amount": ap.total_amount,
            "due_date": ap.due_date
        }
    }
