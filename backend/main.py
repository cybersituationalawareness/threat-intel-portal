"""
main.py
-------
FastAPI application entry point for the Threat Intelligence Sharing Portal.
Updated for Phase 2: ACSAC Multi-Tenancy.
"""
from typing import List, Optional, Set
import uuid
from datetime import datetime, timezone
import os
import random
import string

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

from fastapi import Depends, FastAPI, HTTPException, Header, Query, File, UploadFile, Form
from pydantic import BaseModel
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import func, text

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

import models
import schemas
from database import Base, engine, get_db

# ─────────────────────────────────────────────────────────────────────────────
# Database Initialisation & Seeding
# ─────────────────────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE threat_intel ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General'"))
        conn.execute(text("UPDATE threat_intel SET category = 'General' WHERE category IS NULL"))
        conn.execute(text("ALTER TABLE isac_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'OPEN'"))
        conn.execute(text("UPDATE isac_submissions SET status = 'OPEN' WHERE status IS NULL"))
        conn.execute(text("ALTER TABLE isac_submissions ADD COLUMN IF NOT EXISTS target_org_id UUID REFERENCES organizations(id) DEFAULT NULL"))
        conn.execute(text("ALTER TABLE investigation_responses ADD COLUMN IF NOT EXISTS clarification_thread JSONB NOT NULL DEFAULT '[]'::jsonb"))
        conn.execute(text("ALTER TABLE org_intel_status ADD COLUMN IF NOT EXISTS clarification_thread JSONB NOT NULL DEFAULT '[]'::jsonb"))
        conn.execute(text("ALTER TABLE investigation_responses ADD COLUMN IF NOT EXISTS clarification_is_open BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE org_intel_status ADD COLUMN IF NOT EXISTS clarification_is_open BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS clarification_thread JSONB NOT NULL DEFAULT '[]'::jsonb"))
        conn.execute(text("ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS clarification_is_open BOOLEAN NOT NULL DEFAULT TRUE"))
except Exception as e:
    print(f"[Schema check] {e}")

try:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text("ALTER TYPE intel_type_enum ADD VALUE IF NOT EXISTS 'info_note'"))
        conn.execute(text("ALTER TYPE intel_type_enum ADD VALUE IF NOT EXISTS 'Information Note/ Bulletin'"))
except Exception as e:
    print(f"[Enum check] {e}")

def seed_database():
    """Seed the database with ACSAC and Member orgs/users for demo login."""
    db = next(get_db())
    if db.query(models.User).count() > 0:
        return
    
    print("[*] Seeding demo organizations and users...")
    
    # Orgs
    acsac_org = models.Organization(name="Platform", org_type=models.OrgType.acsac)
    member_a = models.Organization(name="Sector Member1", org_type=models.OrgType.member)
    member_b = models.Organization(name="Sector Member2", org_type=models.OrgType.member)
    member_c = models.Organization(name="Sector Member3", org_type=models.OrgType.member)
    
    db.add_all([acsac_org, member_a, member_b, member_c])
    db.commit()

    # Users
    users = [
        models.User(name="ADMIN", email="admin@platform.local", hashed_password=get_password_hash("admin123"), org_id=acsac_org.id, role=models.UserRole.admin),
        models.User(name="ANALYST", email="analyst@platform.local", hashed_password=get_password_hash("analyst123"), org_id=acsac_org.id, role=models.UserRole.analyst),
        models.User(name="MEMBER1", email="member1@sector.local", hashed_password=get_password_hash("member1123"), org_id=member_a.id, role=models.UserRole.analyst),
        models.User(name="MEMBER2", email="member2@sector.local", hashed_password=get_password_hash("member2123"), org_id=member_b.id, role=models.UserRole.analyst),
        models.User(name="MEMBER3", email="member3@sector.local", hashed_password=get_password_hash("member3123"), org_id=member_c.id, role=models.UserRole.analyst),
    ]
    db.add_all(users)
    db.commit()
    
    # Mock Threat Intel
    mock_intel = models.ThreatIntel(
        type="Alert",
        title="Critical RCE in Edge Gateway",
        case_id="A&A-2026-00491",
        description="A zero-day RCE has been identified in common Edge Gateway devices.",
        threat_data="Attackers are actively exploiting CVE-2026-9999 to gain initial access. Patch immediately.",
        tlp="Amber",
        confidence="High",
        tags=["RCE", "Zero-day", "Gateway"],
        classification="sector-wide",
        category="Exploited Vulnerabilities",
        creator_org_id=acsac_org.id,
        created_by_id=users[1].id
    )
    db.add(mock_intel)
    db.commit()
    
    # Disseminate to members
    status_a = models.OrgIntelStatus(org_id=member_a.id, intel_id=mock_intel.id, status="UNACKNOWLEDGED")
    status_b = models.OrgIntelStatus(org_id=member_b.id, intel_id=mock_intel.id, status="UNACKNOWLEDGED")
    db.add_all([status_a, status_b])
    db.commit()

    print("[+] Seeding complete.")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ACSAC Threat Intelligence Platform API",
    description="Multi-tenanted workflow platform for Alert/Advisory management.",
    version="2.0.0",
)

@app.on_event("startup")
def on_startup():
    seed_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, admin_administration, alerts_advisories, incident_reporting, insights_sharing, analytics

app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin_administration.router, prefix="/api/v1")
app.include_router(alerts_advisories.router, prefix="/api/v1")
app.include_router(incident_reporting.router, prefix="/api/v1")
app.include_router(insights_sharing.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")

@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "operational", "version": "2.0.0"}

# Mount the static files for the React frontend (if directory exists)
frontend_build_path = "../frontend/build"
if os.path.isdir(os.path.join(frontend_build_path, "static")):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_build_path, "static")), name="static")

    # Catch-all route to serve the React SPA
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        file_path = os.path.join(frontend_build_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_build_path, "index.html"))
