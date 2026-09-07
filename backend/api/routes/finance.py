from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from db.database import get_db
from db.models import Journal, JournalLine, ApInvoice, ArInvoice, Vendor, Customer, Project, BillingTerm
from schemas.finance import (
    JournalCreate, JournalUpdate, JournalResponse,
    ApInvoiceCreate, ApInvoiceUpdate, ApInvoiceResponse,
    ArInvoiceCreate, ArInvoiceUpdate, ArInvoiceResponse,
    PaymentRequest
)

router = APIRouter()

def generate_transaction_number(db: Session, date_str, project_id: str, tx_type: str, model_class, field_name: str) -> str:
    date_val = str(date_str).split('T')[0] if 'T' in str(date_str) else str(date_str)
    parts = date_val.split('-')
    if len(parts) == 3:
        formatted_date = f"{parts[2]}{parts[1]}{parts[0][-2:]}" # DDMMYY
    else:
        formatted_date = "000000"
        
    project_code = "OH"
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project and project.code:
            project_code = project.code
            
    prefix = f"{formatted_date}-{project_code}-{tx_type}-"
    
    last_items = db.query(model_class).filter(getattr(model_class, field_name).like(f"{prefix}%")).all()
    
    max_seq = 0
    for item in last_items:
        val = getattr(item, field_name)
        try:
            seq_str = val.split('-')[-1]
            seq = int(seq_str)
            if seq > max_seq:
                max_seq = seq
        except:
            pass
            
    new_seq = max_seq + 1
    return f"{prefix}{new_seq:03d}"


# ====================
# Journals
# ====================
@router.post("/journals", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
def create_journal(journal: JournalCreate, db: Session = Depends(get_db)):
    # Calculate totals to ensure debit == credit
    total_debit = sum(line.debit for line in journal.lines)
    total_credit = sum(line.credit for line in journal.lines)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail="Debit and Credit must be equal")

    journal_data = journal.model_dump(exclude={'lines'})
    
    # Auto-numbering logic
    if journal_data['journal_number'] == 'AUTO' or journal_data['journal_number'].startswith('JV-'):
        journal_data['journal_number'] = generate_transaction_number(db, journal_data['date'], journal_data.get('project_id'), 'JV', Journal, 'journal_number')

    new_journal = Journal(**journal_data)
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)

    # Validate no header account is selected in journal lines
    for line in journal.lines:
        acc = db.query(ChartOfAccount).filter(ChartOfAccount.id == line.account_id).first()
        if acc and getattr(acc, 'is_header', False):
            raise HTTPException(
                status_code=400,
                detail=f"Akun [{acc.account_code} - {acc.account_name}] adalah Akun Header (Induk). Transaksi harus dicatat pada sub-akun detail, bukan pada akun Header."
            )

    # Add lines
    for line in journal.lines:
        new_line = JournalLine(**line.model_dump(), journal_id=new_journal.id)
        db.add(new_line)
    
    db.commit()
    db.refresh(new_journal)
    return new_journal

@router.get("/journals", response_model=List[JournalResponse])
def get_journals(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Journal).offset(skip).limit(limit).all()

@router.get("/journals/{journal_id}", response_model=JournalResponse)
def get_journal(journal_id: str, db: Session = Depends(get_db)):
    journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    return journal

