import re

with open("backend/api/routes/financial_statements.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix get_balance_sheet which incorrectly uses 'is_revenue' because of the broad regex
def fix_balance_sheet():
    global content
    
    # Let's extract the get_balance_sheet function
    start = content.find("def get_balance_sheet")
    end = content.find("def get_cash_flow", start)
    
    bs_block = content[start:end]
    
    # Replace the broken lines inside the balance sheet
    bs_block = bs_block.replace(
        "elif is_revenue:\n              total_revenue += (credit - debit)",
        "elif str(row.account_code).startswith('4') or (str(row.account_code).startswith('7') and row.normal_balance == 'Credit'):\n              total_revenue += (credit - debit)"
    )
    
    bs_block = bs_block.replace(
        "elif not is_revenue and str(row.account_code)[0] in ['5', '6', '7', '8', '9']:\n              total_expense += (debit - credit)",
        "elif str(row.account_code)[0] in ['5', '6', '8', '9'] or (str(row.account_code).startswith('7') and row.normal_balance == 'Debit'):\n              total_expense += (debit - credit)"
    )
    
    content = content[:start] + bs_block + content[end:]

fix_balance_sheet()

with open("backend/api/routes/financial_statements.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed get_balance_sheet")
