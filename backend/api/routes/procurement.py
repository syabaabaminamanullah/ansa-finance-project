from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
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
    """Helper: tambahkan vendor_name, vendor address/contact, dan project_name ke response."""
    vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
    project = db.query(Project).filter(Project.id == po.project_id).first() if po.project_id else None
    account = db.query(ChartOfAccount).filter(ChartOfAccount.id == po.account_id).first() if getattr(po, 'account_id', None) else None

    result = PurchaseOrder.from_orm(po)
    if vendor:
        result.vendor_name = vendor.name
        result.vendor_code = getattr(vendor, 'code', None)
        result.vendor_address = getattr(vendor, 'address', None)
        result.vendor_contact = getattr(vendor, 'contact', None)
        result.vendor_phone = getattr(vendor, 'contact', None)
        result.vendor_npwp = getattr(vendor, 'npwp', None)
    if project:
        result.project_name = project.name
        result.project_code = getattr(project, 'code', None)
    if account:
        result.account_code = account.account_code
        result.account_name = account.account_name

    # Enrich AP Invoice status and amount paid
    ap = None
    if po.ap_invoice_id:
        ap = db.query(ApInvoice).filter(ApInvoice.id == po.ap_invoice_id).first()
    if not ap and po.po_number:
        ap = db.query(ApInvoice).filter(
            (ApInvoice.invoice_number.contains(po.po_number)) | (ApInvoice.description.contains(po.po_number))
        ).first()

    if ap:
        result.ap_invoice_id = ap.id
        result.ap_invoice_number = ap.invoice_number
        result.ap_status = ap.status
        result.amount_paid = ap.amount_paid or 0.0
    else:
        result.ap_status = None
        result.amount_paid = 0.0

    return result


def _get_account_by_code(db: Session, code: str) -> Optional[str]:
    """Cari akun berdasarkan account_code."""
    acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == code).first()
    return acc.id if acc else None


def _get_default_expense_account(db: Session) -> str:
    """Cari akun Biaya Subkontraktor (51100 / 5110) sebagai default."""
    acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_code.in_(["51100", "5110"])).first()
    if not acc:
        acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_type == "Expense").first()
    return acc.id if acc else None


def _get_ap_account(db: Session) -> str:
    """Cari akun Hutang Usaha (21100 / 2110)."""
    acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_code.in_(["21100", "2110"])).first()
    return acc.id if acc else None


def _get_tax_account(db: Session) -> str:
    """Cari akun Pajak Dibayar Dimuka / PPN Masukan (11600)."""
    acc = db.query(ChartOfAccount).filter(ChartOfAccount.account_code.in_(["11600", "1160"])).first()
    return acc.id if acc else None


