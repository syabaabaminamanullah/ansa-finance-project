with open('backend/api/routes/tax_workers.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('@router.get("/")', '@router.get("")')
content = content.replace('@router.post("/")', '@router.post("")')

with open('backend/api/routes/tax_workers.py', 'w', encoding='utf-8') as f:
    f.write(content)
