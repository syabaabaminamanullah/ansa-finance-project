with open('api/index.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('dashboard, equipment, profile', 'dashboard, equipment, profile, tax_workers')

target = 'app.include_router(profile.router, prefix="/api/v1/profile", tags=["User Profile"])'
replacement = 'app.include_router(profile.router, prefix="/api/v1/profile", tags=["User Profile"])\n    app.include_router(tax_workers.router, prefix="/api/v1/tax-workers", tags=["Tax Workers"])'
content = content.replace(target, replacement)

target2 = 'if not url_str.startswith("sqlite"):'
replacement2 = '''try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            print("Create all error:", e)

        if not url_str.startswith("sqlite"):'''
content = content.replace(target2, replacement2)

with open('api/index.py', 'w', encoding='utf-8') as f:
    f.write(content)