@router.put("/journals/{journal_id}", response_model=JournalResponse)
def update_journal(journal_id: str, journal_update: JournalCreate, db: Session = Depends(get_db)):
    db_journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not db_journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    
    if db_journal.status == 'Posted':
        raise HTTPException(status_code=400, detail="Cannot edit a Posted journal. Please unpost it first.")

    # Validate totals
    total_debit = sum(line.debit for line in journal_update.lines)
    total_credit = sum(line.credit for line in journal_update.lines)
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail="Debit and Credit must be equal")

    # Update basic fields
    db_journal.journal_number = journal_update.journal_number
    db_journal.date = journal_update.date
    db_journal.description = journal_update.description

    # Recreate lines
    db.query(JournalLine).filter(JournalLine.journal_id == journal_id).delete()
    first_proj_id = None
    for line in journal_update.lines:
        new_line = JournalLine(**line.model_dump(), journal_id=journal_id)
        db.add(new_line)
        if new_line.project_id and not first_proj_id:
            first_proj_id = new_line.project_id

    # Bidirectional sync for linked Expense, AP Invoice, or AR Invoice (Project & Amount)
    if db_journal.ref_type in ["Expense"] and db_journal.ref_id:
        linked_exp = db.query(Expense).filter(Expense.id == db_journal.ref_id).first()
        if linked_exp:
            if first_proj_id:
                linked_exp.project_id = first_proj_id
            main_debit = sum(l.debit for l in journal_update.lines if l.account_id == linked_exp.expense_account_id)
            if main_debit > 0:
                linked_exp.amount = main_debit
            elif total_debit > 0:
                linked_exp.amount = max(0.0, total_debit - (linked_exp.admin_fee_amount or 0.0))
    elif db_journal.ref_type in ["AP_Invoice", "AP_Invoice_Approve", "AP_Invoice_Pay"] and db_journal.ref_id:
        linked_ap = db.query(ApInvoice).filter(ApInvoice.id == db_journal.ref_id).first()
        if linked_ap:
            if first_proj_id:
                linked_ap.project_id = first_proj_id
            if total_debit > 0:
                linked_ap.total_amount = total_debit
    elif db_journal.ref_type in ["AR_Invoice", "AR_Invoice_Pay", "AR_Invoice_Approve", "AR_Invoice_Receipt"] and db_journal.ref_id:
        linked_ar = db.query(ArInvoice).filter(ArInvoice.id == db_journal.ref_id).first()
        if linked_ar:
            if first_proj_id:
                linked_ar.project_id = first_proj_id
            if total_credit > 0:
                linked_ar.total_amount = total_credit

    db.commit()
    db.refresh(db_journal)
    return db_journal

@router.put("/journals/{journal_id}/status", response_model=JournalResponse)
def update_journal_status(journal_id: str, status_update: JournalUpdate, db: Session = Depends(get_db)):
    db_journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not db_journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    
    if status_update.status:
        db_journal.status = status_update.status
    
    db.commit()
    db.refresh(db_journal)
    return db_journal

@router.delete("/journals/{journal_id}")
def delete_journal(journal_id: str, db: Session = Depends(get_db)):
    db_journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not db_journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    db.delete(db_journal)
    db.commit()
    return {"ok": True}

@router.post("/journals/{journal_id}/attachment")
async def upload_journal_attachment(
    journal_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    import os, shutil

    db_journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not db_journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    
    # Validate by extension (more reliable than content_type)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ["pdf", "jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="File type not allowed. Use PDF, JPG, or PNG.")
    
    # Save file
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "journal_attachments")
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = f"{journal_id}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Save path to DB
    db_journal.attachment_path = f"journal_attachments/{filename}"
    db.commit()
    db.refresh(db_journal)
    
    return {"attachment_path": db_journal.attachment_path, "message": "Attachment uploaded successfully"}

