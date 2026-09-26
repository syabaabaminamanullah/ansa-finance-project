from db.database import engine
from sqlalchemy import text

def run():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE expenses ADD COLUMN attachment_path VARCHAR"))
            print("Successfully added attachment_path to expenses")
        except Exception as e:
            print("Error or column exists:", e)

if __name__ == "__main__":
    run()
