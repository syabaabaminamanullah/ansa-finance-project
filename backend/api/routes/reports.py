from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from db.database import get_db
from db.models import Journal, JournalLine, ChartOfAccount

router = APIRouter()

@router.get("/general-ledger")
def get_general_ledger(
    start_date: str,
    end_date: str,
    account_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(JournalLine).join(Journal).filter(
        Journal.status == 'Posted',
        Journal.date >= start_date,
        Journal.date <= end_date
    )
    
    if account_id:
        query = query.filter(JournalLine.account_id == account_id)
        
    lines = query.order_by(Journal.date.asc(), Journal.journal_number.asc()).all()
    
    result = []
    for line in lines:
        result.append({
            "journal_id": line.journal_id,
            "journal_number": line.journal.journal_number,
            "date": line.journal.date,
            "account_id": line.account_id,
            "account_code": line.account.account_code,
            "account_name": line.account.account_name,
            "description": line.description or line.journal.description,
            "debit": line.debit,
            "credit": line.credit
        })
        
    return result

@router.get("/reports/income-statement")
def get_income_statement(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    # Get all Revenue and Expense accounts
    accounts = db.query(ChartOfAccount).filter(
        ChartOfAccount.account_type.in_(['Revenue', 'Expense'])
    ).all()
    
    # Calculate balance for each account
    results = {
        "revenue": [],
        "expense": [],
        "total_revenue": 0.0,
        "total_expense": 0.0,
        "net_income": 0.0
    }
    
    for account in accounts:
        # Sum debits and credits for this account in the date range
        totals = db.query(
            func.sum(JournalLine.debit).label('total_debit'),
            func.sum(JournalLine.credit).label('total_credit')
        ).join(Journal).filter(
            Journal.status == 'Posted',
            Journal.date >= start_date,
            Journal.date <= end_date,
            JournalLine.account_id == account.id
        ).first()
        
        debit = totals.total_debit or 0.0
        credit = totals.total_credit or 0.0
        
        if debit == 0 and credit == 0:
            continue
            
        if account.normal_balance == 'Credit':
            balance = credit - debit
        else:
            balance = debit - credit
            
        account_data = {
            "account_code": account.account_code,
            "account_name": account.account_name,
            "balance": balance
        }
        
        if account.account_type == 'Revenue':
            results["revenue"].append(account_data)
            results["total_revenue"] += balance
        elif account.account_type == 'Expense':
            results["expense"].append(account_data)
            results["total_expense"] += balance
            
    results["net_income"] = results["total_revenue"] - results["total_expense"]
    return results

@router.get("/reports/balance-sheet")
def get_balance_sheet(
    as_of_date: str,
    db: Session = Depends(get_db)
):
    # Get all Asset, Liability, and Equity accounts
    accounts = db.query(ChartOfAccount).filter(
        ChartOfAccount.account_type.in_(['Asset', 'Liability', 'Equity'])
    ).all()
    
    results = {
        "assets": [],
        "liabilities": [],
        "equity": [],
        "total_assets": 0.0,
        "total_liabilities": 0.0,
        "total_equity": 0.0
    }
    
    for account in accounts:
        # Sum debits and credits for this account up to the as_of_date
        totals = db.query(
            func.sum(JournalLine.debit).label('total_debit'),
            func.sum(JournalLine.credit).label('total_credit')
        ).join(Journal).filter(
            Journal.status == 'Posted',
            Journal.date <= as_of_date,
            JournalLine.account_id == account.id
        ).first()
        
        debit = totals.total_debit or 0.0
        credit = totals.total_credit or 0.0
        
        if debit == 0 and credit == 0:
            continue
            
        if account.normal_balance == 'Debit':
            balance = debit - credit
        else:
            balance = credit - debit
            
        account_data = {
            "account_code": account.account_code,
            "account_name": account.account_name,
            "balance": balance
        }
        
        if account.account_type == 'Asset':
            results["assets"].append(account_data)
            results["total_assets"] += balance
        elif account.account_type == 'Liability':
            results["liabilities"].append(account_data)
            results["total_liabilities"] += balance
        elif account.account_type == 'Equity':
            results["equity"].append(account_data)
            results["total_equity"] += balance
            
    # Calculate retained earnings (Net Income up to this date)
    net_income_query = db.query(
        ChartOfAccount.account_type,
        ChartOfAccount.normal_balance,
        func.sum(JournalLine.debit).label('total_debit'),
        func.sum(JournalLine.credit).label('total_credit')
    ).join(JournalLine, JournalLine.account_id == ChartOfAccount.id)\
     .join(Journal, JournalLine.journal_id == Journal.id)\
     .filter(
        Journal.status == 'Posted',
        Journal.date <= as_of_date,
        ChartOfAccount.account_type.in_(['Revenue', 'Expense'])
    ).group_by(ChartOfAccount.account_type, ChartOfAccount.normal_balance).all()
    
    retained_earnings = 0.0
    for row in net_income_query:
        debit = row.total_debit or 0.0
        credit = row.total_credit or 0.0
        
        if row.account_type == 'Revenue': # Normal balance Credit
            retained_earnings += (credit - debit)
        elif row.account_type == 'Expense': # Normal balance Debit
            retained_earnings -= (debit - credit)
            
    if retained_earnings != 0:
        results["equity"].append({
            "account_code": "-",
            "account_name": "Current Year Retained Earnings",
            "balance": retained_earnings
        })
        results["total_equity"] += retained_earnings
            
    return results

@router.get("/reports/asset-depreciation")
def get_asset_depreciation(
    as_of_date: str,
    db: Session = Depends(get_db)
):
    from db.models import FixedAsset
    from datetime import datetime
    
    assets = db.query(FixedAsset).all()
    results = []
    total_purchase_price = 0.0
    total_accumulated_depreciation = 0.0
    total_book_value = 0.0
    
    as_of = datetime.strptime(as_of_date, '%Y-%m-%d')
    
    for asset in assets:
        purchase_date_str = asset.purchase_date or as_of_date
        try:
            purchase_date = datetime.strptime(purchase_date_str.split('T')[0], '%Y-%m-%d')
        except:
            purchase_date = as_of
            
        months_passed = (as_of.year - purchase_date.year) * 12 + (as_of.month - purchase_date.month)
        if months_passed < 0:
            months_passed = 0
            
        useful_months = (asset.useful_life_years or 0) * 12
        
        if useful_months > 0:
            monthly_depreciation = ((asset.purchase_price or 0.0) - (asset.salvage_value or 0.0)) / useful_months
        else:
            monthly_depreciation = 0.0
            
        max_depreciation = (asset.purchase_price or 0.0) - (asset.salvage_value or 0.0)
        calculated_accumulated = monthly_depreciation * months_passed
        
        if calculated_accumulated > max_depreciation:
            calculated_accumulated = max_depreciation
            
        book_value = (asset.purchase_price or 0.0) - calculated_accumulated
        
        results.append({
            'id': asset.id,
            'asset_number': asset.asset_number,
            'name': asset.name,
            'asset_type': asset.asset_type,
            'purchase_date': purchase_date_str,
            'purchase_price': asset.purchase_price,
            'useful_life_years': asset.useful_life_years,
            'monthly_depreciation': monthly_depreciation,
            'accumulated_depreciation': calculated_accumulated,
            'book_value': book_value
        })
        
        total_purchase_price += (asset.purchase_price or 0.0)
        total_accumulated_depreciation += calculated_accumulated
        total_book_value += book_value
        
    return {
        'data': results,
        'summary': {
            'total_purchase_price': total_purchase_price,
            'total_accumulated_depreciation': total_accumulated_depreciation,
            'total_book_value': total_book_value
        }
    }

@router.get("/reports/ar-aging")
def get_ar_aging(
    as_of_date: str,
    db: Session = Depends(get_db)
):
    from db.models import ArInvoice, Customer
    from datetime import datetime
    
    invoices = db.query(ArInvoice).join(Customer).filter(
        ArInvoice.status != 'Paid'
    ).all()
    
    results = []
    summary = {
        'current': 0.0,
        'days_1_30': 0.0,
        'days_31_60': 0.0,
        'days_61_90': 0.0,
        'days_over_90': 0.0,
        'total': 0.0
    }
    
    as_of = datetime.strptime(as_of_date, '%Y-%m-%d')
    
    for inv in invoices:
        due = datetime.strptime(inv.due_date.split('T')[0], '%Y-%m-%d')
        days_late = (as_of - due).days
        
        balance = inv.amount - (inv.amount_paid or 0.0)
        if balance <= 0:
            continue
            
        bucket = 'current'
        if days_late > 90:
            bucket = 'days_over_90'
            summary['days_over_90'] += balance
        elif days_late > 60:
            bucket = 'days_61_90'
            summary['days_61_90'] += balance
        elif days_late > 30:
            bucket = 'days_31_60'
            summary['days_31_60'] += balance
        elif days_late > 0:
            bucket = 'days_1_30'
            summary['days_1_30'] += balance
        else:
            summary['current'] += balance
            
        summary['total'] += balance
        
        results.append({
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'customer_name': inv.customer.name if inv.customer else 'Unknown',
            'due_date': inv.due_date.split('T')[0],
            'amount': inv.amount,
            'balance': balance,
            'days_late': days_late if days_late > 0 else 0,
            'bucket': bucket
        })
        
    return {
        'data': results,
        'summary': summary
    }

@router.get("/reports/ap-aging")
def get_ap_aging(
    as_of_date: str = Query(default_factory=lambda: datetime.now().strftime('%Y-%m-%d')),
    db: Session = Depends(get_db)
):
    from db.models import ApInvoice, Vendor
    
    invoices = db.query(ApInvoice).outerjoin(Vendor, Vendor.id == ApInvoice.vendor_id).filter(
        ApInvoice.status != 'Paid'
    ).all()
    
    results = []
    summary = {
        'current': 0.0,
        'days_1_30': 0.0,
        'days_31_60': 0.0,
        'days_61_90': 0.0,
        'days_over_90': 0.0,
        'total': 0.0
    }
    
    as_of = datetime.strptime(as_of_date, '%Y-%m-%d')
    
    for inv in invoices:
        if not inv.due_date:
            continue
        due = datetime.strptime(inv.due_date.split('T')[0], '%Y-%m-%d')
        days_late = (as_of - due).days
        
        balance = (inv.amount or 0.0) - (inv.amount_paid or 0.0)
        if balance <= 0:
            continue
            
        bucket = 'current'
        if days_late > 90:
            bucket = 'days_over_90'
            summary['days_over_90'] += balance
        elif days_late > 60:
            bucket = 'days_61_90'
            summary['days_61_90'] += balance
        elif days_late > 30:
            bucket = 'days_31_60'
            summary['days_31_60'] += balance
        elif days_late > 0:
            bucket = 'days_1_30'
            summary['days_1_30'] += balance
        else:
            summary['current'] += balance
            
        summary['total'] += balance
        
        results.append({
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'vendor_name': inv.vendor.name if inv.vendor else 'Unknown Vendor',
            'due_date': inv.due_date.split('T')[0],
            'amount': inv.amount or 0.0,
            'balance': balance,
            'days_late': days_late if days_late > 0 else 0,
            'bucket': bucket
        })
        
    return {
        'data': results,
        'summary': summary
    }

@router.get("/reports/project-profitability")
def get_project_profitability(db: Session = Depends(get_db)):
    from db.models import Project, ArInvoice, Expense, ApInvoice
    
    projects = db.query(Project).all()
    results = []
    
    for proj in projects:
        # Calculate Revenue from AR Invoices
        ar_invoices = db.query(ArInvoice).filter(ArInvoice.project_id == proj.id).all()
        revenue = sum(inv.amount for inv in ar_invoices)
        
        # Calculate Costs from Expenses and AP Invoices
        expenses = db.query(Expense).filter(Expense.project_id == proj.id).all()
        ap_invoices = db.query(ApInvoice).filter(ApInvoice.project_id == proj.id).all()
        
        costs = sum(exp.amount for exp in expenses) + sum(ap.amount for ap in ap_invoices)
        
        profit = revenue - costs
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        results.append({
            'project_id': proj.id,
            'project_code': proj.code,
            'project_name': proj.name,
            'status': proj.status,
            'revenue': revenue,
            'costs': costs,
            'profit': profit,
            'margin_percent': margin
        })
        
    return results

@router.get("/reports/rab-realization")
def get_rab_realization(db: Session = Depends(get_db)):
    from db.models import Project, ProjectRab, Expense, ApInvoice
    
    projects = db.query(Project).all()
    results = []
    
    for proj in projects:
        rabs = db.query(ProjectRab).filter(ProjectRab.project_id == proj.id).all()
        total_budget = sum(rab.total_budget for rab in rabs)
        
        expenses = db.query(Expense).filter(Expense.project_id == proj.id).all()
        ap_invoices = db.query(ApInvoice).filter(ApInvoice.project_id == proj.id).all()
        
        actual_cost = sum(exp.amount for exp in expenses) + sum(ap.amount for ap in ap_invoices)
        variance = total_budget - actual_cost
        
        results.append({
            'project_id': proj.id,
            'project_code': proj.code,
            'project_name': proj.name,
            'total_budget': total_budget,
            'actual_cost': actual_cost,
            'variance': variance,
            'status': 'Overbudget' if variance < 0 else 'Underbudget' if variance > 0 else 'On Budget'
        })
        
    return results