@router.get("/journals/{journal_id}/attachment")
def get_journal_attachment(journal_id: str, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse
    import os

    db_journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not db_journal or not db_journal.attachment_path:
        raise HTTPException(status_code=404, detail="No attachment found for this journal")
    
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    filepath = os.path.join(upload_dir, db_journal.attachment_path)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Attachment file not found on disk")
    
    return FileResponse(filepath)

@router.put("/journals/{journal_id}/memo")
def save_journal_memo(
    journal_id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    from pydantic import BaseModel as PM
    db_journal = db.query(Journal).filter(Journal.id == journal_id).first()
    if not db_journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    db_journal.attachment_memo = payload.get("memo", "")
    db.commit()
    db.refresh(db_journal)
    return {"memo": db_journal.attachment_memo, "message": "Memo saved"}

# ====================
# AP Invoices
# ====================
@router.post("/ap-invoices", response_model=ApInvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_ap_invoice(invoice: ApInvoiceCreate, db: Session = Depends(get_db)):
    invoice_data = invoice.model_dump()
    if invoice_data["invoice_number"] == 'AUTO' or invoice_data["invoice_number"].startswith("AP-"):
        invoice_data["invoice_number"] = generate_transaction_number(db, invoice_data['date'], invoice_data.get('project_id'), 'AP', ApInvoice, 'invoice_number')

    new_invoice = ApInvoice(**invoice_data)
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return new_invoice

@router.get("/ap-invoices", response_model=List[ApInvoiceResponse])
def get_ap_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(ApInvoice).offset(skip).limit(limit).all()

@router.get("/ap-invoices/{invoice_id}", response_model=ApInvoiceResponse)
def get_ap_invoice(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(ApInvoice).filter(ApInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/ap-invoices/{invoice_id}", response_model=ApInvoiceResponse)
def update_ap_invoice(invoice_id: str, invoice_update: ApInvoiceUpdate, db: Session = Depends(get_db)):
    db_invoice = db.query(ApInvoice).filter(ApInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for key, value in invoice_update.model_dump(exclude_unset=True).items():
        setattr(db_invoice, key, value)

    # Sync linked journal lines project_id
    linked_journals = db.query(Journal).filter(Journal.ref_id == invoice_id).all()
    for j in linked_journals:
        for line in j.lines:
            line.project_id = db_invoice.project_id

    db.commit()
    db.refresh(db_invoice)
    return db_invoice

@router.delete("/ap-invoices/{invoice_id}")
def delete_ap_invoice(invoice_id: str, db: Session = Depends(get_db)):
    db_invoice = db.query(ApInvoice).filter(ApInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if db_invoice.status not in ["Draft", "Unpaid"]:
        raise HTTPException(status_code=400, detail="Cannot delete invoice that is already approved or paid")

    # Delete associated journal if exists
    journal = db.query(Journal).filter(Journal.ref_type == 'AP Invoice', Journal.ref_id == invoice_id).first()
    if journal:
        db.query(JournalLine).filter(JournalLine.journal_id == journal.id).delete()
        db.delete(journal)

    db.delete(db_invoice)
    db.commit()
    return {"ok": True}

# ====================
# AR Invoices
# ====================
@router.post("/ar-invoices", response_model=ArInvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_ar_invoice(invoice: ArInvoiceCreate, db: Session = Depends(get_db)):
    invoice_data = invoice.model_dump()
    if invoice_data["invoice_number"] == 'AUTO' or invoice_data["invoice_number"].startswith("AR-"):
        invoice_data["invoice_number"] = generate_transaction_number(db, invoice_data['date'], invoice_data.get('project_id'), 'AR', ArInvoice, 'invoice_number')

    new_invoice = ArInvoice(**invoice_data)
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return new_invoice

@router.get("/ar-invoices", response_model=List[ArInvoiceResponse])
def get_ar_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(ArInvoice).offset(skip).limit(limit).all()

@router.get("/ar-invoices/{invoice_id}", response_model=ArInvoiceResponse)
def get_ar_invoice(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(ArInvoice).filter(ArInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/ar-invoices/{invoice_id}", response_model=ArInvoiceResponse)
def update_ar_invoice(invoice_id: str, invoice_update: ArInvoiceUpdate, db: Session = Depends(get_db)):
    db_invoice = db.query(ArInvoice).filter(ArInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for key, value in invoice_update.model_dump(exclude_unset=True).items():
        setattr(db_invoice, key, value)

    # Sync linked journal lines project_id
    linked_journals = db.query(Journal).filter(Journal.ref_id == invoice_id).all()
    for j in linked_journals:
        for line in j.lines:
            line.project_id = db_invoice.project_id

    db.commit()
    db.refresh(db_invoice)
    return db_invoice

@router.delete("/ar-invoices/{invoice_id}")
def delete_ar_invoice(invoice_id: str, db: Session = Depends(get_db)):
    db_invoice = db.query(ArInvoice).filter(ArInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # If linked to a BillingTerm in BillingSchedule, reset term status back to Pending
    linked_term = db.query(BillingTerm).filter(BillingTerm.ar_invoice_id == invoice_id).first()
    if linked_term:
        linked_term.status = "Pending"
        linked_term.invoice_number = None
        linked_term.invoice_date = None
        linked_term.ar_invoice_id = None

    db.delete(db_invoice)
    db.commit()
    return {"ok": True}

@router.post("/ap-invoices/{invoice_id}/approve")
def approve_ap_invoice(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(ApInvoice).filter(ApInvoice.id == invoice_id).first()
    if not invoice or invoice.status != "Draft":
        raise HTTPException(status_code=400, detail="Invoice not found or not in Draft status")
    
    invoice.status = "Unpaid"
    
    # Create Journal for AP Recognition
    vendor = db.query(Vendor).filter(Vendor.id == invoice.vendor_id).first()
    journal_number = generate_transaction_number(db, invoice.date, invoice.project_id, 'JV', Journal, 'journal_number')
    new_journal = Journal(
        journal_number=journal_number,
        date=invoice.date,
        description=f"Auto-journal for AP Invoice Approval: {invoice.invoice_number}",
        ref_type="AP_Invoice_Approve",
        ref_id=invoice.id,
        status="Posted"
    )
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    
    # Debit: Expense/Inventory Account
    if invoice.expense_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=invoice.expense_account_id,
            project_id=invoice.project_id,
            description=f"Expense for {invoice.invoice_number}",
            debit=invoice.amount,
            credit=0.0
        ))
    
    # Debit: Tax (if any)
    if invoice.tax_amount > 0 and invoice.tax_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=invoice.tax_account_id,
            project_id=invoice.project_id,
            description=f"Tax for {invoice.invoice_number}",
            debit=invoice.tax_amount,
            credit=0.0
        ))
        
    # Credit: Accounts Payable (from vendor)
    if vendor and vendor.payable_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=vendor.payable_account_id,
            project_id=invoice.project_id,
            description=f"AP for {invoice.invoice_number}",
            debit=0.0,
            credit=invoice.total_amount
        ))
    db.commit()
    return {"ok": True, "message": "Invoice approved and journal generated"}

@router.post("/ap-invoices/{invoice_id}/pay")
def pay_ap_invoice(invoice_id: str, payment: PaymentRequest, db: Session = Depends(get_db)):
    invoice = db.query(ApInvoice).filter(ApInvoice.id == invoice_id).first()
    if not invoice or invoice.status in ["Draft", "Paid"]:
        raise HTTPException(status_code=400, detail="Invalid invoice status for payment")
    
    invoice.amount_paid += payment.amount
    if invoice.amount_paid >= invoice.total_amount:
        invoice.status = "Paid"
    else:
        invoice.status = "Partial"
        
    vendor = db.query(Vendor).filter(Vendor.id == invoice.vendor_id).first()
    
    # Create Payment Journal
    journal_number = generate_transaction_number(db, payment.date, invoice.project_id, 'PAY', Journal, 'journal_number')
    new_journal = Journal(
        journal_number=journal_number,
        date=payment.date,
        description=payment.description or f"Payment for AP Invoice {invoice.invoice_number}",
        ref_type="AP_Invoice_Payment",
        ref_id=invoice.id,
        status="Posted"
    )
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    
    # Debit: Accounts Payable
    if vendor and vendor.payable_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=vendor.payable_account_id,
            project_id=invoice.project_id,
            description=new_journal.description,
            debit=payment.amount,
            credit=0.0
        ))
    
    # Credit: Cash/Bank Account
    db.add(JournalLine(
        journal_id=new_journal.id,
        account_id=payment.payment_account_id,
        project_id=invoice.project_id,
        description=new_journal.description,
        debit=0.0,
        credit=payment.amount
    ))
    db.commit()
    return {"ok": True, "message": "Payment recorded"}

@router.post("/ar-invoices/{invoice_id}/approve")
def approve_ar_invoice(invoice_id: str, db: Session = Depends(get_db)):
    invoice = db.query(ArInvoice).filter(ArInvoice.id == invoice_id).first()
    if not invoice or invoice.status != "Draft":
        raise HTTPException(status_code=400, detail="Invoice not found or not in Draft status")
    
    invoice.status = "Unpaid"
    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    
    journal_number = generate_transaction_number(db, invoice.date, invoice.project_id, 'JV', Journal, 'journal_number')
    new_journal = Journal(
        journal_number=journal_number,
        date=invoice.date,
        description=f"Auto-journal for AR Invoice Approval: {invoice.invoice_number}",
        ref_type="AR_Invoice_Approve",
        ref_id=invoice.id,
        status="Posted"
    )
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    
    # Debit: Accounts Receivable (from customer)
    if customer and customer.receivable_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=customer.receivable_account_id,
            project_id=invoice.project_id,
            description=f"AR for {invoice.invoice_number}",
            debit=invoice.total_amount,
            credit=0.0
        ))
        
    # Credit: Revenue Account
    if invoice.revenue_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=invoice.revenue_account_id,
            project_id=invoice.project_id,
            description=f"Revenue for {invoice.invoice_number}",
            debit=0.0,
            credit=invoice.amount
        ))
        
    # Credit: Tax Account
    if invoice.tax_amount > 0 and invoice.tax_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=invoice.tax_account_id,
            project_id=invoice.project_id,
            description=f"Tax for {invoice.invoice_number}",
            debit=0.0,
            credit=invoice.tax_amount
        ))
    db.commit()
    return {"ok": True, "message": "Invoice approved and journal generated"}

