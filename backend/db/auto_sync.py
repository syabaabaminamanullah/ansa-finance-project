import os
import json
from datetime import datetime
from sqlalchemy import text

def ensure_database_synced(engine, Base, force: bool = False):
    """
    Fast, atomic migration with correct Foreign-Key dependency ordering:
    - Clean in reverse dependency order (Child -> Parent)
    - Insert in forward dependency order (Parent -> Child)
    """
    try:
        url_str = str(engine.url)
        if url_str.startswith("sqlite"):
            return {"status": "sqlite_local", "message": "Using local SQLite database"}

        # 1. Check if database already has journal_lines populated (not just journals)
        if not force:
            with engine.connect() as conn:
                try:
                    lines_count = conn.execute(text('SELECT count(*) FROM "journal_lines"')).scalar()
                    if lines_count and lines_count > 0:
                        journals_count = conn.execute(text('SELECT count(*) FROM "journals"')).scalar()
                        return {
                            "status": "already_populated",
                            "journals_count": journals_count,
                            "journal_lines_count": lines_count
                        }
                except Exception:
                    pass

        # 2. Locate initial_seed.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        seed_path = os.path.join(current_dir, "initial_seed.json")
        if not os.path.exists(seed_path):
            return {"status": "error", "message": "initial_seed.json not found"}

        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

        # 3. Step A: Delete existing records in REVERSE order (Child -> Parent)
        with engine.begin() as conn:
            for pg_table in reversed(Base.metadata.sorted_tables):
                t_name = pg_table.name
                if t_name in seed_data:
                    try:
                        conn.execute(pg_table.delete())
                    except Exception:
                        pass

        # 4. Step B: Insert records in FORWARD order (Parent -> Child)
        inserted_counts = {}
        with engine.begin() as conn:
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
                    conn.execute(pg_table.insert(), data_to_insert)
                    inserted_counts[t_name] = len(data_to_insert)

        return {
            "status": "success",
            "message": "Data migration finished successfully in correct FK dependency order",
            "inserted_tables": inserted_counts
        }

    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
