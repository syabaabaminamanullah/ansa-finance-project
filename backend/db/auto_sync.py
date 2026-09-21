import os
import json
from datetime import datetime
from sqlalchemy import text

# Table groups ordered by FK dependency
GROUPS = {
    "master": [
        "companies", "branches", "cost_centers", "chart_of_accounts",
        "tax_codes", "currencies", "banks", "customers", "vendors",
        "employees", "shifts", "warehouses", "user_profiles"
    ],
    "projects": [
        "projects", "areas", "work_packages", "activities",
        "project_rabs", "project_resources"
    ],
    "finance": [
        "journals", "journal_lines", "expenses", "ar_invoices",
        "ap_invoices", "purchase_orders", "purchase_order_items",
        "billing_schedules", "billing_terms"
    ]
}

def sync_table_group(engine, Base, group_name: str, seed_data: dict) -> dict:
    """Syncs a specific group of tables in its own commit block."""
    table_names = GROUPS.get(group_name, [])
    if not table_names:
        return {"error": f"Unknown group: {group_name}"}

    inserted = {}
    errors = {}

    # Get SQLAlchemy Table objects for this group in order
    tables_by_name = {t.name: t for t in Base.metadata.sorted_tables}

    for t_name in table_names:
        pg_table = tables_by_name.get(t_name)
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
                with engine.begin() as conn:
                    try:
                        conn.execute(pg_table.delete())
                    except Exception:
                        pass
                    conn.execute(pg_table.insert(), data_to_insert)
                inserted[t_name] = len(data_to_insert)
            except Exception as err:
                errors[t_name] = str(err)

    return {"group": group_name, "inserted": inserted, "errors": errors if errors else None}


def ensure_database_synced(engine, Base, group: str = "all", force: bool = False):
    """
    Synchronizes initial data. Supports group="master", "projects", "finance", or "all".
    """
    try:
        url_str = str(engine.url)
        if url_str.startswith("sqlite"):
            return {"status": "sqlite_local", "message": "Using local SQLite database"}

        # Quick check if already fully populated
        if not force and group == "all":
            with engine.connect() as conn:
                try:
                    jl = conn.execute(text('SELECT count(*) FROM "journal_lines"')).scalar()
                    if jl and jl > 0:
                        return {"status": "already_populated", "journal_lines_count": jl}
                except Exception:
                    pass

        # Locate initial_seed.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        seed_path = os.path.join(current_dir, "initial_seed.json")
        if not os.path.exists(seed_path):
            return {"status": "error", "message": "initial_seed.json not found"}

        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

        if group in GROUPS:
            res = sync_table_group(engine, Base, group, seed_data)
            return {"status": "success", "result": res}

        # Otherwise sync all groups in order: master -> projects -> finance
        results = {}
        for g in ["master", "projects", "finance"]:
            results[g] = sync_table_group(engine, Base, g, seed_data)

        return {
            "status": "success",
            "message": "All groups synced successfully",
            "results": results
        }

    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
