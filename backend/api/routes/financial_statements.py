from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional

from db.database import get_db
from db.models import JournalLine, Journal, ChartOfAccount

router = APIRouter()

@router.get("/financial-statements/income-statement")
def get_income_statement(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Income Statement (Profit & Loss).
    Revenue - Expenses (COGS & OPEX)
    """
    # Fetch all journal entries in the period
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
    )
    
    results = query.all()
    
    revenue_items = []
    cogs_items = []
    expense_items = []
    
    total_revenue = 0.0
    total_cogs = 0.0
    total_expense = 0.0
    
    for row in results:
        net_balance = (row.total_credit or 0.0) - (row.total_debit or 0.0) if row.account_type == 'Revenue' else (row.total_debit or 0.0) - (row.total_credit or 0.0)
        
        item = {
            'account_code': row.account_code,
            'account_name': row.account_name,
            'balance': net_balance
        }
        
        if row.account_type == 'Revenue':
            revenue_items.append(item)
            total_revenue += net_balance
        elif row.account_type == 'Expense':
            if str(row.account_code).startswith('5'):
                cogs_items.append(item)
                total_cogs += net_balance
            else:
                expense_items.append(item)
                total_expense += net_balance
                
    gross_profit = total_revenue - total_cogs
    net_income = gross_profit - total_expense
    
    return {
        'period': f"{start_date} to {end_date}",
        'revenue': {
            'items': sorted(revenue_items, key=lambda x: x['account_code']),
            'total': total_revenue
        },
        'cogs': {
            'items': sorted(cogs_items, key=lambda x: x['account_code']),
            'total': total_cogs
        },
        'gross_profit': gross_profit,
        'expenses': {
            'items': sorted(expense_items, key=lambda x: x['account_code']),
            'total': total_expense
        },
        'net_income': net_income
    }

@router.get("/financial-statements/balance-sheet")
def get_balance_sheet(
    as_of_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Balance Sheet as of a specific date.
    Assets = Liabilities + Equity
    """
    # Fetch all journal entries UP TO the as_of_date
    query = db.query(
        ChartOfAccount.account_code,
        ChartOfAccount.account_name,
        ChartOfAccount.account_type,
        ChartOfAccount.normal_balance,
        func.sum(JournalLine.debit).label('total_debit'),
        func.sum(JournalLine.credit).label('total_credit')
    ).join(
        JournalLine, JournalLine.account_id == ChartOfAccount.id
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        Journal.date <= as_of_date,
        Journal.status == 'Posted'
    ).group_by(
        ChartOfAccount.account_code,
        ChartOfAccount.account_name,
        ChartOfAccount.account_type,
        ChartOfAccount.normal_balance
    )
    
    results = query.all()
    
    asset_items = []
    liability_items = []
    equity_items = []
    
    total_assets = 0.0
    total_liabilities = 0.0
    total_equity_ledger = 0.0
    
    # We also need to calculate Net Income up to this date to add to Retained Earnings
    total_revenue = 0.0
    total_expense = 0.0
    
    for row in results:
        is_debit_normal = (row.normal_balance == 'Debit')
        
        debit = row.total_debit or 0.0
        credit = row.total_credit or 0.0
        
        net_balance = (debit - credit) if is_debit_normal else (credit - debit)
        
        item = {
            'account_code': row.account_code,
            'account_name': row.account_name,
            'balance': net_balance
        }
        
        if row.account_type == 'Asset':
            asset_items.append(item)
            total_assets += net_balance
        elif row.account_type == 'Liability':
            liability_items.append(item)
            total_liabilities += net_balance
        elif row.account_type == 'Equity':
            # For Equity accounts, Credit increases equity, Debit (Prive/Dividends) reduces equity
            equity_balance = credit - debit
            item = {
                'account_code': row.account_code,
                'account_name': row.account_name,
                'balance': equity_balance
            }
            equity_items.append(item)
            total_equity_ledger += equity_balance
        elif row.account_type == 'Revenue':
            total_revenue += (credit - debit)
        elif row.account_type == 'Expense':
            total_expense += (debit - credit)
            
    # Calculate current period net income to be added to equity
    net_income = total_revenue - total_expense
    
    # Add Net Income to Equity section virtually
    if net_income != 0:
        equity_items.append({
            'account_code': '3999',
            'account_name': 'Current Year Earnings',
            'balance': net_income
        })
        
    total_equity_calculated = total_equity_ledger + net_income
    
    return {
        'as_of_date': as_of_date,
        'assets': {
            'items': sorted(asset_items, key=lambda x: x['account_code']),
            'total': total_assets
        },
        'liabilities': {
            'items': sorted(liability_items, key=lambda x: x['account_code']),
            'total': total_liabilities
        },
        'equity': {
            'items': sorted(equity_items, key=lambda x: x['account_code']),
            'total': total_equity_calculated
        },
        'total_liabilities_and_equity': total_liabilities + total_equity_calculated,
        'is_balanced': round(total_assets, 2) == round(total_liabilities + total_equity_calculated, 2)
    }

@router.get("/financial-statements/cash-flow")
def get_cash_flow(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Cash Flow Statement using a hybrid direct method
    based on journal entries affecting Cash & Bank accounts.
    """
    # Find all Cash & Bank accounts (assume starting with '111' or '112')
    from sqlalchemy import or_
    cash_accounts = db.query(ChartOfAccount.id).filter(
        or_(
            ChartOfAccount.account_code.like('111%'),
            ChartOfAccount.account_code.like('112%')
        )
    ).all()
    cash_account_ids = [c[0] for c in cash_accounts]
    
    # Get all journal entries involving cash in this period
    journals = db.query(Journal).filter(
        Journal.date >= start_date,
        Journal.date <= end_date,
        Journal.status == 'Posted'
    ).all()
    
    # Import Project to get project name
    from db.models import Project
    
    def get_project_name(pid):
        if not pid: return "None / Overhead"
        proj = db.query(Project).filter(Project.id == pid).first()
        return proj.name if proj else "Unknown Project"
    
    operating_in = 0.0
    operating_out = 0.0
    investing_in = 0.0
    investing_out = 0.0
    financing_in = 0.0
    financing_out = 0.0
    
    operating_details = []
    investing_details = []
    financing_details = []
    
    operating_in_acc = {}
    operating_out_acc = {}
    investing_in_acc = {}
    investing_out_acc = {}
    financing_in_acc = {}
    financing_out_acc = {}
    
    for j in journals:
        # Check if this journal involves cash
        has_cash = any(item.account_id in cash_account_ids for item in j.lines)
        if not has_cash:
            continue
            
        # Calculate net cash change for this journal (Debit to cash = In, Credit = Out)
        cash_change = 0.0
        other_accounts_types = []
        other_accounts_codes = []
        project_ids = set()
        
        for item in j.lines:
            if item.project_id:
                project_ids.add(item.project_id)
                
            if item.account_id in cash_account_ids:
                cash_change += (item.debit or 0.0) - (item.credit or 0.0)
            else:
                acc = db.query(ChartOfAccount).filter(ChartOfAccount.id == item.account_id).first()
                if acc:
                    other_accounts_types.append(acc.account_type)
                    other_accounts_codes.append(str(acc.account_code))
                    
        # Categorize based on the other accounts involved
        is_investing = any(code.startswith('13') or code.startswith('14') for code in other_accounts_codes)
        is_financing = any('Equity' in t or code.startswith('22') or code.startswith('23') for t, code in zip(other_accounts_types, other_accounts_codes))
        
        # Get primary project for the tag
        primary_pid = list(project_ids)[0] if project_ids else None
        proj_name = get_project_name(primary_pid)
        
        detail_obj = {
            'date': j.date,
            'journal_number': j.journal_number,
            'description': j.description,
            'project': proj_name,
            'amount': abs(cash_change)
        }
        
        # Track counter-accounts for itemized breakdown
        for item in j.lines:
            if item.account_id not in cash_account_ids:
                acc = db.query(ChartOfAccount).filter(ChartOfAccount.id == item.account_id).first()
                if not acc: continue
                acc_key = f"{acc.account_code} - {acc.account_name}"
                net_line = (item.debit or 0.0) - (item.credit or 0.0)
                if is_investing:
                    if net_line > 0:
                        investing_out_acc[acc_key] = investing_out_acc.get(acc_key, 0.0) + net_line
                    elif net_line < 0:
                        investing_in_acc[acc_key] = investing_in_acc.get(acc_key, 0.0) + abs(net_line)
                elif is_financing:
                    if net_line > 0:
                        financing_out_acc[acc_key] = financing_out_acc.get(acc_key, 0.0) + net_line
                    elif net_line < 0:
                        financing_in_acc[acc_key] = financing_in_acc.get(acc_key, 0.0) + abs(net_line)
                else:
                    if net_line > 0:
                        operating_out_acc[acc_key] = operating_out_acc.get(acc_key, 0.0) + net_line
                    elif net_line < 0:
                        operating_in_acc[acc_key] = operating_in_acc.get(acc_key, 0.0) + abs(net_line)

        # Simplified logic:
        if is_investing and cash_change < 0:
            investing_out += abs(cash_change)
            detail_obj['type'] = 'outflow'
            investing_details.append(detail_obj)
        elif is_investing and cash_change > 0:
            investing_in += cash_change
            detail_obj['type'] = 'inflow'
            investing_details.append(detail_obj)
        elif is_financing and cash_change > 0:
            financing_in += cash_change
            detail_obj['type'] = 'inflow'
            financing_details.append(detail_obj)
        elif is_financing and cash_change < 0:
            financing_out += abs(cash_change)
            detail_obj['type'] = 'outflow'
            financing_details.append(detail_obj)
        else:
            if cash_change > 0:
                operating_in += cash_change
                detail_obj['type'] = 'inflow'
                operating_details.append(detail_obj)
            elif cash_change < 0:
                operating_out += abs(cash_change)
                detail_obj['type'] = 'outflow'
                operating_details.append(detail_obj)
                
    net_operating = operating_in - operating_out
    net_investing = investing_in - investing_out
    net_financing = financing_in - financing_out
    
    net_increase = net_operating + net_investing + net_financing
    
    # Calculate Beginning Cash Balance (all posted entries before start_date in Cash & Bank accounts)
    beginning_cash_query = db.query(
        func.sum(JournalLine.debit - JournalLine.credit).label('beginning_cash')
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        JournalLine.account_id.in_(cash_account_ids),
        Journal.date < start_date,
        Journal.status == 'Posted'
    ).first()
    
    beginning_cash = float(beginning_cash_query.beginning_cash or 0.0)
    ending_cash = beginning_cash + net_increase

    def format_acc_breakdown(acc_dict):
        return [
            {'account': k, 'amount': v}
            for k, v in sorted(acc_dict.items(), key=lambda x: x[0])
            if v > 0
        ]
    
    return {
        'period': f"{start_date} to {end_date}",
        'operating_activities': {
            'inflow': operating_in,
            'outflow': operating_out,
            'net': net_operating,
            'inflow_by_account': format_acc_breakdown(operating_in_acc),
            'outflow_by_account': format_acc_breakdown(operating_out_acc),
            'details': sorted(operating_details, key=lambda x: x['date'])
        },
        'investing_activities': {
            'inflow': investing_in,
            'outflow': investing_out,
            'net': net_investing,
            'inflow_by_account': format_acc_breakdown(investing_in_acc),
            'outflow_by_account': format_acc_breakdown(investing_out_acc),
            'details': sorted(investing_details, key=lambda x: x['date'])
        },
        'financing_activities': {
            'inflow': financing_in,
            'outflow': financing_out,
            'net': net_financing,
            'inflow_by_account': format_acc_breakdown(financing_in_acc),
            'outflow_by_account': format_acc_breakdown(financing_out_acc),
            'details': sorted(financing_details, key=lambda x: x['date'])
        },
        'net_increase_in_cash': net_increase,
        'beginning_cash_balance': beginning_cash,
        'ending_cash_balance': ending_cash
    }

@router.get("/financial-statements/equity-changes")
def get_equity_changes(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """
    Statement of Changes in Equity
    Beginning Equity + Net Income - Dividends/Draws = Ending Equity
    """
    # 1. Get Beginning Equity (all equity entries before start_date)
    beginning_query = db.query(
        func.sum(JournalLine.credit - JournalLine.debit).label('net_equity')
    ).join(
        ChartOfAccount, ChartOfAccount.id == JournalLine.account_id
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        ChartOfAccount.account_type == 'Equity',
        Journal.date < start_date,
        Journal.status == 'Posted'
    ).first()
    
    base_equity = beginning_query.net_equity or 0.0
    
    # 1b. Get Retained Earnings (Net Income from prior periods)
    prior_income_query = db.query(
        ChartOfAccount.account_type,
        func.sum(JournalLine.credit).label('total_credit'),
        func.sum(JournalLine.debit).label('total_debit')
    ).join(
        ChartOfAccount, ChartOfAccount.id == JournalLine.account_id
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        ChartOfAccount.account_type.in_(['Revenue', 'Expense']),
        Journal.date < start_date,
        Journal.status == 'Posted'
    ).group_by(ChartOfAccount.account_type).all()
    
    prior_revenue = 0.0
    prior_expenses = 0.0
    for row in prior_income_query:
        if row.account_type == 'Revenue':
            prior_revenue += (row.total_credit or 0.0) - (row.total_debit or 0.0)
        else:
            prior_expenses += (row.total_debit or 0.0) - (row.total_credit or 0.0)
            
    prior_retained_earnings = prior_revenue - prior_expenses
    beginning_equity = base_equity + prior_retained_earnings
    
    # 2. Get Net Income for the period
    income_query = db.query(
        ChartOfAccount.account_type,
        func.sum(JournalLine.credit).label('total_credit'),
        func.sum(JournalLine.debit).label('total_debit')
    ).join(
        ChartOfAccount, ChartOfAccount.id == JournalLine.account_id
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        ChartOfAccount.account_type.in_(['Revenue', 'Expense']),
        Journal.date >= start_date,
        Journal.date <= end_date,
        Journal.status == 'Posted'
    ).group_by(ChartOfAccount.account_type).all()
    
    revenue = 0.0
    expenses = 0.0
    for row in income_query:
        if row.account_type == 'Revenue':
            revenue += (row.total_credit or 0.0) - (row.total_debit or 0.0)
        else:
            expenses += (row.total_debit or 0.0) - (row.total_credit or 0.0)
            
    net_income = revenue - expenses
    
    # 3. Get Dividends / Withdrawals in the period (Equity debits)
    draws_query = db.query(
        func.sum(JournalLine.debit).label('total_draws')
    ).join(
        ChartOfAccount, ChartOfAccount.id == JournalLine.account_id
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        ChartOfAccount.account_type == 'Equity',
        Journal.date >= start_date,
        Journal.date <= end_date,
        Journal.status == 'Posted'
    ).first()
    
    dividends_paid = draws_query.total_draws or 0.0
    
    # 4. New Capital Contributions (Equity credits)
    capital_query = db.query(
        func.sum(JournalLine.credit).label('total_capital')
    ).join(
        ChartOfAccount, ChartOfAccount.id == JournalLine.account_id
    ).join(
        Journal, Journal.id == JournalLine.journal_id
    ).filter(
        ChartOfAccount.account_type == 'Equity',
        Journal.date >= start_date,
        Journal.date <= end_date,
        Journal.status == 'Posted'
    ).first()
    
    new_capital = capital_query.total_capital or 0.0
    
    ending_equity = beginning_equity + net_income + new_capital - dividends_paid
    
    return {
        'period': f"{start_date} to {end_date}",
        'beginning_equity': beginning_equity,
        'additions': {
            'net_income': net_income,
            'new_capital': new_capital
        },
        'deductions': {
            'dividends_paid': dividends_paid
        },
        'ending_equity': ending_equity
    }

@router.get("/financial-statements/calk-notes")
def get_calk_notes(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Notes to Financial Statements (CALK) with real financial data.
    """
    from db.models import Journal, JournalLine, ChartOfAccount, ArInvoice, ApInvoice, Project

    # 1. Cash Position
    from sqlalchemy import or_
    cash_accounts = db.query(ChartOfAccount).filter(
        or_(
            ChartOfAccount.account_code.like('111%'),
            ChartOfAccount.account_code.like('112%')
        )
    ).all()
    cash_ids = [a.id for a in cash_accounts]
    cash_lines = (
        db.query(JournalLine)
        .join(Journal, Journal.id == JournalLine.journal_id)
        .filter(JournalLine.account_id.in_(cash_ids), Journal.status == 'Posted')
        .all()
    )
    cash_by_account = {}
    for l in cash_lines:
        acct = next((a for a in cash_accounts if a.id == l.account_id), None)
        name = acct.account_name if acct else str(l.account_id)
        cash_by_account[name] = cash_by_account.get(name, 0) + (l.debit or 0) - (l.credit or 0)
    total_cash = sum(cash_by_account.values())

    # 2. Revenue & Profit
    all_coas = db.query(ChartOfAccount).all()
    rev_ids = {a.id for a in all_coas if a.account_code.startswith('4')}
    cogs_ids = {a.id for a in all_coas if a.account_code.startswith('5')}
    opex_ids = {a.id for a in all_coas if a.account_code.startswith('6') or a.account_code.startswith('7')}
    coa_map = {a.id: a.account_name for a in all_coas}

    period_lines = (
        db.query(JournalLine)
        .join(Journal, Journal.id == JournalLine.journal_id)
        .filter(Journal.status == 'Posted', Journal.date >= start_date, Journal.date <= end_date)
        .all()
    )

    total_revenue = 0.0
    total_cogs = 0.0
    total_opex = 0.0
    cogs_breakdown = {}
    opex_breakdown = {}

    for jl in period_lines:
        if jl.account_id in rev_ids:
            total_revenue += (jl.credit or 0) - (jl.debit or 0)
        elif jl.account_id in cogs_ids:
            amt = (jl.debit or 0) - (jl.credit or 0)
            total_cogs += amt
            name = coa_map.get(jl.account_id, 'Lainnya')
            cogs_breakdown[name] = cogs_breakdown.get(name, 0) + amt
        elif jl.account_id in opex_ids:
            amt = (jl.debit or 0) - (jl.credit or 0)
            total_opex += amt
            name = coa_map.get(jl.account_id, 'Lainnya')
            opex_breakdown[name] = opex_breakdown.get(name, 0) + amt

    gross_profit = total_revenue - total_cogs
    net_profit = gross_profit - total_opex
    total_expenses = total_cogs + total_opex

    # 3. AR / AP
    ar_all = db.query(ArInvoice).all()
    ap_all = db.query(ApInvoice).all()
    total_ar = sum((a.total_amount or 0) for a in ar_all)
    outstanding_ar = sum((a.total_amount or 0) - (a.amount_paid or 0) for a in ar_all if a.status != 'Paid')
    total_ap = sum((a.total_amount or 0) for a in ap_all)
    outstanding_ap = sum((a.total_amount or 0) - (a.amount_paid or 0) for a in ap_all if a.status != 'Paid')
    ar_by_status = {}
    for a in ar_all:
        ar_by_status[a.status] = ar_by_status.get(a.status, 0) + (a.total_amount or 0)
    ap_by_status = {}
    for a in ap_all:
        ap_by_status[a.status] = ap_by_status.get(a.status, 0) + (a.total_amount or 0)

    # 4. Projects
    projects = db.query(Project).all()
    total_contract_value = sum((p.contract_value_idr or 0) for p in projects)
    active_projects = [p for p in projects if p.status and p.status.lower() in ('active', 'in progress', 'ongoing')]
    project_list = [{'name': p.name, 'code': p.code, 'status': p.status, 'value': p.contract_value_idr or 0} for p in projects]

    return {
        'period': f"{start_date} to {end_date}",
        'summary': {
            'cash_position': total_cash,
            'cash_by_account': cash_by_account,
            'total_revenue': total_revenue,
            'total_cogs': total_cogs,
            'total_opex': total_opex,
            'total_expenses': total_expenses,
            'gross_profit': gross_profit,
            'net_profit': net_profit,
            'total_ar': total_ar,
            'outstanding_ar': outstanding_ar,
            'ar_by_status': ar_by_status,
            'total_ap': total_ap,
            'outstanding_ap': outstanding_ap,
            'ap_by_status': ap_by_status,
            'cogs_breakdown': cogs_breakdown,
            'opex_breakdown': opex_breakdown,
            'total_contract_value': total_contract_value,
            'total_projects': len(projects),
            'active_projects': len(active_projects),
            'project_list': project_list,
        }
    }

@router.get("/financial-statements/trial-balance")
def get_trial_balance(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """
    Generate Trial Balance (Neraca Saldo)
    Lists all Chart of Accounts with Beginning Balance, Debit/Credit Movements, and Ending Balance.
    Verifies that total debits equal total credits.
    """
    coas = db.query(ChartOfAccount).order_by(ChartOfAccount.account_code.asc()).all()
    
    items = []
    tot_init_debit = 0.0
    tot_init_credit = 0.0
    tot_mov_debit = 0.0
    tot_mov_credit = 0.0
    tot_end_debit = 0.0
    tot_end_credit = 0.0
    
    for coa in coas:
        # 1. Beginning balance before start_date
        init_q = db.query(
            func.sum(JournalLine.debit).label('deb'),
            func.sum(JournalLine.credit).label('crd')
        ).join(Journal, Journal.id == JournalLine.journal_id).filter(
            JournalLine.account_id == coa.id,
            Journal.status == 'Posted',
            Journal.date < start_date
        ).first()
        
        init_d = float(init_q.deb or 0.0)
        init_c = float(init_q.crd or 0.0)
        
        # 2. Movement in period
        mov_q = db.query(
            func.sum(JournalLine.debit).label('deb'),
            func.sum(JournalLine.credit).label('crd')
        ).join(Journal, Journal.id == JournalLine.journal_id).filter(
            JournalLine.account_id == coa.id,
            Journal.status == 'Posted',
            Journal.date >= start_date,
            Journal.date <= end_date
        ).first()
        
        mov_d = float(mov_q.deb or 0.0)
        mov_c = float(mov_q.crd or 0.0)
        
        # Skip accounts that have zero balance and zero movement
        if init_d == 0 and init_c == 0 and mov_d == 0 and mov_c == 0:
            continue
            
        is_debit_normal = coa.account_type in ['Asset', 'Expense']
        
        # Beginning balance breakdown
        # Net balance
        init_net = (init_d - init_c) if is_debit_normal else (init_c - init_d)
        init_deb = init_net if is_debit_normal and init_net >= 0 else (0.0 if is_debit_normal else (abs(init_net) if init_net < 0 else 0.0))
        init_crd = init_net if not is_debit_normal and init_net >= 0 else (0.0 if not is_debit_normal else (abs(init_net) if init_net < 0 else 0.0))
        
        # Ending totals breakdown
        end_d_total = init_d + mov_d
        end_c_total = init_c + mov_c
        end_net = (end_d_total - end_c_total) if is_debit_normal else (end_c_total - end_d_total)
        end_deb = end_net if is_debit_normal and end_net >= 0 else (0.0 if is_debit_normal else (abs(end_net) if end_net < 0 else 0.0))
        end_crd = end_net if not is_debit_normal and end_net >= 0 else (0.0 if not is_debit_normal else (abs(end_net) if end_net < 0 else 0.0))
        
        tot_init_debit += init_deb
        tot_init_credit += init_crd
        tot_mov_debit += mov_d
        tot_mov_credit += mov_c
        tot_end_debit += end_deb
        tot_end_credit += end_crd
        
        items.append({
            'account_id': coa.id,
            'account_code': coa.account_code,
            'account_name': coa.account_name,
            'account_type': coa.account_type,
            'normal_balance': 'Debit' if is_debit_normal else 'Credit',
            'beginning_balance': init_net,
            'beginning_debit': init_deb,
            'beginning_credit': init_crd,
            'debit': mov_d,
            'credit': mov_c,
            'ending_balance': end_net,
            'ending_debit': end_deb,
            'ending_credit': end_crd
        })
        
    return {
        'period': f"{start_date} to {end_date}",
        'items': items,
        'summary': {
            'total_beginning_debit': tot_init_debit,
            'total_beginning_credit': tot_init_credit,
            'is_beginning_balanced': round(tot_init_debit, 2) == round(tot_init_credit, 2),
            'total_movement_debit': tot_mov_debit,
            'total_movement_credit': tot_mov_credit,
            'is_movement_balanced': round(tot_mov_debit, 2) == round(tot_mov_credit, 2),
            'movement_difference': abs(tot_mov_debit - tot_mov_credit),
            'total_ending_debit': tot_end_debit,
            'total_ending_credit': tot_end_credit,
            'is_ending_balanced': round(tot_end_debit, 2) == round(tot_end_credit, 2)
        }
    }


@router.get("/financial-statements/project-weekly-cashflow")
def get_project_weekly_cashflow(
    project_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    version: Optional[str] = "base",
    db: Session = Depends(get_db)
):
    """
    Weekly cash flow statement for a project, categorized by transaction types
    verified against both Chart of Accounts (COA) and detailed transaction memos.
    """
    from db.models import Project, Expense
    from sqlalchemy import or_

    # Find project (default to IKPT if not provided or none selected)
    target_project = None
    if project_id and project_id != "all":
        target_project = db.query(Project).filter(Project.id == project_id).first()
    if not target_project:
        target_project = db.query(Project).filter(
            or_(Project.name.ilike('%IKPT%'), Project.code.ilike('%IKPT%'))
        ).first()

    proj_id = target_project.id if target_project else "c12fbe7f-032d-49a5-af66-9f8c21327cbb"
    proj_name = target_project.name if target_project else "Borpile & Struktur - IKPT Solok"
    proj_code = target_project.code if target_project else "004_IKPT-SOLOK-001"
    contract_val = target_project.contract_value_idr if target_project else 2870121121.0
    client_name = target_project.customer.name if target_project and target_project.customer else ("PT. Inti Karya Persada Tehnik (IKPT)" if (target_project and "IKPT" in (target_project.code or "")) else "-")

    # Strictly query journals belonging to this specific project
    subq = db.query(Journal.id).join(JournalLine, Journal.id == JournalLine.journal_id)\
        .join(ChartOfAccount, JournalLine.account_id == ChartOfAccount.id)\
        .filter(
            ChartOfAccount.account_code.like('11%'),
            JournalLine.project_id == proj_id
        )

    if start_date:
        subq = subq.filter(Journal.date >= start_date)
    if end_date:
        subq = subq.filter(Journal.date <= end_date)

    matched_journal_ids = [r[0] for r in subq.distinct().all()]

    # Fetch all lines for these journals
    journals = db.query(Journal).filter(Journal.id.in_(matched_journal_ids)).order_by(Journal.date.asc(), Journal.journal_number.asc()).all()

    # Define helper to determine week
    from datetime import date as dt_date
    def get_week_info(date_str):
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        if d <= dt_date(2026, 7, 19):
            return 1, "W1 (13-19 Jul)", "13 Jul – 19 Jul 2026"
        elif d <= dt_date(2026, 7, 26):
            return 2, "W2 (20-26 Jul)", "20 Jul – 26 Jul 2026"
        elif d <= dt_date(2026, 8, 2):
            return 3, "W3 (27 Jul-02 Agu)", "27 Jul – 02 Agu 2026"
        elif d <= dt_date(2026, 8, 9):
            return 4, "W4 (03-09 Agu)", "03 Agu – 09 Agu 2026"
        elif d <= dt_date(2026, 8, 16):
            return 5, "W5 (10-16 Agu)", "10 Agu – 16 Agu 2026"
        elif d <= dt_date(2026, 8, 23):
            return 6, "W6 (17-23 Agu)", "17 Agu – 23 Agu 2026"
        elif d <= dt_date(2026, 8, 30):
            return 7, "W7 (24-30 Agu)", "24 Agu – 30 Agu 2026"
        elif d <= dt_date(2026, 9, 6):
            return 8, "W8 (31 Agu-06 Sep)", "31 Agu – 06 Sep 2026"
        elif d <= dt_date(2026, 9, 13):
            return 9, "W9 (07-13 Sep)", "07 Sep – 13 Sep 2026"
        else:
            return 10, "W10 (14-20 Sep)", "14 Sep – 20 Sep 2026"

    # Category definitions & ordering
    CATEGORY_ORDER = [
        {"code": "INFLOW-01", "name": "[BARU] Penerimaan Kas (Termin Proyek)", "is_new": True, "flow": "INFLOW"},
        {"code": "KAT-01", "name": "MCU + BPJS", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-02", "name": "Sucofindo + Uji Material", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-03", "name": "Preparasi Rig", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-04", "name": "Mobilisasi Personil, Rig, Material", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-05", "name": "Akomodasi & Meals", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-06", "name": "Rental Rig", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-07", "name": "Material", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-08", "name": "Gaji Personil", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-09", "name": "Consumable", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-10", "name": "Operasional", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-11", "name": "Lain-Lain", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-BARU-01", "name": "[BARU] Kasbon Personil / Tim Lapangan", "is_new": True, "flow": "OUTFLOW"},
    ]

    transactions = []
    weeks_dict = {}
    for w in range(1, 11):
        sample_date = (
            "2026-07-13" if w == 1 else
            "2026-07-21" if w == 2 else
            "2026-07-28" if w == 3 else
            "2026-08-05" if w == 4 else
            "2026-08-12" if w == 5 else
            "2026-08-20" if w == 6 else
            "2026-08-25" if w == 7 else
            "2026-09-02" if w == 8 else
            "2026-09-09" if w == 9 else
            "2026-09-14"
        )
        _, label, drange = get_week_info(sample_date)
        weeks_dict[w] = {
            "week_num": w,
            "label": label,
            "date_range": drange,
            "inflow": 0.0,
            "outflow": 0.0,
            "net": 0.0,
            "cumulative": 0.0,
            "category_amounts": {c["name"]: 0.0 for c in CATEGORY_ORDER if c["flow"] == "OUTFLOW"},
            "coa_amounts": {}
        }

    for j in journals:
        j_lines = db.query(JournalLine).filter(JournalLine.journal_id == j.id).all()
        # Find cash line
        cash_lines = [l for l in j_lines if db.query(ChartOfAccount.account_code).filter(ChartOfAccount.id == l.account_id).scalar().startswith('11')]
        if not cash_lines:
            continue
        cash_line = cash_lines[0]
        cash_coa = db.query(ChartOfAccount).filter(ChartOfAccount.id == cash_line.account_id).first()

        # Non-cash lines (opposing)
        opp_lines = [l for l in j_lines if l.id != cash_line.id]
        main_opp = [l for l in opp_lines if db.query(ChartOfAccount.account_code).filter(ChartOfAccount.id == l.account_id).scalar() != '72100']
        if not main_opp:
            main_opp = opp_lines

        opp_coa = db.query(ChartOfAccount).filter(ChartOfAccount.id == main_opp[0].account_id).first() if main_opp else None
        coa_code = opp_coa.account_code if opp_coa else "-"
        coa_name = opp_coa.account_name if opp_coa else "-"

        # Retrieve expense description if attached
        exp_desc = ""
        if j.ref_id:
            exp_obj = db.query(Expense).filter(Expense.id == j.ref_id).first()
            if exp_obj:
                exp_desc = exp_obj.description or ""

        full_text = f"{j.description or ''} {exp_desc} {cash_line.description or ''}".lower()

        # Determine flow and category
        if cash_line.debit and cash_line.debit > 0:
            flow = "INFLOW"
            amount = float(cash_line.debit)
            category = "[BARU] Penerimaan Kas (Termin Proyek)"
            cat_code = "INFLOW-01"
            is_new = True
        else:
            flow = "OUTFLOW"
            amount = float(cash_line.credit or 0.0)
            is_new = False
            
            # Classification logic
            if 'bpjs' in full_text or 'mcu' in full_text or coa_code == '51731':
                category = "MCU + BPJS"
                cat_code = "KAT-01"
            elif 'sucofindo' in full_text or 'inspeksi alat' in full_text or 'pengujian baja' in full_text or 'labor terpadu' in full_text:
                category = "Sucofindo + Uji Material"
                cat_code = "KAT-02"
            elif ('dp drilling rig' in full_text or 'dp rig' in full_text or 'pelunasan dp rig' in full_text or 'dp ke-dua drilling rig' in full_text) and 'persiapan' not in full_text and 'spare part' not in full_text:
                category = "Rental Rig"
                cat_code = "KAT-06"
            elif 'persiapan drilling' in full_text or 'persiapan rig' in full_text or 'prepare rig' in full_text or 'spare part' in full_text:
                category = "Preparasi Rig"
                cat_code = "KAT-03"
            elif 'travel allowance' in full_text or 'travell allowance' in full_text or 'akomodasi' in full_text or 'meals' in full_text or 'tiket' in full_text or 'flight' in full_text:
                category = "Akomodasi & Meals"
                cat_code = "KAT-05"
            elif 'mobilisasi' in full_text or 'pengiriman material' in full_text:
                category = "Mobilisasi Personil, Rig, Material"
                cat_code = "KAT-04"
            elif 'po-1 material' in full_text or 'toko besi' in full_text or (coa_code == '51200' and 'material' in full_text and 'spillbak' not in full_text):
                category = "Material"
                cat_code = "KAT-07"
            elif 'gaji' in full_text or coa_code in ['51500', '61100']:
                category = "Gaji Personil"
                cat_code = "KAT-08"
            elif 'kasbon' in full_text:
                category = "[BARU] Kasbon Personil / Tim Lapangan"
                cat_code = "KAT-BARU-01"
                is_new = True
            elif 'consumable' in full_text or 'spillbak' in full_text:
                category = "Consumable"
                cat_code = "KAT-09"
            elif 'operasional' in full_text or 'operational' in full_text or 'ops' in full_text or 'meeting' in full_text:
                category = "Operasional"
                cat_code = "KAT-10"
            else:
                category = "Lain-Lain"
                cat_code = "KAT-11"

        w_num, w_label, w_drange = get_week_info(j.date)

        # Update weekly aggregator
        if w_num in weeks_dict:
            if flow == "INFLOW":
                weeks_dict[w_num]["inflow"] += amount
            else:
                weeks_dict[w_num]["outflow"] += amount
                if category in weeks_dict[w_num]["category_amounts"]:
                    weeks_dict[w_num]["category_amounts"][category] += amount
                coa_key = f"{coa_code} - {coa_name}"
                weeks_dict[w_num]["coa_amounts"][coa_key] = weeks_dict[w_num]["coa_amounts"].get(coa_key, 0.0) + amount

        clean_desc = cash_line.description or exp_desc or j.description or ""
        
        # Build journal line breakdown
        lines_data = []
        for l in j_lines:
            acc = db.query(ChartOfAccount).filter(ChartOfAccount.id == l.account_id).first()
            lines_data.append({
                "account_code": acc.account_code if acc else "-",
                "account_name": acc.account_name if acc else "-",
                "description": l.description or "-",
                "debit": float(l.debit or 0.0),
                "credit": float(l.credit or 0.0),
            })

        transactions.append({
            "journal_id": j.id,
            "journal_number": j.journal_number,
            "ref_id": j.ref_id,
            "ref_type": j.ref_type or "Journal",
            "status": j.status or "Posted",
            "attachment_path": j.attachment_path,
            "attachment_memo": j.attachment_memo,
            "lines": lines_data,
            "date": j.date,
            "week_num": w_num,
            "week_label": w_label,
            "flow": flow,
            "amount": amount,
            "category": category,
            "cat_code": cat_code,
            "is_new": is_new,
            "coa_code": coa_code,
            "coa_name": coa_name,
            "description": clean_desc
        })

    # Compute cumulative weekly totals and weekly category/COA breakdowns
    running_cum = 0.0
    weeks_list = []
    for w in sorted(weeks_dict.keys()):
        w_data = weeks_dict[w]
        w_data["net"] = w_data["inflow"] - w_data["outflow"]
        running_cum += w_data["net"]
        w_data["cumulative"] = running_cum

        # Category breakdown for this week
        cat_breakdown = []
        w_outflow = w_data["outflow"]
        for cat_name, cat_amt in w_data["category_amounts"].items():
            if cat_amt > 0:
                pct = (cat_amt / w_outflow * 100) if w_outflow > 0 else 0.0
                cat_breakdown.append({
                    "category": cat_name,
                    "name": cat_name,
                    "amount": cat_amt,
                    "percentage": round(pct, 2)
                })
        cat_breakdown.sort(key=lambda x: x["amount"], reverse=True)
        w_data["category_breakdown"] = cat_breakdown

        # COA breakdown for this week
        coa_breakdown = []
        for c_key, c_amt in w_data["coa_amounts"].items():
            if c_amt > 0:
                pct = (c_amt / w_outflow * 100) if w_outflow > 0 else 0.0
                parts = c_key.split(" - ", 1)
                coa_breakdown.append({
                    "code": parts[0],
                    "name": c_key,
                    "category": c_key,
                    "coa_code": parts[0],
                    "coa_name": parts[1] if len(parts) > 1 else "",
                    "amount": c_amt,
                    "percentage": round(pct, 2)
                })
        coa_breakdown.sort(key=lambda x: x["amount"], reverse=True)
        w_data["coa_breakdown"] = coa_breakdown

        weeks_list.append(w_data)

    # Compute overall category summary
    tot_outflow = sum(w["outflow"] for w in weeks_list)
    tot_inflow = sum(w["inflow"] for w in weeks_list)
    cat_summary = []
    for cat_def in CATEGORY_ORDER:
        cname = cat_def["name"]
        if cat_def["flow"] == "OUTFLOW":
            camt = sum(t["amount"] for t in transactions if t["category"] == cname and t["flow"] == "OUTFLOW")
            pct = (camt / tot_outflow * 100) if tot_outflow > 0 else 0.0
            cat_summary.append({
                "code": cat_def["code"],
                "name": cname,
                "is_new": cat_def["is_new"],
                "amount": camt,
                "percentage": round(pct, 2)
            })

    # Sort category summary descending by amount
    cat_summary.sort(key=lambda x: x["amount"], reverse=True)

    # Overall COA Summary
    all_coas = {}
    for t in transactions:
        if t["flow"] == "OUTFLOW":
            c_key = f"{t['coa_code']} - {t['coa_name']}"
            all_coas[c_key] = (t["coa_code"], t["coa_name"])

    coa_summary = []
    for c_key, (c_code, c_name) in all_coas.items():
        camt = sum(t["amount"] for t in transactions if t["coa_code"] == c_code and t["flow"] == "OUTFLOW")
        pct = (camt / tot_outflow * 100) if tot_outflow > 0 else 0.0
        coa_summary.append({
            "code": c_code,
            "name": c_key,
            "coa_code": c_code,
            "coa_name": c_name,
            "is_new": False,
            "amount": camt,
            "percentage": round(pct, 2)
        })
    coa_summary.sort(key=lambda x: x["amount"], reverse=True)

    # Matrix: [Category] x [W1..W8]
    matrix = []
    for cdef in CATEGORY_ORDER:
        cname = cdef["name"]
        row = {
            "code": cdef["code"],
            "category": cname,
            "is_new": cdef["is_new"],
            "flow": cdef["flow"],
            "weeks": {}
        }
        tot_row = 0.0
        for w_data in weeks_list:
            w_id = f"W{w_data['week_num']}"
            if cdef["flow"] == "INFLOW":
                val = w_data["inflow"] if cname == "[BARU] Penerimaan Kas (Termin Proyek)" else 0.0
            else:
                val = w_data["category_amounts"].get(cname, 0.0)
            row["weeks"][w_id] = val
            tot_row += val
        row["total"] = tot_row
        matrix.append(row)

    # COA Matrix: [COA Account] x [W1..W8]
    coa_matrix = []
    # Add Inflow row
    inf_coa_row = {
        "code": "41100",
        "category": "41100 - Pendapatan Jasa Pengeboran (Drilling)",
        "is_new": False,
        "flow": "INFLOW",
        "weeks": {}
    }
    tot_inf = 0.0
    for w_data in weeks_list:
        w_id = f"W{w_data['week_num']}"
        val = w_data["inflow"]
        inf_coa_row["weeks"][w_id] = val
        tot_inf += val
    inf_coa_row["total"] = tot_inf
    coa_matrix.append(inf_coa_row)

    # Add Outflow COA rows
    for c_info in coa_summary:
        c_key = c_info["name"]
        row = {
            "code": c_info["code"],
            "category": c_key,
            "is_new": False,
            "flow": "OUTFLOW",
            "weeks": {}
        }
        tot_row = 0.0
        for w_data in weeks_list:
            w_id = f"W{w_data['week_num']}"
            val = w_data["coa_amounts"].get(c_key, 0.0)
            row["weeks"][w_id] = val
            tot_row += val
        row["total"] = tot_row
        coa_matrix.append(row)

    min_date = min([t["date"] for t in transactions]) if transactions else "2026-07-13"
    max_date = max([t["date"] for t in transactions]) if transactions else "2026-09-14"

    base_result = {
        "project": {
            "id": proj_id,
            "code": proj_code,
            "name": proj_name,
            "client_name": client_name,
            "contract_value": contract_val
        },
        "period": {
            "start": min_date,
            "end": max_date,
            "total_weeks": len(weeks_list)
        },
        "kpi": {
            "total_inflow": tot_inflow,
            "total_outflow": tot_outflow,
            "net_cashflow": tot_inflow - tot_outflow,
            "cumulative_balance": running_cum,
            "weekly_burn_rate": tot_outflow / len(weeks_list) if weeks_list else 0.0
        },
        "categories_summary": cat_summary,
        "coa_summary": coa_summary,
        "weeks": weeks_list,
        "matrix": matrix,
        "coa_matrix": coa_matrix,
        "transactions": transactions
    }

    if version and version.lower() == "copy1":
        from api.routes.copy1_generator import generate_copy1_data
        return generate_copy1_data(base_result)

    return base_result


@router.get("/financial-statements/project-weekly-cashflow-copy1")
def get_project_weekly_cashflow_copy1(
    project_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Weekly project cash flow Copy 1:
    Reconciles the 8 operational bank transfer lump-sums with 139 verified on-site LPJ petty cash expenditures.
    """
    return get_project_weekly_cashflow(
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        version="copy1",
        db=db
    )