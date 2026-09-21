import os
import shutil
import subprocess
import zipfile
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine
from db.database import get_db, engine, Base, SQLALCHEMY_DATABASE_URL
from db.models import ChartOfAccount, Material, Employee, Journal, Expense

router = APIRouter()

import datetime
import json

DB_FILE_PATH = "./ansa_erp.db"
UPLOAD_DIR = "./uploads"
BACKUP_METADATA_FILE = "./uploads/backup_metadata.json"

# Create upload directory if not exists (safe in read-only serverless environments)
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception:
    pass

def _resolve_local_db_path():
    possible_paths = [
        DB_FILE_PATH,
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ansa_erp.db"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ansa_erp.db"),
    ]
    for p in possible_paths:
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return p
    return None

@router.get("/status")
def get_data_management_status(db: Session = Depends(get_db)):
    db_size = 0
    db_mtime = None
    
    local_path = _resolve_local_db_path()
    if local_path and SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        try:
            stat = os.stat(local_path)
            db_size = stat.st_size
            db_mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%d %B %Y, %H:%M WIB")
        except Exception:
            pass

    if db_size == 0 and not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        try:
            size = db.execute(text("SELECT pg_database_size(current_database())")).scalar()
            if size:
                db_size = int(size)
                db_mtime = datetime.datetime.now().strftime("%d %B %Y, %H:%M WIB")
        except Exception:
            # Fallback approximate size from table records
            total_rows = sum(db.query(t).count() for t in [ChartOfAccount, Material, Employee, Journal, Expense])
            db_size = max(total_rows * 2048, 782 * 1024)
            db_mtime = datetime.datetime.now().strftime("%d %B %Y, %H:%M WIB")
    
    last_backup_time = None
    if os.path.exists(BACKUP_METADATA_FILE):
        try:
            with open(BACKUP_METADATA_FILE, "r") as f:
                data = json.load(f)
                last_backup_time = data.get("last_backup")
        except Exception:
            pass

    return {
        "db_size": db_size,
        "db_size_formatted": f"{db_size / (1024 * 1024):.2f} MB" if db_size > 1024*1024 else f"{db_size / 1024:.1f} KB",
        "db_last_modified": db_mtime or datetime.datetime.now().strftime("%d %B %Y, %H:%M WIB"),
        "last_backup": last_backup_time,
        "total_coas": db.query(ChartOfAccount).count(),
        "total_materials": db.query(Material).count(),
        "total_employees": db.query(Employee).count(),
    }

@router.get("/backup")
def download_backup(db: Session = Depends(get_db)):
    now = datetime.datetime.now()
    filename = f"ansa_erp_backup_{now.strftime('%Y%m%d_%H%M%S')}.db"
    now_str = now.strftime("%d %B %Y, %H:%M WIB")

    # 1. If SQLite and local file exists on disk, serve directly
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        local_path = _resolve_local_db_path()
        if local_path:
            try:
                with open(BACKUP_METADATA_FILE, "w") as f:
                    json.dump({"last_backup": now_str, "timestamp": now.isoformat()}, f)
            except Exception:
                pass
            return FileResponse(
                local_path, 
                filename=filename, 
                media_type="application/octet-stream"
            )

    # 2. Otherwise (PostgreSQL in cloud or serverless), dump active database to SQLite backup
    import tempfile
    
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    target_engine = None
    try:
        clean_path = tmp_path.replace("\\", "/")
        target_engine = create_engine(f"sqlite:///{clean_path}")
        Base.metadata.create_all(bind=target_engine)

        with target_engine.connect() as target_conn:
            target_conn.execute(text("PRAGMA foreign_keys = OFF;"))
            for table in Base.metadata.sorted_tables:
                try:
                    rows = db.execute(table.select()).mappings().all()
                    if rows:
                        target_conn.execute(table.insert(), [dict(r) for r in rows])
                except Exception as ex:
                    print(f"Error backing up table {table.name}: {ex}")
            target_conn.commit()
            target_conn.execute(text("PRAGMA foreign_keys = ON;"))

        target_engine.dispose()
        target_engine = None

        with open(tmp_path, "rb") as f:
            data = f.read()

        try:
            with open(BACKUP_METADATA_FILE, "w") as f:
                json.dump({"last_backup": now_str, "timestamp": now.isoformat()}, f)
        except Exception:
            pass

        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(data))
            }
        )
    finally:
        if target_engine:
            try:
                target_engine.dispose()
            except Exception:
                pass
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

