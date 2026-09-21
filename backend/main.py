from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import organization, financials, finance, projects, stakeholders, hr, inventory, project_ops, reports, project_rabs, assets, financial_statements, procurement, data_management, billing_schedule
from db.database import engine, Base

# Create tables (safely ignore if connection delays or already migrated)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database initialization notice: {e}")


app = FastAPI(
    title="ANSA ERP API",
    description="Enterprise Resource Planning API for Soil Drilling / Geotechnical Company",
    version="1.0.0"
)

# Configure CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
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

from api.routes import dashboard, equipment, profile

app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(equipment.router, prefix="/api/v1/equipment", tags=["Equipment"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["User Profile"])

@app.get("/")
@app.get("/api")
def read_root():
    return {"message": "Welcome to ANSA ERP API", "status": "active"}

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

