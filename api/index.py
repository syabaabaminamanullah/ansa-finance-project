import sys
import os
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# Determine base paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

# Ensure backend directory is in sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

import_error = None
try:
    # Handle namespace collision between root api/ and backend/api/
    if "api" in sys.modules and hasattr(sys.modules["api"], "__path__"):
        backend_api_dir = os.path.join(BACKEND_DIR, "api")
        if os.path.exists(backend_api_dir) and backend_api_dir not in sys.modules["api"].__path__:
            sys.modules["api"].__path__.append(backend_api_dir)

    # Change working directory so relative paths in backend work
    if os.path.exists(BACKEND_DIR):
        try:
            os.chdir(BACKEND_DIR)
        except Exception:
            pass

    from main import app as backend_app
    app = backend_app

except Exception as e:
    import_error = traceback.format_exc()
    print("BACKEND IMPORT ERROR:", import_error)
    app = FastAPI(title="Diagnostic App")

# Diagnostic & health endpoints attached to app
@app.get("/ping")
@app.get("/api/ping")
def ping(request: Request):
    return {"status": "ok", "received_path": request.url.path}

@app.get("/debug")
@app.get("/api/debug")
def debug():
    backend_exists = os.path.exists(BACKEND_DIR)
    return {
        "import_error": import_error,
        "cwd": os.getcwd(),
        "backend_exists": backend_exists,
        "files_cwd": os.listdir(os.getcwd()) if os.path.exists(os.getcwd()) else [],
        "sys_path": sys.path[:6]
    }

@app.get("/health")
@app.get("/api/health")
def health():
    if import_error:
        return JSONResponse(status_code=500, content={
            "status": "error",
            "import_error": import_error
        })
    return {"status": "healthy"}