@router.post("/ar-invoices/{invoice_id}/pay")
def pay_ar_invoice(invoice_id: str, payment: PaymentRequest, db: Session = Depends(get_db)):
    invoice = db.query(ArInvoice).filter(ArInvoice.id == invoice_id).first()
    if not invoice or invoice.status in ["Draft", "Paid"]:
        raise HTTPException(status_code=400, detail="Invalid invoice status for payment")
    
    invoice.amount_paid += payment.amount
    if invoice.amount_paid >= invoice.total_amount:
        invoice.status = "Paid"
    else:
        invoice.status = "Partial"
        
    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    
    journal_number = generate_transaction_number(db, payment.date, invoice.project_id, 'REC', Journal, 'journal_number')
    new_journal = Journal(
        journal_number=journal_number,
        date=payment.date,
        description=payment.description or f"Receipt for AR Invoice {invoice.invoice_number}",
        ref_type="AR_Invoice_Receipt",
        ref_id=invoice.id,
        status="Posted"
    )
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)
    
    # Debit: Cash/Bank Account
    db.add(JournalLine(
        journal_id=new_journal.id,
        account_id=payment.payment_account_id,
        project_id=invoice.project_id,
        description=new_journal.description,
        debit=payment.amount,
        credit=0.0
    ))
    
    # Credit: Accounts Receivable
    if customer and customer.receivable_account_id:
        db.add(JournalLine(
            journal_id=new_journal.id,
            account_id=customer.receivable_account_id,
            project_id=invoice.project_id,
            description=new_journal.description,
            debit=0.0,
            credit=payment.amount
        ))
    db.commit()
    return {"ok": True, "message": "Payment recorded"}


