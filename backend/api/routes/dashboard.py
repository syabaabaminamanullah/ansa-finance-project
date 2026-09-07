from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime
from typing import Optional
from db.database import get_db
from db.models import ArInvoice, ApInvoice, Expense, JournalLine, ChartOfAccount, Journal, Project, Bank

router = APIRouter()

def format_idr(val: float) -> str:
    """Format angka ke Rupiah penuh format Indonesia (titik sebagai pemisah ribuan)."""
    formatted = f"{int(round(val)):,}".replace(",", ".")
    return f"Rp {formatted}"

@router.get("/summary")
def get_dashboard_summary(
    project_id: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    today = datetime.utcnow()
    current_year = str(today.year)
    start_date = f"{current_year}-01-01"
    end_date = f"{current_year}-12-31"

    # Period filter handling
    if period == 'AUG':
        start_date = f"{current_year}-08-01"
        end_date = f"{current_year}-08-31"
    elif period == 'Q3':
        start_date = f"{current_year}-07-01"
        end_date = f"{current_year}-09-30"

    # ============================================================
    # IF SPECIFIC PROJECT IS SELECTED
    # ============================================================
    if project_id and project_id != 'ALL':
        proj = db.query(Project).filter(Project.id == project_id).first()
        contract_val = (proj.contract_value_idr or 0.0) if proj else 0.0

        ar_q = db.query(ArInvoice).filter(ArInvoice.project_id == project_id)
        ap_q = db.query(ApInvoice).filter(ApInvoice.project_id == project_id)
        exp_q = db.query(Expense).filter(Expense.project_id == project_id)

        if period == 'AUG':
            ar_q = ar_q.filter(ArInvoice.date.startswith(f"{current_year}-08"))
            ap_q = ap_q.filter(ApInvoice.date.startswith(f"{current_year}-08"))
            exp_q = exp_q.filter(Expense.date.startswith(f"{current_year}-08"))
        elif period == 'Q3':
            ar_q = ar_q.filter(or_(ArInvoice.date.startswith(f"{current_year}-07"), ArInvoice.date.startswith(f"{current_year}-08"), ArInvoice.date.startswith(f"{current_year}-09")))
            ap_q = ap_q.filter(or_(ApInvoice.date.startswith(f"{current_year}-07"), ApInvoice.date.startswith(f"{current_year}-08"), ApInvoice.date.startswith(f"{current_year}-09")))
            exp_q = exp_q.filter(or_(Expense.date.startswith(f"{current_year}-07"), Expense.date.startswith(f"{current_year}-08"), Expense.date.startswith(f"{current_year}-09")))
        else:
            ar_q = ar_q.filter(ArInvoice.date.startswith(current_year))
            ap_q = ap_q.filter(ApInvoice.date.startswith(current_year))
            exp_q = exp_q.filter(Expense.date.startswith(current_year))

        ar_invoices = ar_q.all()
        ap_invoices = ap_q.all()
        expenses = exp_q.all()

        total_revenue = sum(ar.total_amount or 0.0 for ar in ar_invoices)
        total_exp_amt = sum(e.amount or 0.0 for e in expenses)
        total_ap_amt = sum(ap.total_amount or 0.0 for ap in ap_invoices)
        total_pengeluaran = total_exp_amt + total_ap_amt

        # Gross & Net Profit for this project
        gross_profit = total_revenue - total_pengeluaran
        net_profit = gross_profit

        outstanding_ar = sum((ar.total_amount or 0.0) - (ar.amount_paid or 0.0) for ar in ar_invoices if ar.status != "Paid")
        outstanding_ap = sum((ap.total_amount or 0.0) - (ap.amount_paid or 0.0) for ap in ap_invoices if ap.status != "Paid")

        # For Cash Position on project level, we display Net Cash Realized (Revenue collected - Direct cost paid)
        cash_in_proj = sum(ar.amount_paid or 0.0 for ar in ar_invoices)
        cash_position = cash_in_proj - total_pengeluaran

        return {
            "cash_position": format_idr(cash_position),
            "cash_position_raw": cash_position,
            "revenue_ytd": format_idr(total_revenue),
            "revenue_ytd_raw": total_revenue,
            "gross_profit": format_idr(gross_profit),
            "gross_profit_raw": gross_profit,
            "net_profit": format_idr(net_profit),
            "net_profit_raw": net_profit,
            "total_pengeluaran": format_idr(total_pengeluaran),
            "total_pengeluaran_raw": total_pengeluaran,
            "eqp_utilization": "92%" if "004" in str(proj.code if proj else '') else "85%",
            "outstanding_ar": format_idr(outstanding_ar),
            "outstanding_ap": format_idr(outstanding_ap),
            "project_name": proj.name if proj else "",
            "project_code": proj.code if proj else "",
            "contract_value": format_idr(contract_val)
        }

    # ============================================================
    # GLOBAL / ALL PROJECTS (Company-Wide)
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

    # Cash Position: Akun Kas Tunai & Bank (111xx, 112xx)
    kas_bank_accounts = db.query(ChartOfAccount).filter(
        or_(
            ChartOfAccount.account_code.like('111%'),
            ChartOfAccount.account_code.like('112%')
        )
    ).all()
    kas_bank_ids = [a.id for a in kas_bank_accounts]
    cash_lines = db.query(JournalLine).join(Journal, Journal.id == JournalLine.journal_id).filter(
        JournalLine.account_id.in_(kas_bank_ids),
        Journal.status == 'Posted'
    ).all()
    total_cash_debit = sum(l.debit or 0 for l in cash_lines)
    total_cash_credit = sum(l.credit or 0 for l in cash_lines)
    cash_position = total_cash_debit - total_cash_credit

    # Outstanding AR & AP
    ar_invoices = db.query(ArInvoice).filter(ArInvoice.date.startswith(current_year)).all()
    ap_invoices = db.query(ApInvoice).filter(ApInvoice.date.startswith(current_year)).all()
    outstanding_ar = sum((ar.total_amount or 0) - (ar.amount_paid or 0) for ar in ar_invoices if ar.status != "Paid")
    outstanding_ap = sum((ap.total_amount or 0) - (ap.amount_paid or 0) for ap in ap_invoices if ap.status != "Paid")

    # Total Pengeluaran
    all_expenses_ytd = db.query(Expense).filter(Expense.date.startswith(current_year)).all()
    total_pengeluaran = sum(e.amount or 0 for e in all_expenses_ytd) + sum((ap.total_amount or 0) for ap in ap_invoices)

    return {
        "cash_position": format_idr(cash_position),
        "cash_position_raw": cash_position,
        "revenue_ytd": format_idr(total_revenue),
        "revenue_ytd_raw": total_revenue,
        "gross_profit": format_idr(gross_profit),
        "gross_profit_raw": gross_profit,
        "net_profit": format_idr(net_profit),
        "net_profit_raw": net_profit,
        "total_pengeluaran": format_idr(total_pengeluaran),
        "total_pengeluaran_raw": total_pengeluaran,
        "eqp_utilization": "85%",
        "outstanding_ar": format_idr(outstanding_ar),
        "outstanding_ap": format_idr(outstanding_ap),
    }


@router.get("/treasury")
def get_treasury_realtime(db: Session = Depends(get_db)):
    """
    Endpoint Real-Time Treasury & Bank Liquidity langsung dari Buku Kas & Bank.
    """
    accounts = db.query(ChartOfAccount).filter(
        or_(
            ChartOfAccount.account_code.like('111%'),
            ChartOfAccount.account_code.like('112%')
        )
    ).order_by(ChartOfAccount.account_code).all()

    # Direct Bank lookup from Master Data Bank (Linked by coa_account_id)
    db_banks = db.query(Bank).all()
    bank_by_coa_id = {b.coa_account_id: b for b in db_banks if b.coa_account_id}
    bank_by_code_or_name = {}
    for b in db_banks:
        if b.account_number:
            name_lower = (b.name or '').lower()
            code_lower = (b.code or '').lower()
            if 'mandiri' in name_lower or 'mdr' in code_lower:
                bank_by_code_or_name['11210'] = b.account_number
                bank_by_code_or_name['1121'] = b.account_number
            elif 'cimb' in name_lower or 'niaga' in name_lower:
                bank_by_code_or_name['11220'] = b.account_number
                bank_by_code_or_name['1122'] = b.account_number
            elif 'bca' in name_lower:
                bank_by_code_or_name['11200'] = b.account_number
                bank_by_code_or_name['1120'] = b.account_number

    colors_map = {
        '1110': '#7F8F74',
        '11100': '#7F8F74',
        '1120': '#0284C7',
        '11200': '#0284C7',
        '1121': '#294825',
        '11210': '#294825',
        '1122': '#D4AF37',
        '11220': '#D4AF37'
    }

    treasury_accounts = []
    total_cash = 0.0

    for a in accounts:
        lines = db.query(JournalLine).join(Journal, Journal.id == JournalLine.journal_id).filter(
            JournalLine.account_id == a.id,
            Journal.status == 'Posted'
        ).all()
        deb = sum(l.debit or 0.0 for l in lines)
        cred = sum(l.credit or 0.0 for l in lines)
        bal = deb - cred

        # Find linked bank
        linked_bank = bank_by_coa_id.get(a.id)
        if linked_bank:
            acc_num = linked_bank.account_number
        elif str(a.account_code).startswith('111'):
            acc_num = 'Kas Kantor Operasional'
        else:
            acc_num = bank_by_code_or_name.get(a.account_code, "N/A")

        if bal != 0 or str(a.account_code) in ['1121', '1122', '11210', '11220'] or linked_bank is not None:
            treasury_accounts.append({
                "id": str(a.id),
                "code": a.account_code,
                "name": a.account_name,
                "account_number": acc_num,
                "balance": bal,
                "balance_formatted": format_idr(bal),
                "color": colors_map.get(a.account_code, '#294825')
            })
            total_cash += bal

    # Calculate percentage share
    for acc in treasury_accounts:
        if total_cash > 0:
            acc["percentage"] = round((acc["balance"] / total_cash) * 100, 1)
        else:
            acc["percentage"] = 0.0

    return {
        "total_cash": total_cash,
        "total_cash_formatted": format_idr(total_cash),
        "total_accounts_count": len(treasury_accounts),
        "accounts": treasury_accounts
    }


@router.get("/expense-breakdown")
def get_expense_breakdown_realtime(
    project_id: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Endpoint Real-Time Komposisi Pengeluaran (Bisa difilter per project_id & period).
    """
    today = datetime.utcnow()
    current_year = str(today.year)

    exp_q = db.query(Expense)
    ap_q = db.query(ApInvoice)

    if project_id and project_id != 'ALL':
        exp_q = exp_q.filter(Expense.project_id == project_id)
        ap_q = ap_q.filter(ApInvoice.project_id == project_id)

    if period == 'AUG':
        exp_q = exp_q.filter(Expense.date.startswith(f"{current_year}-08"))
        ap_q = ap_q.filter(ApInvoice.date.startswith(f"{current_year}-08"))
    elif period == 'Q3':
        exp_q = exp_q.filter(or_(Expense.date.startswith(f"{current_year}-07"), Expense.date.startswith(f"{current_year}-08"), Expense.date.startswith(f"{current_year}-09")))
        ap_q = ap_q.filter(or_(ApInvoice.date.startswith(f"{current_year}-07"), ApInvoice.date.startswith(f"{current_year}-08"), ApInvoice.date.startswith(f"{current_year}-09")))
    else:
        exp_q = exp_q.filter(Expense.date.startswith(current_year))
        ap_q = ap_q.filter(ApInvoice.date.startswith(current_year))

    expenses = exp_q.all()
    ap_invoices = ap_q.all()

    categories = {
        'Sewa Rig & Pengeboran': {'value': 0.0, 'color': '#294825'},
        'Ops & Kasbon Lapangan': {'value': 0.0, 'color': '#B45309'},
        'Gaji & Tenaga Ahli': {'value': 0.0, 'color': '#D4AF37'},
        'Sewa Alat Geofisika': {'value': 0.0, 'color': '#7F8F74'},
        'Overhead Kantor & Adm': {'value': 0.0, 'color': '#556B2F'},
    }

    for e in expenses:
        desc = (e.description or '').lower()
        amt = e.amount or 0.0
        if any(k in desc for k in ['rig', 'bor', 'drilling', 'sucofindo', 'inspeksi', 'tulangan', 'unp', 'baja']):
            categories['Sewa Rig & Pengeboran']['value'] += amt
        elif any(k in desc for k in ['gaji', 'salary', 'pjo', 'finance', 'honor']):
            categories['Gaji & Tenaga Ahli']['value'] += amt
        elif any(k in desc for k in ['sewa alat', 'magnetometer', 'geolistrik', 'magnetic susceptibility', 'biaya alat']):
            categories['Sewa Alat Geofisika']['value'] += amt
        elif any(k in desc for k in ['bpjs', 'meeting', 'rumah web', 'domain', 'adm', 'biaya admin']):
            categories['Overhead Kantor & Adm']['value'] += amt
        else:
            categories['Ops & Kasbon Lapangan']['value'] += amt

    for ap in ap_invoices:
        categories['Sewa Rig & Pengeboran']['value'] += (ap.total_amount or 0.0)

    total_expense = sum(c['value'] for c in categories.values())

    result = []
    for name, data in categories.items():
        val = data['value']
        pct = round((val / total_expense * 100), 1) if total_expense > 0 else 0.0
        if val > 0 or total_expense == 0:
            result.append({
                "name": name,
                "value": round(val),
                "percentage": pct,
                "color": data['color']
            })

    return {
        "total_expense": total_expense,
        "total_expense_formatted": format_idr(total_expense),
        "categories": result
    }


@router.get("/cashflow-monthly")
def get_cashflow_monthly(
    project_id: Optional[str] = Query(None),
    interval: Optional[str] = Query("month"), # "week", "month", "year"
    db: Session = Depends(get_db)
):
    """
    Cash Flow trend (Bulanan, Mingguan, Tahunan) dari Journal Lines (akun Kas & Bank),
    bisa difilter per project_id dan interval.
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

    # Ambil journal lines
    line_q = db.query(JournalLine).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        JournalLine.account_id.in_(cash_account_ids),
        Journal.status == 'Posted'
    )

    if interval == "year":
        pass
    else:
        line_q = line_q.filter(Journal.date.startswith(current_year))

    if project_id and project_id != 'ALL':
        line_q = line_q.filter(JournalLine.project_id == project_id)

    lines = line_q.all()

    if interval == "week":
        import collections
        from datetime import timedelta
        weeks_map = collections.defaultdict(lambda: {'in': 0.0, 'out': 0.0, 'monday': None, 'wk_num': 0})
        for line in lines:
            try:
                d = datetime.strptime(str(line.journal.date)[:10], "%Y-%m-%d")
            except Exception:
                continue
            iso_year, iso_week, _ = d.isocalendar()
            monday = d - timedelta(days=d.weekday())
            wk_key = (iso_year, iso_week)
            weeks_map[wk_key]['in'] += (line.debit or 0.0)
            weeks_map[wk_key]['out'] += (line.credit or 0.0)
            weeks_map[wk_key]['monday'] = monday
            weeks_map[wk_key]['wk_num'] = iso_week

        sorted_weeks = sorted(weeks_map.items(), key=lambda x: x[0])
        result = [
            {
                'month': f"W{v['wk_num']} ({v['monday'].strftime('%d %b')})",
                'in': round(v['in']),
                'out': round(v['out'])
            }
            for k, v in sorted_weeks
        ]
        return result

    elif interval == "year":
        import collections
        years_map = collections.defaultdict(lambda: {'in': 0.0, 'out': 0.0})
        for line in lines:
            try:
                yr = str(line.journal.date)[:4]
            except Exception:
                continue
            years_map[yr]['in'] += (line.debit or 0.0)
            years_map[yr]['out'] += (line.credit or 0.0)

        for y in ['2024', '2025', '2026']:
            if y not in years_map:
                years_map[y] = {'in': 0.0, 'out': 0.0}

        sorted_years = sorted(years_map.keys())
        result = [
            {
                'month': y,
                'in': round(years_map[y]['in']),
                'out': round(years_map[y]['out'])
            }
            for y in sorted_years
        ]
        return result

    else:
        # Default: Month
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        monthly_data = {m: {'in': 0.0, 'out': 0.0} for m in months}

        for line in lines:
            try:
                d = datetime.strptime(str(line.journal.date)[:10], "%Y-%m-%d")
            except Exception:
                continue
            m = months[d.month - 1]
            monthly_data[m]['in'] += (line.debit or 0.0)
            monthly_data[m]['out'] += (line.credit or 0.0)

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
