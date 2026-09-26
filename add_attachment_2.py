import sqlite3

def upgrade_db():
    conn = sqlite3.connect('backend/ansa_erp.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE journals ADD COLUMN attachment_path_2 VARCHAR")
        print("Added attachment_path_2 to journals")
    except Exception as e:
        print(f"journals error: {e}")
        
    try:
        cursor.execute("ALTER TABLE expenses ADD COLUMN attachment_path_2 VARCHAR")
        print("Added attachment_path_2 to expenses")
    except Exception as e:
        print(f"expenses error: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db()
