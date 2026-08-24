"""
database.py
-----------
Manages SQLAlchemy engine creation, session lifecycle, and the shared
declarative Base class. All ORM models must import Base from this module.

Architecture note:
  - pool_pre_ping=True ensures connections are verified before use,
    preventing errors caused by stale idle connections.

Phase 2 upgrade path:
  - Replace DATABASE_URL with a connection pooler (e.g. PgBouncer).
  - Add ssl_require=True when deploying behind a production certificate.
  - Move credentials to a secrets manager (e.g. HashiCorp Vault, GCP Secret Manager).
"""
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
load_dotenv() # Fallback for when it's copied into the same directory

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://intel_user:intel_pass@localhost:5432/threat_intel_db",
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Re-validates connections on checkout from pool
    echo=False,          # Set echo=True locally for SQL query debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a scoped database session and guarantees
    it is closed after the request completes (success or exception).

    Usage:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
