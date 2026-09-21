import sys
import os
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Resolve base directories
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

# Ensure backend directory is at the front of sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# If 'api' is already registered in sys.modules pointing to root api/,
# extend its __path__ so Python can locate backend/api/routes submodules
if "api" in sys.modules:
    backend_api_dir = os.path.join(BACKEND_DIR, "api")
    if os.path.exists(backend_api_dir) and hasattr(sys.modules["api"], "__path__"):
        if backend_api_dir not in sys.modules["api"].__path__:
            sys.modules["api"].__path__.append(backend_api_dir)

try:
    if os.path.exists(BACKEND_DIR):
        os.chdir(BACKEND_DIR)
except Exception:
    pass

error_details = None

try:
    from main import app
except Exception as e:
    error_details = traceback.format_exc()
    print("Failed to import main app:", error_details)
    
    # Fallback app so serverless function does not crash with FUNCTION_INVOCATION_FAILED
    app = FastAPI(title="Error Diagnostic App")
    
    @app.get("/api/health")
    @app.get("/health")
    def health():
        return JSONResponse(status_code=500, content={
            "status": "initialization_failed",
            "traceback": error_details.splitlines()[-15:]
        })
        
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    def catch_all(path: str):
        return JSONResponse(status_code=500, content={
            "error": "FastAPI failed to initialize",
            "traceback": error_details.splitlines()[-20:]
        })
