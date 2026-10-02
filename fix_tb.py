import re

with open("backend/api/routes/financial_statements.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "is_debit_normal = coa.account_type in ['Asset', 'Expense']",
    "is_debit_normal = str(coa.account_code).startswith('1') or str(coa.account_code)[0] in ['5', '6', '8', '9'] or (str(coa.account_code).startswith('7') and coa.normal_balance == 'Debit')"
)

with open("backend/api/routes/financial_statements.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed trial balance is_debit_normal")
