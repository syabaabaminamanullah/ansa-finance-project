from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime
from db.database import get_db
from db.models import ArInvoice, ApInvoice, Expense, JournalLine, ChartOfAccount, Journal

router = APIRouter()

def format_idr(val: float) -> str:
    """Format angka ke Rupiah penuh format Indonesia (titik sebagai pemisah ribuan)."""
    formatted = f"{int(val):,}".replace(",", ".")
    return f"Rp {formatted}"

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    today = datetime.utcnow()
    current_year = str(today.year)
    start_date = f"{current_year}-01-01"
    end_date = f"{current_year}-12-31"

    # ============================================================
    # Ambil data dari Journal Lines (sama persis dengan laporan keuangan)
    # ============================================================
    query = db.query(
        ChartOfAccount.account_code,
        ChartOfAccount.account_name,
        ChartOfAccount.account_type,
        func.sum(JournalLine.debit).label('total_debit'),
        func.sum(JournalLine.credit).label('total_credit')
    ).join(
        JournalLine, JournalLine.account_id == ChartOfAccount.id
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        Journal.date >= start_date,
        Journal.date <= end_date,
        Journal.status == 'Posted'
    ).group_by(
        ChartOfAccount.account_code,
        ChartOfAccount.account_name,
        ChartOfAccount.account_type
    ).all()

    total_revenue = 0.0
    total_cogs = 0.0
    total_expense = 0.0

    for row in query:
        net_balance = (
            (row.total_credit or 0.0) - (row.total_debit or 0.0)
            if row.account_type == 'Revenue'
            else (row.total_debit or 0.0) - (row.total_credit or 0.0)
        )
        if row.account_type == 'Revenue':
            total_revenue += net_balance
        elif row.account_type == 'Expense':
            if str(row.account_code).startswith('5'):
                total_cogs += net_balance
            else:
                total_expense += net_balance

    gross_profit = total_revenue - total_cogs
    net_profit = gross_profit - total_expense

    # ============================================================
    # Cash Position: HANYA akun Kas Tunai & Bank (1110, 1121, 1122)
    # TIDAK termasuk 1140 (Uang Muka Proyek) - bukan kas riil
    # ============================================================
    kas_bank_accounts = db.query(ChartOfAccount).filter(
        ChartOfAccount.account_code.in_(['1110', '1121', '1122', '1123', '1124', '1125'])
    ).all()
    kas_bank_ids = [a.id for a in kas_bank_accounts]
    cash_lines = db.query(JournalLine).join(Journal, Journal.id == JournalLine.journal_id).filter(
        JournalLine.account_id.in_(kas_bank_ids),
        Journal.status == 'Posted'
    ).all()
    total_cash_debit = sum(l.debit or 0 for l in cash_lines)
    total_cash_credit = sum(l.credit or 0 for l in cash_lines)
    cash_position = total_cash_debit - total_cash_credit

    # ============================================================
    # Outstanding AR & AP (dari tabel AR/AP Invoice langsung)
    # ============================================================
    ar_invoices = db.query(ArInvoice).filter(ArInvoice.date.startswith(current_year)).all()
    ap_invoices = db.query(ApInvoice).filter(ApInvoice.date.startswith(current_year)).all()
    outstanding_ar = sum((ar.total_amount or 0) - (ar.amount_paid or 0) for ar in ar_invoices if ar.status != "Paid")
    outstanding_ap = sum((ap.total_amount or 0) - (ap.amount_paid or 0) for ap in ap_invoices if ap.status != "Paid")

    # Total Pengeluaran = semua expense + AP invoice tahun ini
    all_expenses_ytd = db.query(Expense).filter(Expense.date.startswith(current_year)).all()
    total_pengeluaran = sum(e.amount or 0 for e in all_expenses_ytd) + sum((ap.total_amount or 0) for ap in ap_invoices)

    return {
        "cash_position": format_idr(cash_position),
        "revenue_ytd": format_idr(total_revenue),
        "gross_profit": format_idr(gross_profit),
        "net_profit": format_idr(net_profit),
        "total_pengeluaran": format_idr(total_pengeluaran),
        "eqp_utilization": "85%",
        "outstanding_ar": format_idr(outstanding_ar),
        "outstanding_ap": format_idr(outstanding_ap),
    }


@router.get("/cashflow-monthly")
def get_cashflow_monthly(db: Session = Depends(get_db)):
    """
    Cash Flow bulanan dari Journal Lines (akun Kas & Bank),
    diambil dari data akuntansi yang sama dengan laporan keuangan.
    """
    today = datetime.utcnow()
    current_year = str(today.year)

    # Cari semua akun Kas & Bank
    cash_accounts = db.query(ChartOfAccount.id).filter(
        or_(
            ChartOfAccount.account_code.like('111%'),
            ChartOfAccount.account_code.like('112%')
        )
    ).all()
    cash_account_ids = [c[0] for c in cash_accounts]

    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    monthly_data = {m: {'in': 0.0, 'out': 0.0} for m in months}

    # Ambil semua journal lines akun kas tahun ini yang sudah posted
    lines = db.query(JournalLine).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        JournalLine.account_id.in_(cash_account_ids),
        Journal.date.startswith(current_year),
        Journal.status == 'Posted'
    ).all()

    for line in lines:
        try:
            d = datetime.strptime(str(line.journal.date)[:10], "%Y-%m-%d")
        except Exception:
            continue
        m = months[d.month - 1]
        debit = line.debit or 0.0
        credit = line.credit or 0.0
        monthly_data[m]['in'] += debit    # Debit ke kas = uang masuk
        monthly_data[m]['out'] += credit  # Credit ke kas = uang keluar

    current_month_idx = today.month
    display_months = months[:min(current_month_idx + 1, 12)]

    result = [
        {
            'month': m,
            'in': round(monthly_data[m]['in']),
            'out': round(monthly_data[m]['out'])
        }
        for m in display_months
    ]

    return result
