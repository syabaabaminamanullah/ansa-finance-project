import sys
import os

# Determine base paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

# Ensure backend directory is in sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Change working directory so relative paths in backend work
try:
    os.chdir(BACKEND_DIR)
except Exception:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ANSA ERP API",
    description="Enterprise Resource Planning API for Soil Drilling / Geotechnical Company",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register all routers
try:
    from api.routes import (
        organization, financials, finance, projects, stakeholders,
        hr, inventory, project_ops, reports, project_rabs, assets,
        financial_statements, procurement, data_management, billing_schedule,
        dashboard, equipment, profile
    )
    from db.database import engine, Base

    app.include_router(organization.router, prefix="/api/v1/master-data/organization", tags=["Organization"])
    app.include_router(financials.router, prefix="/api/v1/master-data/financials", tags=["Financial Master Data"])
    app.include_router(finance.router, prefix="/api/v1/finance", tags=["Finance & Accounting"])
    app.include_router(reports.router, prefix="/api/v1/finance", tags=["Financial Reports"])
    app.include_router(projects.router, prefix="/api/v1/master-data/project-structure", tags=["Project Structure"])
    app.include_router(stakeholders.router, prefix="/api/v1/master-data/stakeholders", tags=["Stakeholders"])
    app.include_router(hr.router, prefix="/api/v1/master-data/hr", tags=["Human Resources"])
    app.include_router(inventory.router, prefix="/api/v1/master-data/inventory", tags=["Asset & Inventory"])
    app.include_router(project_ops.router, prefix="/api/v1/project-ops", tags=["Project Operations"])
    app.include_router(project_rabs.router, prefix="/api/v1", tags=["Project RAB"])
    app.include_router(assets.router, prefix="/api/v1/assets", tags=["Fixed Assets"])
    app.include_router(financial_statements.router, prefix="/api/v1", tags=["Standard Financial Statements"])
    app.include_router(procurement.router, prefix="/api/v1/procurement", tags=["Procurement"])
    app.include_router(data_management.router, prefix="/api/v1/data-management", tags=["Data Management"])
    app.include_router(billing_schedule.router, prefix="/api/v1/finance", tags=["Billing Schedule"])
    app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
    app.include_router(equipment.router, prefix="/api/v1/equipment", tags=["Equipment"])
    app.include_router(profile.router, prefix="/api/v1/profile", tags=["User Profile"])

    _routers_loaded = True
    _router_error = None
except Exception as _e:
    import traceback
    _router_error = traceback.format_exc()
    _routers_loaded = False
    print("ROUTER IMPORT ERROR:", _router_error)


@app.get("/")
@app.get("/api")
def read_root():
    return {"message": "Welcome to ANSA ERP API", "status": "active"}


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "routers_loaded": _routers_loaded}


@app.get("/api/debug")
def debug():
    db_url = "unknown"
    try:
        from db.database import SQLALCHEMY_DATABASE_URL
        # Mask password
        u = SQLALCHEMY_DATABASE_URL
        if "@" in u:
            pre, post = u.split("@", 1)
            if ":" in pre:
                scheme_user = pre.rsplit(":", 1)[0]
                db_url = f"{scheme_user}:***@{post}"
            else:
                db_url = f"{pre}@{post}"
        else:
            db_url = u[:50] + "..."
    except Exception as e:
        db_url = f"error: {e}"
    return {
        "routers_loaded": _routers_loaded,
        "router_error": _router_error,
        "db_url": db_url,
        "env_SB_POSTGRES_URL": bool(os.environ.get("SB_POSTGRES_URL")),
        "env_POSTGRES_URL": bool(os.environ.get("POSTGRES_URL")),
        "env_DATABASE_URL": bool(os.environ.get("DATABASE_URL")),
        "cwd": os.getcwd(),
    }


@app.get("/api/v1/db-status")
def db_status():
    from db.database import engine
    from sqlalchemy import text
    tables = ["journals", "journal_lines", "chart_of_accounts", "projects", "expenses", "ar_invoices", "ap_invoices"]
    counts = {}
    with engine.connect() as conn:
        for t in tables:
            try:
                counts[t] = conn.execute(text(f'SELECT count(*) FROM "{t}"')).scalar()
            except Exception as e:
                counts[t] = f"error: {e}"
    return counts


@app.get("/api/v1/sync-db")
def sync_database(force: bool = False):
    try:
        from db.database import engine, Base
        from db.auto_sync import ensure_database_synced
        return ensure_database_synced(engine, Base, force=force)
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
