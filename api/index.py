import sys
import os

# Add backend to Python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Change current working directory to backend so relative paths work
os.chdir(BACKEND_DIR)

from main import app
