from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Resolve absolute path to ansa_erp.db in backend folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "ansa_erp.db")
DEFAULT_SQLITE_URL = f"sqlite:///{DB_PATH.replace(os.sep, '/')}"

# Load .env if present
load_dotenv(os.path.join(BASE_DIR, ".env"))

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    DEFAULT_SQLITE_URL
)

# Handle postgres:// vs postgresql:// for SQLAlchemy 2.0+
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        poolclass=NullPool,
        pool_pre_ping=True
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