# ====================
# Expenses
# ====================
from db.models import Expense, ChartOfAccount, FixedAsset
from schemas.finance import ExpenseCreate, ExpenseUpdate, ExpenseResponse
import uuid
@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    # 1. Create the Expense
    new_expense = Expense(**expense.model_dump())
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    # 1.5. Auto-create Fixed Asset if applicable
    coa = db.query(ChartOfAccount).filter(ChartOfAccount.id == new_expense.expense_account_id).first()
    if coa and coa.account_code.startswith('12') and not coa.account_code.endswith('1'):
        # Standard COA convention: 12x0 is Asset, 12x1 is Accumulated Depreciation
        # Determine accumulated depreciation account and depreciation expense account
        # Try to find corresponding accounts
        accum_coa = db.query(ChartOfAccount).filter(ChartOfAccount.account_code.in_([accum_code, accum_code + '0'])).first()
        dep_exp_coa = db.query(ChartOfAccount).filter(ChartOfAccount.account_code.in_(["61400", "6140"])).first()
        
        new_asset = FixedAsset(
            id=str(uuid.uuid4()),
            asset_number=f"FA-{new_expense.expense_number}",
            name=new_expense.description,
            purchase_date=new_expense.date,
            purchase_price=new_expense.amount,
            book_value=new_expense.amount,
            asset_account_id=coa.id,
            accumulated_depreciation_account_id=accum_coa.id if accum_coa else None,
            depreciation_expense_account_id=dep_exp_coa.id if dep_exp_coa else None,
            useful_life_years=5 # Default to 5 years, user can edit later
        )
        db.add(new_asset)
        db.commit()


    # 2. Auto-generate Journal
    journal_number = generate_transaction_number(db, new_expense.date, new_expense.project_id, 'EXP', Journal, 'journal_number')
    new_journal = Journal(
        journal_number=journal_number,
        date=new_expense.date,
        description=f"Auto-journal for Expense {new_expense.expense_number}: {new_expense.description}",
        ref_type="Expense",
        ref_id=new_expense.id,
        status="Posted"
    )
    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)

    # 3. Add Journal Lines
    # Debit: Expense Account
    debit_line = JournalLine(
        journal_id=new_journal.id,
        account_id=new_expense.expense_account_id,
        project_id=new_expense.project_id,
        description=new_expense.description,
        debit=new_expense.amount,
        credit=0.0
    )
    db.add(debit_line)

    # Debit: Admin Fee Account (if any)
    if new_expense.admin_fee_amount > 0 and new_expense.admin_fee_account_id:
        admin_fee_line = JournalLine(
            journal_id=new_journal.id,
            account_id=new_expense.admin_fee_account_id,
            project_id=new_expense.project_id,
            description=f"Bank Admin Fee - {new_expense.description}",
            debit=new_expense.admin_fee_amount,
            credit=0.0
        )
        db.add(admin_fee_line)

    # Credit: Payment Account (Cash/Bank)
    total_credit = new_expense.amount + (new_expense.admin_fee_amount if new_expense.admin_fee_account_id else 0.0)
    credit_line = JournalLine(
        journal_id=new_journal.id,
        account_id=new_expense.payment_account_id,
        project_id=new_expense.project_id,
        description=new_expense.description,
        debit=0.0,
        credit=total_credit
    )
    db.add(credit_line)

    db.commit()

    return new_expense

