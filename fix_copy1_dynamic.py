import re
with open(r'backend\api\routes\copy1_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_init = re.compile(r'    from api\.routes\.financial_statements import get_week_info, PROJECT_START.*?weeks_dict\[w\] = \{', re.DOTALL)

replacement_init = '''    from datetime import date as dt_date, timedelta, datetime
    PROJECT_START = dt_date(2026, 7, 13)
    def get_indonesian_month(m):
        return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][m-1]

    def get_dynamic_week_info(date_str):
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        delta = (d - PROJECT_START).days
        if delta < 0: delta = 0
        w_num = (delta // 7) + 1
        w_start = PROJECT_START + timedelta(days=(w_num-1)*7)
        w_end = w_start + timedelta(days=6)
        sm = get_indonesian_month(w_start.month)
        em = get_indonesian_month(w_end.month)
        short_label = f"W{w_num} ({w_start.day:02d}-{w_end.day:02d} {em})" if sm == em else f"W{w_num} ({w_start.day:02d} {sm}-{w_end.day:02d} {em})"
        full_label = f"{w_start.day:02d} {sm} - {w_end.day:02d} {em} {w_start.year}"
        return w_num, short_label, full_label

    weeks_dict = {}
    for w in range(1, max_week + 1):
        sample_date = (PROJECT_START + timedelta(days=(w-1)*7)).strftime("%Y-%m-%d")
        _, label, drange = get_dynamic_week_info(sample_date)
        weeks_dict[w] = {'''

if pattern_init.search(content):
    content = pattern_init.sub(replacement_init, content)
    print('Replaced dynamic week block')
else:
    print('Failed dynamic week block')

with open(r'backend\api\routes\copy1_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)
