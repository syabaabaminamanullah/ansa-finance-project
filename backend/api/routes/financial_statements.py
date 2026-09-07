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
            'account_name': 'Current Year Earnings (Auto)',
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
    
    return {
        'period': f"{start_date} to {end_date}",
        'operating_activities': {
            'inflow': operating_in,
            'outflow': operating_out,
            'net': net_operating,
            'details': sorted(operating_details, key=lambda x: x['date'])
        },
        'investing_activities': {
            'inflow': investing_in,
            'outflow': investing_out,
            'net': net_investing,
            'details': sorted(investing_details, key=lambda x: x['date'])
        },
        'financing_activities': {
            'inflow': financing_in,
            'outflow': financing_out,
            'net': net_financing,
            'details': sorted(financing_details, key=lambda x: x['date'])
        },
        'net_increase_in_cash': net_increase
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