@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: str, expense_update: ExpenseUpdate, db: Session = Depends(get_db)):
    db_expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    auto_journal = db.query(Journal).filter(Journal.ref_id == expense_id, Journal.ref_type == "Expense").first()
    if auto_journal and auto_journal.status == 'Posted':
        raise HTTPException(status_code=400, detail="Cannot edit an Expense whose Journal is Posted. Please unpost it first from All Journal Entries.")
        
    for key, value in expense_update.model_dump(exclude_unset=True).items():
        setattr(db_expense, key, value)
    
    db.commit()
    db.refresh(db_expense)
    
    # Update associated auto-journal if it exists
    auto_journal = db.query(Journal).filter(Journal.ref_id == expense_id, Journal.ref_type == "Expense").first()
    if auto_journal:
        auto_journal.date = db_expense.date
        auto_journal.description = f"Auto-journal for Expense {db_expense.expense_number}: {db_expense.description}"
        auto_journal.journal_number = generate_transaction_number(db, db_expense.date, db_expense.project_id, 'EXP', Journal, 'journal_number')
        
        # Delete old lines and recreate
        db.query(JournalLine).filter(JournalLine.journal_id == auto_journal.id).delete()
        
        debit_line = JournalLine(
            journal_id=auto_journal.id,
            account_id=db_expense.expense_account_id,
            project_id=db_expense.project_id,
            description=db_expense.description,
            debit=db_expense.amount,
            credit=0.0
        )
        db.add(debit_line)
        
        # Debit: Admin Fee Account (if any)
        if db_expense.admin_fee_amount > 0 and db_expense.admin_fee_account_id:
            admin_fee_line = JournalLine(
                journal_id=auto_journal.id,
                account_id=db_expense.admin_fee_account_id,
                project_id=db_expense.project_id,
                description=f"Bank Admin Fee - {db_expense.description}",
                debit=db_expense.admin_fee_amount,
                credit=0.0
            )
            db.add(admin_fee_line)

        # Credit: Payment Account (Cash/Bank)
        total_credit = db_expense.amount + (db_expense.admin_fee_amount if db_expense.admin_fee_account_id else 0.0)
        credit_line = JournalLine(
            journal_id=auto_journal.id,
            account_id=db_expense.payment_account_id,
            project_id=db_expense.project_id,
            description=db_expense.description,
            debit=0.0,
            credit=total_credit
        )
        db.add(credit_line)
        
        db.commit()

    return db_expense

@router.get("/expenses", response_model=List[ExpenseResponse])
def get_expenses(month: Optional[str] = None, skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    query = db.query(Expense)
    if month:
        query = query.filter(Expense.date.like(f"{month}%"))
    return query.order_by(Expense.date.desc()).offset(skip).limit(limit).all()

@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    db_expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Optional: also delete the associated auto-journal
    auto_journal = db.query(Journal).filter(Journal.ref_id == expense_id, Journal.ref_type == "Expense").first()
    if auto_journal:
        db.delete(auto_journal)

    db.delete(db_expense)
    db.commit()
    return {"ok": True}
