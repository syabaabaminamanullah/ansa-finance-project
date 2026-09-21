import os
import json
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

EXPLICIT_ORDER = [
    "companies", "branches", "cost_centers", "currencies", "tax_codes",
    "user_profiles", "shifts", "chart_of_accounts", "banks", "customers",
    "vendors", "employees", "warehouses", "projects", "areas", "work_packages",
    "activities", "project_rabs", "project_resources", "purchase_orders",
    "purchase_order_items", "ap_invoices", "ar_invoices", "billing_schedules",
    "billing_terms", "journals", "journal_lines", "expenses"
]

def ensure_database_synced(engine, Base, table_name: str = None, force: bool = False):
    """
    Syncs SQLite seed data into Supabase PostgreSQL using explicit FK-safe order.
    Can sync a single table or all 28 tables.
    """
    try:
        url_str = str(engine.url)
        if url_str.startswith("sqlite"):
            return {"status": "sqlite_local", "message": "Using local SQLite database"}

        # Quick check if already fully populated
        if not force and not table_name:
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

        tables_map = {t.name: t for t in Base.metadata.sorted_tables}

        # Determine tables to process
        if table_name:
            target_tables = [table_name] if table_name in tables_map else []
        else:
            target_tables = [t for t in EXPLICIT_ORDER if t in tables_map]

        inserted_counts = {}
        errors = {}

        with engine.connect() as conn:
            for t_name in target_tables:
                pg_table = tables_map.get(t_name)
                if pg_table is None:
                    continue

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
                        # Sanitize empty string foreign keys to None (NULL)
                        if col_name.endswith('_id') and isinstance(val, str) and not val.strip():
                            val = None
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
