import re

with open("backend/api/routes/financial_statements.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the 'in' matching with 'startswith' digit matching

# 1. Income Statement
content = re.sub(
    r"net_balance = \(row\.total_credit or 0\.0\) - \(row\.total_debit or 0\.0\) if row\.account_type == 'Revenue' else \(row\.total_debit or 0\.0\) - \(row\.total_credit or 0\.0\)",
    "is_revenue = str(row.account_code).startswith('4') or (str(row.account_code).startswith('7') and 'pendapatan' in str(row.account_name).lower())\n        net_balance = (row.total_credit or 0.0) - (row.total_debit or 0.0) if is_revenue else (row.total_debit or 0.0) - (row.total_credit or 0.0)",
    content
)

content = re.sub(
    r"if 'revenue' in str\(row\.account_type\)\.lower\(\):",
    "if is_revenue:",
    content
)

content = re.sub(
    r"elif 'expense' in str\(row\.account_type\)\.lower\(\):",
    "elif not is_revenue and str(row.account_code)[0] in ['5', '6', '7', '8', '9']:",
    content
)


# 2. Balance Sheet
content = re.sub(
    r"if 'asset' in str\(row\.account_type\)\.lower\(\):",
    "if str(row.account_code).startswith('1'):",
    content
)

content = re.sub(
    r"elif 'liabilit' in str\(row\.account_type\)\.lower\(\):",
    "elif str(row.account_code).startswith('2'):",
    content
)

content = re.sub(
    r"elif 'equity' in str\(row\.account_type\)\.lower\(\):",
    "elif str(row.account_code).startswith('3'):",
    content
)

content = re.sub(
    r"elif 'revenue' in str\(row\.account_type\)\.lower\(\):",
    "elif str(row.account_code).startswith('4') or (str(row.account_code).startswith('7') and row.normal_balance == 'Credit'):",
    content
)

content = re.sub(
    r"elif 'expense' in str\(row\.account_type\)\.lower\(\):",
    "elif str(row.account_code)[0] in ['5', '6', '8', '9'] or (str(row.account_code).startswith('7') and row.normal_balance == 'Debit'):",
    content
)


# 3. Trial Balance
content = re.sub(
    r"if 'asset' in str\(acc_type\)\.lower\(\):",
    "if str(acc_code).startswith('1'):",
    content
)
content = re.sub(
    r"elif 'liabilit' in str\(acc_type\)\.lower\(\):",
    "elif str(acc_code).startswith('2'):",
    content
)
content = re.sub(
    r"elif 'equity' in str\(acc_type\)\.lower\(\):",
    "elif str(acc_code).startswith('3'):",
    content
)
content = re.sub(
    r"elif 'revenue' in str\(acc_type\)\.lower\(\):",
    "elif str(acc_code).startswith('4') or (str(acc_code).startswith('7') and 'pendapatan' in str(acc_name).lower()):",
    content
)
content = re.sub(
    r"elif 'expense' in str\(acc_type\)\.lower\(\):",
    "elif str(acc_code)[0] in ['5', '6', '8', '9'] or (str(acc_code).startswith('7') and 'pendapatan' not in str(acc_name).lower()):",
    content
)


with open("backend/api/routes/financial_statements.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Refactored to use digit prefixes!")
