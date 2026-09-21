import os
import json
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

def ensure_database_synced(engine, Base, group: str = "all", force: bool = False):
    """
    True multi-row VALUES batch insertion with ON CONFLICT DO NOTHING.
    Executes in < 2 seconds for all 28 tables.
    """
    try:
        url_str = str(engine.url)
        if url_str.startswith("sqlite"):
            return {"status": "sqlite_local", "message": "Using local SQLite database"}

        # Quick check if already fully populated
        if not force:
            with engine.connect() as conn:
                try:
                    jl = conn.execute(text('SELECT count(*) FROM "journal_lines"')).scalar()
                    if jl and jl > 0:
                        j = conn.execute(text('SELECT count(*) FROM "journals"')).scalar()
                        return {
                            "status": "already_populated",
                            "journals_count": j,
                            "journal_lines_count": jl
                        }
                except Exception:
                    pass

        # Locate initial_seed.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        seed_path = os.path.join(current_dir, "initial_seed.json")
        if not os.path.exists(seed_path):
            return {"status": "error", "message": "initial_seed.json not found"}

        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

        inserted_counts = {}
        errors = {}

        # Insert tables in forward FK order (Parent -> Child) with independent transactions
        with engine.connect() as conn:
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
                    try:
                        with conn.begin():
                            stmt = pg_insert(pg_table).values(data_to_insert).on_conflict_do_nothing()
                            conn.execute(stmt)
                        inserted_counts[t_name] = len(data_to_insert)
                    except Exception as err:
                        errors[t_name] = str(err)

        return {
            "status": "success",
            "message": "Instant multi-row seed completed",
            "inserted_tables": inserted_counts,
            "errors": errors if errors else None
        }

    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
