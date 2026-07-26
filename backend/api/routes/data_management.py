import os
import shutil
import subprocess
import zipfile
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from db.database import get_db, engine
from db.models import ChartOfAccount, Material, Employee

router = APIRouter()

DB_FILE_PATH = "./ansa_erp.db"
UPLOAD_DIR = "./uploads"

# Create upload directory if not exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/backup")
def download_backup():
    if not os.path.exists(DB_FILE_PATH):
        raise HTTPException(status_code=404, detail="Database file not found")
    return FileResponse(
        DB_FILE_PATH, 
        filename="ansa_erp_backup.db", 
        media_type="application/octet-stream"
    )

@router.post("/restore")
async def restore_database(file: UploadFile = File(...)):
    if not file.filename.endswith(('.db', '.sql')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .db or .sql files allowed.")
    
    # Dispose connections to avoid lock
    engine.dispose()
    
    try:
        with open(DB_FILE_PATH, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"message": "Database restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore database: {str(e)}")

@router.get("/export-master")
def export_master_data(db: Session = Depends(get_db)):
    # Create an in-memory zip file
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        # 1. Export Chart of Accounts
        coa_buffer = io.StringIO()
        coa_writer = csv.writer(coa_buffer)
        coa_writer.writerow(["account_code", "account_name", "account_type", "normal_balance"])
        coas = db.query(ChartOfAccount).all()
        for coa in coas:
            coa_writer.writerow([coa.account_code, coa.account_name, coa.account_type, coa.normal_balance])
        zip_file.writestr("chart_of_accounts.csv", coa_buffer.getvalue())

        # 2. Export Materials / Inventory
        mat_buffer = io.StringIO()
        mat_writer = csv.writer(mat_buffer)
        mat_writer.writerow(["code", "name", "category", "uom", "min_stock", "description"])
        materials = db.query(Material).all()
        for mat in materials:
            mat_writer.writerow([mat.code, mat.name, mat.category, mat.uom, mat.min_stock, mat.description])
        zip_file.writestr("materials.csv", mat_buffer.getvalue())

        # 3. Export Employees
        emp_buffer = io.StringIO()
        emp_writer = csv.writer(emp_buffer)
        emp_writer.writerow(["code", "name", "email", "phone", "role", "join_date"])
        employees = db.query(Employee).all()
        for emp in employees:
            emp_writer.writerow([emp.code, emp.name, emp.email, emp.phone, emp.role, emp.join_date])
        zip_file.writestr("employees.csv", emp_buffer.getvalue())

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/x-zip-compressed", 
        headers={"Content-Disposition": "attachment; filename=master_data_export.zip"}
    )