def _auto_create_ap_and_journal(po: DB_PurchaseOrder, db: Session):
    """
    Dipanggil saat PO berstatus Completed.
    Membuat:
      1. AP Invoice (Hutang Vendor) — status Unpaid, dengan Due Date sesuai Payment Terms
      2. Journal Entry — Menentukan Debit Akun (Aset vs COGS Material vs Subkon Jasa vs Biaya Kantor)
    """
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Hitung Tanggal Jatuh Tempo berdasarkan payment terms / due_date
    due_date = getattr(po, 'due_date', None)
    if not due_date:
        terms = getattr(po, 'payment_terms', 'Net 30 Hari') or 'Net 30 Hari'
        base_date = datetime.utcnow()
        try:
            if po.date:
                base_date = datetime.strptime(po.date, "%Y-%m-%d")
        except Exception:
            pass

        if "7" in terms:
            due_date = (base_date + timedelta(days=7)).strftime("%Y-%m-%d")
        elif "14" in terms:
            due_date = (base_date + timedelta(days=14)).strftime("%Y-%m-%d")
        elif "COD" in terms or "Cash" in terms or "Tunai" in terms:
            due_date = po.date or today
        else:
            due_date = (base_date + timedelta(days=30)).strftime("%Y-%m-%d")

    # ── 1. Tentukan Akun Debit & Alokasi Proyek ──────────────────────────
    # Pembedaan Kategori:
    # 1. Jasa Subkon (51100) -> COGS Proyek
    # 2. Material Habis Pakai (51200) -> COGS Proyek
    # 3. Sewa Alat Berat (51300) -> COGS Proyek
    # 4. Aset Mesin / Drilling Rig (12100) -> CAPEX Neraca (Bukan Biaya Proyek Langsung)
    # 5. Aset Peralatan Kantor (12400) -> CAPEX Neraca (Bukan Biaya Proyek)
    # 6. Biaya Operasional Kantor (61700) -> OPEX Kantor (Bukan Biaya Proyek)
    cat = getattr(po, 'category', '') or 'Jasa Subkontraktor'
    target_account_id = getattr(po, 'account_id', None)
    is_capex = False
    is_office_opex = False

    if not target_account_id:
        if "Material" in cat:
            target_account_id = _get_account_by_code(db, "51200") # Biaya Material & Consumables Proyek
        elif "Sewa" in cat:
            target_account_id = _get_account_by_code(db, "51300") # Biaya Sewa Alat Berat
        elif "Mesin" in cat or "Alat Berat" in cat or ("Aset" in cat and "Kantor" not in cat):
            target_account_id = _get_account_by_code(db, "12100") # Aset Alat Berat (Drilling Rigs)
            is_capex = True
        elif "Kantor" in cat and "Aset" in cat:
            target_account_id = _get_account_by_code(db, "12400") # Aset Peralatan Kantor
            is_capex = True
        elif "Kantor" in cat or "Operasional" in cat:
            target_account_id = _get_account_by_code(db, "61700") # Biaya Perlengkapan Kantor
            is_office_opex = True
        else:
            target_account_id = _get_account_by_code(db, "51100") # Biaya Subkontraktor

    if not target_account_id:
        target_account_id = _get_default_expense_account(db)

    # Bila CAPEX atau OPEX Kantor, project_id tidak membebani RAB Proyek
    allocated_project_id = None if (is_capex or is_office_opex) else po.project_id

    ap_account_id = _get_ap_account(db)
    tax_account_id = _get_tax_account(db)

    subtotal_val = po.subtotal if (po.subtotal and po.subtotal > 0) else (po.total_amount - (po.tax_amount or 0.0))
    tax_val = po.tax_amount or 0.0

    # ── 2. Buat AP Invoice ──────────────────────────────────────────────
    ap_number = f"AP-{datetime.utcnow().strftime('%Y%m%d')}-{po.po_number}"

    existing_ap = db.query(ApInvoice).filter(ApInvoice.invoice_number == ap_number).first()
    if not existing_ap:
        first_desc = po.items[0].description if po.items else "Pengadaan PO"
        ap_invoice = ApInvoice(
            id=str(uuid.uuid4()),
            invoice_number=ap_number,
            vendor_id=po.vendor_id,
            project_id=allocated_project_id,
            date=today,
            due_date=due_date,
            description=f"AP dari PO {po.po_number} ({cat}) - {first_desc}",
            amount=subtotal_val,
            tax_amount=tax_val,
            total_amount=po.total_amount,
            amount_paid=0.0,
            status="Unpaid",
            expense_account_id=target_account_id,
        )
        db.add(ap_invoice)
        po.ap_invoice_id = ap_invoice.id

    # ── 3. Buat Journal Entry ───────────────────────────────────────────
    journal_number = f"JNL-PO-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    vendor = db.query(Vendor).filter(Vendor.id == po.vendor_id).first()
    vendor_name = vendor.name if vendor else "Unknown Vendor"

    journal = Journal(
        id=str(uuid.uuid4()),
        journal_number=journal_number,
        date=today,
        description=f"Pengadaan {cat} - PO {po.po_number} ({vendor_name})",
        ref_type="Purchase Order",
        ref_id=po.id,
        status="Posted"
    )
    db.add(journal)
    po.journal_id = journal.id

    # Debit Line: Aset / COGS Material / Biaya Subkon / Biaya Kantor
    if target_account_id:
        debit_line = JournalLine(
            id=str(uuid.uuid4()),
            journal_id=journal.id,
            account_id=target_account_id,
            project_id=allocated_project_id,
            description=f"DPP {cat} - PO {po.po_number}",
            debit=subtotal_val,
            credit=0.0
        )
        db.add(debit_line)

    # Debit Line: PPN Masukan (Jika ada PPN)
    if tax_val > 0 and tax_account_id:
        tax_debit_line = JournalLine(
            id=str(uuid.uuid4()),
            journal_id=journal.id,
            account_id=tax_account_id,
            project_id=allocated_project_id,
            description=f"PPN Masukan (Pajak) - PO {po.po_number}",
            debit=tax_val,
            credit=0.0
        )
        db.add(tax_debit_line)

    # Credit Line: Hutang Usaha (AP)
    if ap_account_id:
        credit_line = JournalLine(
            id=str(uuid.uuid4()),
            journal_id=journal.id,
            account_id=ap_account_id,
            project_id=allocated_project_id,
            description=f"Hutang ke {vendor_name} - PO {po.po_number}",
            debit=0.0,
            credit=po.total_amount
        )
        db.add(credit_line)

    db.commit()


