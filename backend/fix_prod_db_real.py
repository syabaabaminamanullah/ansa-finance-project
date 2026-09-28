"""
Migrate the REAL production database using the same connection logic as the app.
"""
import os, sys

# Point to real production
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

# Force DATABASE_URL to the production Supabase (same as the one in debug output)
os.environ['DATABASE_URL'] = 'postgresql://postgres:5Naopatx17!@db.fwacrmkszcirrddvygpq.supabase.co:5432/postgres'

# Now import the database module which will auto-convert to pooler + pg8000 + SSL
from db.database import engine, SQLALCHEMY_DATABASE_URL
from sqlalchemy import text

print(f"Connecting to: {SQLALCHEMY_DATABASE_URL[:80]}...")

with engine.connect() as conn:
    # Check current state
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'expenses' AND column_name LIKE 'attachment%' "
        "ORDER BY column_name"
    )).fetchall()
    print(f"expenses attachment columns BEFORE: {[r[0] for r in result]}")

    result2 = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'journals' AND column_name LIKE 'attachment%' "
        "ORDER BY column_name"
    )).fetchall()
    print(f"journals attachment columns BEFORE: {[r[0] for r in result2]}")

    expenses_cols = [r[0] for r in result]
    journals_cols = [r[0] for r in result2]

    if 'attachment_path' not in expenses_cols:
        conn.execute(text("ALTER TABLE expenses ADD COLUMN attachment_path VARCHAR"))
        conn.commit()
        print("ADDED: attachment_path to expenses")
    else:
        print("OK: attachment_path already exists on expenses")

    if 'attachment_path_2' not in expenses_cols:
        conn.execute(text("ALTER TABLE expenses ADD COLUMN attachment_path_2 VARCHAR"))
        conn.commit()
        print("ADDED: attachment_path_2 to expenses")
    else:
        print("OK: attachment_path_2 already exists on expenses")

    if 'attachment_path_2' not in journals_cols:
        conn.execute(text("ALTER TABLE journals ADD COLUMN attachment_path_2 VARCHAR"))
        conn.commit()
        print("ADDED: attachment_path_2 to journals")
    else:
        print("OK: attachment_path_2 already exists on journals")

    # Verify
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'expenses' AND column_name LIKE 'attachment%' "
        "ORDER BY column_name"
    )).fetchall()
    print(f"\nexpenses attachment columns AFTER: {[r[0] for r in result]}")

    result2 = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'journals' AND column_name LIKE 'attachment%' "
        "ORDER BY column_name"
    )).fetchall()
    print(f"journals attachment columns AFTER: {[r[0] for r in result2]}")

    # Test queries
    try:
        r = conn.execute(text("SELECT id, attachment_path, attachment_path_2 FROM expenses LIMIT 1")).fetchall()
        print(f"\nTest expenses query: OK - {r}")
    except Exception as e:
        print(f"\nTest expenses query: FAILED - {e}")

    try:
        r = conn.execute(text("SELECT id, attachment_path, attachment_path_2 FROM journals LIMIT 1")).fetchall()
        print(f"Test journals query: OK - {r}")
    except Exception as e:
        print(f"Test journals query: FAILED - {e}")

print("\nMigration complete!")