@router.post("/import-master")
async def import_master_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are currently supported for importing.")
    
    contents = await file.read()
    decoded = contents.decode('utf-8').splitlines()
    reader = csv.reader(decoded)
    
    try:
        headers = next(reader)
    except StopIteration:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    headers = [h.strip().lower() for h in headers]
    
    # Auto-detect entity type
    if "account_code" in headers or "account_name" in headers:
        # Import Chart of Accounts
        code_idx = headers.index("account_code") if "account_code" in headers else -1
        name_idx = headers.index("account_name") if "account_name" in headers else -1
        type_idx = headers.index("account_type") if "account_type" in headers else -1
        bal_idx = headers.index("normal_balance") if "normal_balance" in headers else -1
        
        if code_idx == -1 or name_idx == -1:
            raise HTTPException(status_code=400, detail="CSV must contain account_code and account_name columns")
            
        count = 0
        for row in reader:
            if len(row) <= max(code_idx, name_idx): continue
            code = row[code_idx].strip()
            name = row[name_idx].strip()
            acc_type = row[type_idx].strip() if type_idx != -1 and len(row) > type_idx else "Expense"
            bal = row[bal_idx].strip() if bal_idx != -1 and len(row) > bal_idx else "Debit"
            
            if not code or not name: continue
            
            # Check if exists
            existing = db.query(ChartOfAccount).filter(ChartOfAccount.account_code == code).first()
            if existing:
                existing.account_name = name
                existing.account_type = acc_type
                existing.normal_balance = bal
            else:
                db.add(ChartOfAccount(account_code=code, account_name=name, account_type=acc_type, normal_balance=bal))
            count += 1
        db.commit()
        return {"message": f"Successfully imported {count} Chart of Accounts entries"}
        
    elif "min_stock" in headers or "uom" in headers or "category" in headers:
        # Import Materials
        code_idx = headers.index("code") if "code" in headers else -1
        name_idx = headers.index("name") if "name" in headers else -1
        cat_idx = headers.index("category") if "category" in headers else -1
        uom_idx = headers.index("uom") if "uom" in headers else -1
        min_idx = headers.index("min_stock") if "min_stock" in headers else -1
        desc_idx = headers.index("description") if "description" in headers else -1
        
        if code_idx == -1 or name_idx == -1:
            raise HTTPException(status_code=400, detail="CSV must contain 'code' and 'name' columns")
            
        count = 0
        for row in reader:
            if len(row) <= max(code_idx, name_idx): continue
            code = row[code_idx].strip()
            name = row[name_idx].strip()
            cat = row[cat_idx].strip() if cat_idx != -1 and len(row) > cat_idx else "Consumables"
            uom = row[uom_idx].strip() if uom_idx != -1 and len(row) > uom_idx else "pcs"
            min_stock_val = 0.0
            if min_idx != -1 and len(row) > min_idx and row[min_idx].strip():
                try:
                    min_stock_val = float(row[min_idx].strip())
                except ValueError:
                    pass
            desc = row[desc_idx].strip() if desc_idx != -1 and len(row) > desc_idx else ""
            
            if not code or not name: continue
            
            # Check if exists
            existing = db.query(Material).filter(Material.code == code).first()
            if existing:
                existing.name = name
                existing.category = cat
                existing.uom = uom
                existing.min_stock = min_stock_val
                existing.description = desc
            else:
                db.add(Material(code=code, name=name, category=cat, uom=uom, min_stock=min_stock_val, description=desc))
            count += 1
        db.commit()
        return {"message": f"Successfully imported {count} Material entries"}
        
    elif "role" in headers or "join_date" in headers or "phone" in headers:
        # Import Employees
        code_idx = headers.index("code") if "code" in headers else -1
        name_idx = headers.index("name") if "name" in headers else -1
        email_idx = headers.index("email") if "email" in headers else -1
        phone_idx = headers.index("phone") if "phone" in headers else -1
        role_idx = headers.index("role") if "role" in headers else -1
        join_idx = headers.index("join_date") if "join_date" in headers else -1
        
        if code_idx == -1 or name_idx == -1:
            raise HTTPException(status_code=400, detail="CSV must contain 'code' and 'name' columns")
            
        count = 0
        for row in reader:
            if len(row) <= max(code_idx, name_idx): continue
            code = row[code_idx].strip()
            name = row[name_idx].strip()
            email = row[email_idx].strip() if email_idx != -1 and len(row) > email_idx else ""
            phone = row[phone_idx].strip() if phone_idx != -1 and len(row) > phone_idx else ""
            role = row[role_idx].strip() if role_idx != -1 and len(row) > role_idx else "Staff"
            join_date = row[join_idx].strip() if join_idx != -1 and len(row) > join_idx else ""
            
            if not code or not name: continue
            
            # Check if exists
            existing = db.query(Employee).filter(Employee.code == code).first()
            if existing:
                existing.name = name
                existing.email = email
                existing.phone = phone
                existing.role = role
                existing.join_date = join_date
            else:
                db.add(Employee(code=code, name=name, email=email, phone=phone, role=role, join_date=join_date))
            count += 1
        db.commit()
        return {"message": f"Successfully imported {count} Employee entries"}
        
    else:
        raise HTTPException(
            status_code=400, 
            detail="Could not detect entity type. Please ensure headers contain 'account_code' (for COA), 'min_stock' (for Materials), or 'role' (for Employees)."
        )

@router.get("/invoice-templates")
def download_invoice_templates():
    # Return a sample HTML invoice template
    sample_template = """<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .invoice-title { font-size: 24px; font-weight: bold; color: #1a365d; }
        .details { margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .table th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h2>PT ANSA GEOTECHNICAL</h2>
            <p>Jakarta, Indonesia</p>
        </div>
        <div class="invoice-title">INVOICE</div>
    </div>
    <div class="details">
        <p><strong>Invoice No:</strong> INV-2026-001</p>
        <p><strong>Date:</strong> 2026-07-22</p>
        <p><strong>Bill To:</strong> PT Client Indonesia</p>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Geotechnical Drilling Services</td>
                <td>1</td>
                <td>Rp 50.000.000</td>
                <td>Rp 50.000.000</td>
            </tr>
        </tbody>
    </table>
</body>
</html>"""
    
    buffer = io.BytesIO(sample_template.encode('utf-8'))
    return StreamingResponse(
        buffer,
        media_type="text/html",
        headers={"Content-Disposition": "attachment; filename=invoice_template.html"}
    )

@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"message": f"Successfully uploaded {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deploy-script")
async def deploy_script(file: UploadFile = File(...)):
    if not file.filename.endswith('.py'):
        raise HTTPException(status_code=400, detail="Only python (.py) files are allowed")
    
    temp_path = os.path.join(UPLOAD_DIR, f"temp_{file.filename}")
    try:
        # Write to temporary location
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Execute script
        # Check if venv python path exists, otherwise use default python
        python_exe = "./venv/Scripts/python.exe" if os.path.exists("./venv/Scripts/python.exe") else "python"
        
        # Run process and capture output
        result = subprocess.run(
            [python_exe, temp_path],
            capture_output=True,
            text=True,
            timeout=10 # safety timeout
        )
        
        # Clean up temp script
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {
            "message": "Script executed successfully",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=status.HTTP_408_REQUEST_TIMEOUT, detail="Script execution timed out (limit: 10s)")
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
