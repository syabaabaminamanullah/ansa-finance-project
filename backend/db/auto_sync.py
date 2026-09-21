import os
import json
from datetime import datetime
from sqlalchemy import text

def ensure_database_synced(engine, Base):
    """
    Checks if the connected PostgreSQL database is empty.
    If empty, automatically creates tables and loads data from initial_seed.json.
    """
    try:
        url_str = str(engine.url)
        if url_str.startswith("sqlite"):
            return {"status": "sqlite_local", "message": "Using local SQLite database"}

        # 1. Ensure schema exists
        import db.models
        Base.metadata.create_all(bind=engine)

        # 2. Check if database already has journals populated
        with engine.connect() as conn:
            try:
                count = conn.execute(text('SELECT count(*) FROM "journals"')).scalar()
                if count and count > 0:
                    return {"status": "already_populated", "journals_count": count}
            except Exception:
                pass

        # 3. Locate initial_seed.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        seed_path = os.path.join(current_dir, "initial_seed.json")
        if not os.path.exists(seed_path):
            return {"status": "error", "message": "initial_seed.json not found"}

        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

        # 4. Insert data in sorted order using Base.metadata
        inserted_counts = {}
        with engine.begin() as pg_conn:
            # Disable triggers/constraints if supported
            try:
                pg_conn.execute(text("SET session_replication_role = 'replica';"))
            except Exception:
                pass

            for pg_table in Base.metadata.sorted_tables:
                t_name = pg_table.name
                rows = seed_data.get(t_name, [])
                if not rows:
                    continue

                pg_columns = set(c.name for c in pg_table.columns)
                data_to_insert = []
                for r in rows:
                    row_dict = {}
                    for col_name, val in r.items():
                        if col_name not in pg_columns:
                            continue
                        col_type = str(pg_table.columns[col_name].type).upper()
                        if "BOOL" in col_type and val is not None:
                            val = bool(val)
                        elif ("DATETIME" in col_type or "TIMESTAMP" in col_type) and isinstance(val, str) and val.strip():
                            try:
                                val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                            except Exception:
                                pass
                        row_dict[col_name] = val
                    data_to_insert.append(row_dict)

                if data_to_insert:
                    # Clear table if any leftover and batch insert
                    try:
                        pg_conn.execute(pg_table.delete())
                    except Exception:
                        pass
                    chunk_size = 100
                    for i in range(0, len(data_to_insert), chunk_size):
                        pg_conn.execute(pg_table.insert(), data_to_insert[i:i+chunk_size])
                    inserted_counts[t_name] = len(data_to_insert)

            try:
                pg_conn.execute(text("SET session_replication_role = 'origin';"))
            except Exception:
                pass

        return {
            "status": "success",
            "message": "Successfully migrated initial data to Supabase",
            "inserted_tables": inserted_counts
        }

    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