@router.post("/restore")
async def restore_database(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.db', '.sql')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .db or .sql files allowed.")
    
    # 1. If SQLite on disk (local development)
    local_path = _resolve_local_db_path()
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite") and local_path:
        engine.dispose()
        try:
            with open(local_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            return {"message": "Database restored successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to restore database: {str(e)}")

    # 2. If PostgreSQL on cloud (Vercel / Supabase): restore from uploaded SQLite backup
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()
        
        src_engine = create_engine(f"sqlite:///{tmp_path.replace(os.sep, '/')}")

        # Step A: Empty existing tables safely
        table_names = [f'"{t.name}"' for t in Base.metadata.sorted_tables]
        try:
            db.execute(text(f"TRUNCATE TABLE {', '.join(table_names)} CASCADE;"))
            db.commit()
        except Exception:
            db.rollback()
            try:
                db.execute(text('UPDATE "employees" SET "crew_id" = NULL;'))
                db.execute(text('UPDATE "crews" SET "leader_id" = NULL;'))
                db.commit()
            except Exception:
                db.rollback()
            for t in reversed(Base.metadata.sorted_tables):
                try:
                    db.execute(t.delete())
                    db.commit()
                except Exception:
                    db.rollback()

        # Step B: Insert tables with foreign key handling
        use_replica_role = False
        try:
            db.execute(text("SET session_replication_role = 'replica';"))
            db.commit()
            use_replica_role = True
        except Exception:
            db.rollback()

        deferred_updates = []
        restored_total = 0

        with src_engine.connect() as src_conn:
            for table in Base.metadata.sorted_tables:
                try:
                    src_rows = src_conn.execute(table.select()).mappings().all()
                    if not src_rows:
                        continue

                    clean_rows = []
                    for row in src_rows:
                        d = dict(row)
                        for k, v in list(d.items()):
                            if v == "":
                                col = table.columns.get(k)
                                if col is not None:
                                    if col.foreign_keys or str(col.type).lower().startswith(('uuid', 'int', 'float', 'num', 'date', 'bool')):
                                        d[k] = None
                                    elif k.endswith('_id'):
                                        d[k] = None

                        if not use_replica_role:
                            if table.name == "employees" and d.get("crew_id"):
                                deferred_updates.append(("employees", "crew_id", d["id"], d["crew_id"]))
                                d["crew_id"] = None
                            elif table.name == "crews" and d.get("leader_id"):
                                deferred_updates.append(("crews", "leader_id", d["id"], d["leader_id"]))
                                d["leader_id"] = None

                        clean_rows.append(d)

                    if clean_rows:
                        for i in range(0, len(clean_rows), 500):
                            chunk = clean_rows[i:i+500]
                            db.execute(table.insert(), chunk)
                        db.commit()
                        restored_total += len(clean_rows)

                except Exception as ex:
                    db.rollback()
                    print(f"Error restoring table {table.name}: {ex}")

            # Re-apply deferred circular foreign keys
            for tbl_name, col_name, row_id, val in deferred_updates:
                try:
                    db.execute(
                        text(f'UPDATE "{tbl_name}" SET "{col_name}" = :val WHERE "id" = :rid'),
                        {"val": val, "rid": row_id}
                    )
                except Exception as ex:
                    print(f"Error re-linking {tbl_name}.{col_name}: {ex}")
            db.commit()

        if use_replica_role:
            try:
                db.execute(text("SET session_replication_role = 'DEFAULT';"))
                db.commit()
            except Exception:
                db.rollback()

        src_engine.dispose()
        return {"message": f"Database restored successfully ({restored_total} records restored)"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to restore database: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

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
