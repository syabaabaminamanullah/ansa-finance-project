import re

with open("backend/api/routes/financial_statements.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace ChartOfAccount.account_type == 'Equity' with ChartOfAccount.account_code.startswith('3')
content = content.replace(
    "ChartOfAccount.account_type == 'Equity'",
    "ChartOfAccount.account_code.startswith('3')"
)

# And check for other similar direct SQL queries
content = content.replace(
    "ChartOfAccount.account_type == 'Revenue'",
    "ChartOfAccount.account_code.startswith('4')"
)
content = content.replace(
    "ChartOfAccount.account_type == 'Expense'",
    "ChartOfAccount.account_code.startswith('5')"
) # Let's be careful with Revenue and Expense in SQL queries.

with open("backend/api/routes/financial_statements.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed SQL queries in reports")