def generate_po_number(db: Session, date_str: str = None) -> str:
    """
    Format Baku Penomoran PO Otomatis:
    CGE-PO-YYMM-XXXX (Contoh: CGE-PO-2609-0010)
    - CGE  : Penanda dokumen dikeluarkan oleh PT Coreterra Geo Engineering
    - PO   : Kode dokumen Purchase Order
    - YY   : 2 digit tahun berjalan (misal 26 untuk 2026)
    - MM   : 2 digit bulan berjalan (misal 09 untuk September)
    - XXXX : 4 digit nomor urut sekuensial
    """
    if not date_str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    date_val = str(date_str).split('T')[0] if 'T' in str(date_str) else str(date_str)
    parts = date_val.split('-')
    if len(parts) >= 2:
        yymm = f"{parts[0][-2:]}{parts[1].zfill(2)}"  # e.g. 2609
    else:
        now = datetime.utcnow()
        yymm = f"{str(now.year)[-2:]}{now.month:02d}"

    prefix = f"CGE-PO-{yymm}-"
    # Query all POs matching CGE-PO-{yymm}- or legacy PO-{yymm}-
    last_items = db.query(DB_PurchaseOrder).filter(
        (DB_PurchaseOrder.po_number.like(f"{prefix}%")) |
        (DB_PurchaseOrder.po_number.like(f"PO-{yymm}-%"))
    ).all()

    max_seq = 0
    for item in last_items:
        val = item.po_number or ""
        try:
            seq_str = val.split('-')[-1]
            seq = int(seq_str)
            if seq > max_seq:
                max_seq = seq
        except Exception:
            pass

    new_seq = max_seq + 1
    return f"{prefix}{new_seq:04d}"


# ═══════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════

@router.get("/po/next-number")
def get_next_po_number(date: str = None, db: Session = Depends(get_db)):
    """Menghasilkan nomor PO otomatis berikutnya dengan format CGE-PO-YYMM-XXXX."""
    return {"po_number": generate_po_number(db, date)}


