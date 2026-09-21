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
    "SB_POSTGRES_URL",
    os.getenv(
        "POSTGRES_URL",
        os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)
    )
)

# Automatic IPv4 Supabase Pooler Conversion for Serverless (AWS Lambda / Vercel is IPv4-only)
if "@db." in SQLALCHEMY_DATABASE_URL and ".supabase.co" in SQLALCHEMY_DATABASE_URL:
    import re
    m = re.search(r'@db\.([a-z0-9]+)\.supabase\.co', SQLALCHEMY_DATABASE_URL)
    if m:
        ref = m.group(1)
        if f"://postgres.{ref}:" not in SQLALCHEMY_DATABASE_URL:
            SQLALCHEMY_DATABASE_URL = re.sub(r'://postgres:', f'://postgres.{ref}:', SQLALCHEMY_DATABASE_URL)
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(f'db.{ref}.supabase.co', 'aws-0-ap-southeast-1.pooler.supabase.com')

# Prefer pure-Python pg8000 driver for serverless environments (avoids libpq binary crashes)
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql://") and "+" not in SQLALCHEMY_DATABASE_URL.split("://")[0]:
    try:
        import pg8000
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
    except ImportError:
        pass

# pg8000 does not support sslmode query param — strip it safely with urllib.parse
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
_use_ssl = False
if "sslmode" in SQLALCHEMY_DATABASE_URL:
    _parsed = urlparse(SQLALCHEMY_DATABASE_URL)
    _params = parse_qs(_parsed.query)
    _ssl_val = _params.pop("sslmode", [None])
    if _ssl_val and _ssl_val[0] in ("require", "verify-ca", "verify-full"):
        _use_ssl = True
    _new_query = urlencode(_params, doseq=True)
    SQLALCHEMY_DATABASE_URL = urlunparse(_parsed._replace(query=_new_query))

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
else:
    _connect_args = {}
    if _use_ssl or "pg8000" in SQLALCHEMY_DATABASE_URL:
        import ssl as _ssl
        _ctx = _ssl.create_default_context()
        _ctx.check_hostname = False
        _ctx.verify_mode = _ssl.CERT_NONE
        _connect_args["ssl_context"] = _ctx
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        poolclass=NullPool,
        pool_pre_ping=True,
        connect_args=_connect_args
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
