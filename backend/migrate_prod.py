import os
from sqlalchemy import create_engine, text

# Get production URL
DATABASE_URL = "postgresql://postgres:5Naopatx17!@db.rwglshhjtgwjudwdgkvf.supabase.co:5432/postgres"

def run_migration():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE expenses ADD COLUMN attachment_path_2 VARCHAR;"))
            print("Successfully added attachment_path_2 to expenses")
        except Exception as e:
            print(f"Error adding to expenses: {e}")
            
        try:
            conn.execute(text("ALTER TABLE journals ADD COLUMN attachment_path_2 VARCHAR;"))
            print("Successfully added attachment_path_2 to journals")
        except Exception as e:
            print(f"Error adding to journals: {e}")

        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    run_migration()
