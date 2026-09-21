import os
import sys
import sqlite3
from datetime import datetime

def ensure_database_synced(engine, Base):
    """
    Checks if the connected PostgreSQL database is empty.
    If empty, automatically creates tables and copies data from backend/ansa_erp.db.
    """
    try:
        from sqlalchemy import text, MetaData
        
        # Determine database URL type
        url_str = str(engine.url)
        if url_str.startswith("sqlite"):
            return {"status": "sqlite_local", "message": "Using local SQLite"}
            
        # Check if journals already exist and have data
        with engine.connect() as conn:
            try:
                count = conn.execute(text('SELECT count(*) FROM "journals"')).scalar()
                if count and count > 0:
                    return {"status": "already_populated", "journals_count": count}
            except Exception:
                # Tables do not exist yet
                pass

        print("[AUTO-SYNC] Cloud database is empty. Starting automatic schema creation and data migration...")
        
        # 1. Create tables
        import db.models
        Base.metadata.create_all(bind=engine)
        print("[AUTO-SYNC] Schema created successfully.")

        # 2. Locate local ansa_erp.db
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sqlite_candidates = [
            os.path.join(base_dir, "ansa_erp.db"),
            os.path.join(os.path.dirname(base_dir), "backend", "ansa_erp.db"),
            os.path.join(os.path.dirname(base_dir), "ansa_erp.db"),
        ]
        
        sqlite_path = None
        for p in sqlite_candidates:
            if os.path.exists(p):
                sqlite_path = p
                break
                
        if not sqlite_path:
            print("[AUTO-SYNC] ansa_erp.db not found, schema initialized without initial seed.")
            return {"status": "tables_created_no_seed"}

        # 3. Read tables from SQLite
        conn_sqlite = sqlite3.connect(sqlite_path)
        conn_sqlite.row_factory = sqlite3.Row
        cur_sqlite = conn_sqlite.cursor()
        cur_sqlite.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        sqlite_tables = [r[0] for r in cur_sqlite.fetchall()]

        metadata = MetaData()
        metadata.reflect(bind=engine)

        with engine.begin() as pg_conn:
            try:
                pg_conn.execute(text("SET session_replication_role = 'replica';"))
            except Exception:
                pass

            for t_name in sqlite_tables:
                cur_sqlite.execute(f"SELECT * FROM [{t_name}]")
                rows = cur_sqlite.fetchall()
                if not rows:
                    continue

                pg_table = metadata.tables.get(t_name)
                if pg_table is None:
                    continue

                columns = [col[0] for col in cur_sqlite.description]
                pg_columns = set(c.name for c in pg_table.columns)
                valid_cols = [c for c in columns if c in pg_columns]

                data_to_insert = []
                for r in rows:
                    row_dict = {}
                    for c in valid_cols:
                        val = r[c]
                        col_type = str(pg_table.columns[c].type).upper()
                        if "BOOL" in col_type and val is not None:
                            val = bool(val)
                        elif "DATETIME" in col_type or "TIMESTAMP" in col_type:
                            if isinstance(val, str) and val.strip():
                                try:
                                    val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                                except Exception:
                                    pass
                        row_dict[c] = val
                    data_to_insert.append(row_dict)

                if data_to_insert:
                    pg_conn.execute(pg_table.delete())
                    chunk_size = 200
                    for i in range(0, len(data_to_insert), chunk_size):
                        pg_conn.execute(pg_table.insert(), data_to_insert[i:i+chunk_size])

            try:
                pg_conn.execute(text("SET session_replication_role = 'origin';"))
            except Exception:
                pass

        conn_sqlite.close()
        print("[AUTO-SYNC] Successfully migrated all records to cloud database!")
        return {"status": "success", "message": "Migrated successfully"}

    except Exception as e:
        print(f"[AUTO-SYNC ERROR] {e}")
        return {"status": "error", "error": str(e)}
