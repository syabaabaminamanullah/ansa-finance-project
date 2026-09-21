import sys
import os

# Resolve base directories
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

# Ensure backend directory is at the front of sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

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

from main import app
