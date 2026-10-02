import re

with open(r'backend\api\routes\financial_statements.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_func = re.compile(r'    # Define helper to determine week.*?return 10, [^\n]*20 Sep 2026"', re.DOTALL)

replacement_func = '''    # Define helper to determine week
    from datetime import date as dt_date, timedelta
    
    # Project baseline start date
    PROJECT_START = dt_date(2026, 7, 13)
    
    def get_indonesian_month(m):
        return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][m-1]
        
    def get_week_info(date_str):
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        delta = (d - PROJECT_START).days
        if delta < 0:
            delta = 0
        w_num = (delta // 7) + 1
        
        # Calculate week start and end
        w_start = PROJECT_START + timedelta(days=(w_num-1)*7)
        w_end = w_start + timedelta(days=6)
        
        sm = get_indonesian_month(w_start.month)
        em = get_indonesian_month(w_end.month)
        
        short_label = f"W{w_num} ({w_start.day:02d}-{w_end.day:02d} {em})" if sm == em else f"W{w_num} ({w_start.day:02d} {sm}-{w_end.day:02d} {em})"
        full_label = f"{w_start.day:02d} {sm} - {w_end.day:02d} {em} {w_start.year}"
        
        return w_num, short_label, full_label'''

if pattern_func.search(content):
    content = pattern_func.sub(replacement_func, content)
    print('Replaced get_week_info')
else:
    print('Failed to match get_week_info')

pattern_loop = re.compile(r'    transactions = \[\]\s*weeks_dict = \{\}\s*for w in range\(1, 11\):.*?weeks_dict\[w\] = \{', re.DOTALL)

replacement_loop = '''    transactions = []
    
    # Determine max week from journals, default to 10 if less
    max_week = 10
    for j in journals:
        w_num, _, _ = get_week_info(j.date)
        if w_num > max_week:
            max_week = w_num

    weeks_dict = {}
    for w in range(1, max_week + 1):
        # sample date to generate label
        sample_date = (PROJECT_START + timedelta(days=(w-1)*7)).strftime("%Y-%m-%d")
        _, label, drange = get_week_info(sample_date)
        weeks_dict[w] = {'''

if pattern_loop.search(content):
    content = pattern_loop.sub(replacement_loop, content)
    print('Replaced weeks loop')
else:
    print('Failed to match weeks loop')

with open(r'backend\api\routes\financial_statements.py', 'w', encoding='utf-8') as f:
    f.write(content)