@router.post("/po", response_model=PurchaseOrder)
def create_purchase_order(po: PurchaseOrderCreate, db: Session = Depends(get_db)):
    subtotal_val = po.subtotal if (po.subtotal is not None and po.subtotal > 0) else sum(it.total_price for it in po.items)
    tax_rate_val = po.tax_rate or 0.0
    tax_amount_val = po.tax_amount if (po.tax_amount is not None) else (subtotal_val * (tax_rate_val / 100.0))
    total_amount_val = po.total_amount if (po.total_amount is not None and po.total_amount > 0) else (subtotal_val + tax_amount_val)

    po_num = po.po_number
    if not po_num or po_num.strip() == "" or po_num == "AUTO":
        po_num = generate_po_number(db, po.date)

    db_po = DB_PurchaseOrder(
        id=str(uuid.uuid4()),
        po_number=po_num,
        vendor_id=po.vendor_id,
        project_id=po.project_id,
        date=po.date,
        status=po.status,
        category=po.category or "Jasa Subkontraktor",
        payment_terms=po.payment_terms or "Net 30 Hari",
        due_date=po.due_date,
        account_id=po.account_id,
        subtotal=subtotal_val,
        tax_rate=tax_rate_val,
        tax_amount=tax_amount_val,
        total_amount=total_amount_val,
        notes=po.notes
    )
    db.add(db_po)

    for item in po.items:
        db_item = DB_PurchaseOrderItem(
            id=str(uuid.uuid4()),
            purchase_order_id=db_po.id,
            item_code=item.item_code,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            total_price=item.total_price
        )
        db.add(db_item)

    db.commit()

    if db_po.status == "Completed":
        _auto_create_ap_and_journal(db_po, db)

    db.refresh(db_po)
    return _enrich_po(db_po, db)


@router.get("/po", response_model=List[PurchaseOrder])
def get_purchase_orders(db: Session = Depends(get_db)):
    pos = db.query(DB_PurchaseOrder).order_by(DB_PurchaseOrder.created_at.desc()).all()
    return [_enrich_po(p, db) for p in pos]


@router.put("/po/{po_id}", response_model=PurchaseOrder)
def update_purchase_order(po_id: str, po: PurchaseOrderCreate, db: Session = Depends(get_db)):
    db_po = db.query(DB_PurchaseOrder).filter(DB_PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    # KUNCI EDIT: PO yang sudah di-Approve tidak boleh diedit langsung
    if db_po.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"PO {db_po.po_number} sudah berstatus '{db_po.status}' (terkunci). Silakan Unapprove terlebih dahulu jika ingin merevisi."
        )

    subtotal_val = po.subtotal if (po.subtotal is not None and po.subtotal > 0) else sum(it.total_price for it in po.items)
    tax_rate_val = po.tax_rate or 0.0
    tax_amount_val = po.tax_amount if (po.tax_amount is not None) else (subtotal_val * (tax_rate_val / 100.0))
    total_amount_val = po.total_amount if (po.total_amount is not None and po.total_amount > 0) else (subtotal_val + tax_amount_val)

    # Update PO fields
    db_po.po_number = po.po_number
    db_po.vendor_id = po.vendor_id
    db_po.project_id = po.project_id
    db_po.date = po.date
    db_po.category = po.category or db_po.category or "Jasa Subkontraktor"
    db_po.payment_terms = po.payment_terms or db_po.payment_terms or "Net 30 Hari"
    db_po.due_date = po.due_date
    db_po.account_id = po.account_id
    db_po.subtotal = subtotal_val
    db_po.tax_rate = tax_rate_val
    db_po.tax_amount = tax_amount_val
    db_po.total_amount = total_amount_val
    db_po.notes = po.notes

    # Cleanly replace all items
    db.query(DB_PurchaseOrderItem).filter(
        DB_PurchaseOrderItem.purchase_order_id == po_id
    ).delete()

    for item in po.items:
        db_item = DB_PurchaseOrderItem(
            id=str(uuid.uuid4()),
            purchase_order_id=po_id,
            item_code=item.item_code,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            total_price=item.total_price
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_po)
    return _enrich_po(db_po, db)


