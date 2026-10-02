import sqlalchemy
from sqlalchemy import text

# Production DB - from Vercel debug endpoint: postgres.fwacrmkszcirrddvygpq @ aws-0-ap-southeast-1.pooler.supabase.com
# The SB_POSTGRES_URL uses this project ref. We need to connect via the direct DB host.
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# Try connecting via the pooler with the tenant identifier in the username
import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# The password is set in Vercel env vars. Let me try the direct connection URL format.
# From the debug output: postgres.fwacrmkszcirrddvygpq
# This is the SESSION mode pooler. We need the direct DB connection.
# Direct: db.fwacrmkszcirrddvygpq.supabase.co

import pg8000

# Try direct connection to the correct Supabase project
urls_to_try = [
    "postgresql+pg8000://postgres.fwacrmkszcirrddvygpq:5Naopatx17!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres:5Naopatx17!@db.fwacrmkszcirrddvygpq.supabase.co:5432/postgres",
]

for url in urls_to_try:
    print(f"\nTrying: {url[:60]}...")
    try:
        engine = sqlalchemy.create_engine(url, connect_args={"ssl_context": ctx} if "pg8000" in url else {})
        with engine.begin() as conn:
            # Check if column exists first
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'ar_invoices' AND column_name = 'ar_account_id'
            """)).fetchone()
            if result:
                print("Column ar_account_id ALREADY EXISTS!")
            else:
                conn.execute(text("ALTER TABLE ar_invoices ADD COLUMN ar_account_id VARCHAR;"))
                print("SUCCESS: Added ar_account_id column!")
            
            # Verify
            cols = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'ar_invoices' ORDER BY ordinal_position
            """)).fetchall()
            print("Columns:", [c[0] for c in cols])
        break
    except Exception as e:
        print(f"Failed: {e}")
        continue
