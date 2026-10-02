import re

with open("backend/api/routes/financial_statements.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace strict matching with 'in' matching for account_type in all reports
# For get_income_statement:
# if row.account_type == 'Revenue': -> if 'revenue' in row.account_type.lower():
content = re.sub(r"if row\.account_type == 'Revenue':", "if 'revenue' in str(row.account_type).lower():", content)
content = re.sub(r"elif row\.account_type == 'Expense':", "elif 'expense' in str(row.account_type).lower():", content)

# For get_balance_sheet:
content = re.sub(r"if row\.account_type == 'Asset':", "if 'asset' in str(row.account_type).lower():", content)
content = re.sub(r"elif row\.account_type == 'Liability':", "elif 'liabilit' in str(row.account_type).lower():", content)
content = re.sub(r"elif row\.account_type == 'Equity':", "elif 'equity' in str(row.account_type).lower():", content)
content = re.sub(r"elif row\.account_type == 'Revenue':", "elif 'revenue' in str(row.account_type).lower():", content)

# For get_trial_balance:
# if acc_type == 'Asset': -> if 'asset' in acc_type.lower():
content = re.sub(r"if acc_type == 'Asset':", "if 'asset' in str(acc_type).lower():", content)
content = re.sub(r"elif acc_type == 'Liability':", "elif 'liabilit' in str(acc_type).lower():", content)
content = re.sub(r"elif acc_type == 'Equity':", "elif 'equity' in str(acc_type).lower():", content)
content = re.sub(r"elif acc_type == 'Revenue':", "elif 'revenue' in str(acc_type).lower():", content)
content = re.sub(r"elif acc_type == 'Expense':", "elif 'expense' in str(acc_type).lower():", content)


with open("backend/api/routes/financial_statements.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated financial_statements.py")