@router.put("/po/{po_id}/status")
def update_po_status(po_id: str, status: str, db: Session = Depends(get_db)):
    db_po = db.query(DB_PurchaseOrder).filter(DB_PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    old_status = db_po.status

    # ─────────────────────────────────────────────────────────────────
    # 1. KASUS APPROVE: Dari Draft -> Approved
    #    Langsung mencatat transaksi: Jurnal Pengakuan Beban/Aset & AP Hutang
    # ─────────────────────────────────────────────────────────────────
    if status == "Approved" and old_status != "Approved":
        db_po.status = "Approved"
        db.commit()
        db.refresh(db_po)
        _auto_create_ap_and_journal(db_po, db)
        return _enrich_po(db_po, db)

    # ─────────────────────────────────────────────────────────────────
    # 2. KASUS UNAPPROVE: Mengembalikan status ke Draft
    #    Wajib periksa apakah sudah ada pembayaran kas!
    # ─────────────────────────────────────────────────────────────────
    if status == "Draft" and old_status in ["Approved", "Completed"]:
        # Cari AP Invoice terkait
        ap = None
        if db_po.ap_invoice_id:
            ap = db.query(ApInvoice).filter(ApInvoice.id == db_po.ap_invoice_id).first()
        if not ap and db_po.po_number:
            ap = db.query(ApInvoice).filter(
                (ApInvoice.invoice_number.contains(db_po.po_number)) | (ApInvoice.description.contains(db_po.po_number))
            ).first()

        # Proteksi: Jika sudah ada pembayaran (Paid atau Partial), TOLAK UNAPPROVE
        if ap and ((ap.amount_paid and ap.amount_paid > 0) or ap.status in ["Paid", "Partial"]):
            raise HTTPException(
                status_code=400,
                detail=f"PO {db_po.po_number} tidak dapat di-Unapprove karena sudah tercatat pembayaran kas ({ap.status}, Terbayar: Rp {ap.amount_paid:,.0f}). Silakan batalkan/void pembayaran kas terlebih dahulu di menu Keuangan (AP Invoices)."
            )

        # Jika belum dibayar (Unpaid), HAPUS BERSIH Jurnal dan AP Invoice
        po_num = db_po.po_number
        ap_id = ap.id if ap else db_po.ap_invoice_id
        jnl_id = db_po.journal_id

        # a. Hapus Payment Journals jika ada
        if ap_id:
            pay_journals = db.query(Journal).filter(
                (Journal.ref_type == "AP_Invoice_Payment") & (Journal.ref_id == ap_id)
            ).all()
            for pj in pay_journals:
                db.query(JournalLine).filter(JournalLine.journal_id == pj.id).delete()
                db.delete(pj)

        # b. Hapus Recognition Journals terkait PO
        journals = db.query(Journal).filter(
            (Journal.id == jnl_id) | (Journal.ref_id == po_id) | (Journal.description.contains(po_num))
        ).all()
        for jnl in journals:
            db.query(JournalLine).filter(JournalLine.journal_id == jnl.id).delete()
            db.delete(jnl)

        # c. Hapus AP Invoice
        if ap:
            db.delete(ap)
        elif ap_id:
            db.query(ApInvoice).filter(ApInvoice.id == ap_id).delete()

        # d. Bersihkan referensi pada PO dan kembalikan status ke Draft
        db_po.ap_invoice_id = None
        db_po.journal_id = None
        db_po.status = "Draft"
        db.commit()
        db.refresh(db_po)
        return _enrich_po(db_po, db)

    # ─────────────────────────────────────────────────────────────────
    # 3. KASUS LAINNYA (e.g. Completed, Cancelled)
    # ─────────────────────────────────────────────────────────────────
    db_po.status = status
    db.commit()
    db.refresh(db_po)
    return _enrich_po(db_po, db)


@router.delete("/po/{po_id}")
def delete_purchase_order(po_id: str, db: Session = Depends(get_db)):
    db_po = db.query(DB_PurchaseOrder).filter(DB_PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    # KUNCI HAPUS: PO yang sudah di-Approve tidak boleh langsung dihapus sembarangan
    if db_po.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"PO {db_po.po_number} berstatus '{db_po.status}'. Silakan Unapprove terlebih dahulu sebelum menghapus dokumen."
        )

    # Cleanly delete all PO Items
    db.query(DB_PurchaseOrderItem).filter(
        DB_PurchaseOrderItem.purchase_order_id == po_id
    ).delete()

    # Delete the PO itself
    db.delete(db_po)
    db.commit()
    return {"detail": "Purchase order berstatus Draft berhasil dihapus bersih dari database"}


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
