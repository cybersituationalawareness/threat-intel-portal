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


# ─────────────────────────────────────────────────────────────────────────────
# Authentication Dependency (Mocked for Phase 2 MVP)
# ─────────────────────────────────────────────────────────────────────────────
def get_current_user(x_user_id: str = Header(None), db: Session = Depends(get_db)) -> models.User:
    """Mock auth that expects a UUID in the X-User-ID header."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header missing (Not Authenticated)")
    
    try:
        uid = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid X-User-ID format")
        
    user = db.query(models.User).filter(models.User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user


# ─────────────────────────────────────────────────────────────────────────────
# API Router
# ─────────────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/v1")

@router.post("/auth/login", response_model=schemas.UserResponse, tags=["Auth"])
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

@router.get("/demo-users", response_model=List[schemas.UserResponse], tags=["Auth"])
def get_demo_users(db: Session = Depends(get_db)):
    """Returns all users to populate the Demo Login buttons."""
    return db.query(models.User).all()

@router.get("/organizations", response_model=List[schemas.OrganizationResponse], tags=["Auth"])
def get_organizations(db: Session = Depends(get_db)):
    """Returns all organizations."""
    return db.query(models.Organization).all()

@router.post("/admin/members", tags=["Admin"])
def create_member(
    payload: schemas.MemberCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Admin creates a new Member organization and a user for it."""
    if user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only Admins can create new members.")
        
    # Check if org already exists
    existing_org = db.query(models.Organization).filter(models.Organization.name == payload.org_name).first()
    if existing_org:
        raise HTTPException(status_code=400, detail="Organization already exists.")
        
    # Check if user email already exists
    existing_user = db.query(models.User).filter(models.User.email == payload.user_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User email already exists.")
        
    new_org = models.Organization(name=payload.org_name, org_type=models.OrgType.member)
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    
    new_user = models.User(
        name=payload.user_name,
        email=payload.user_email,
        hashed_password=get_password_hash(payload.password),
        org_id=new_org.id,
        role=models.UserRole.analyst
    )
    db.add(new_user)
    db.commit()
    
    return {"message": "Member organization and user created successfully."}

@router.get("/admin/organizations", response_model=List[schemas.OrganizationWithUsersResponse], tags=["Admin"])
def get_admin_organizations(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Admin fetches all organizations and their users."""
    if user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only Admins can view this data.")
    return db.query(models.Organization).all()

@router.put("/admin/organizations/{org_id}", tags=["Admin"])
def update_organization(
    org_id: str,
    payload: schemas.OrganizationUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Admin updates an organization."""
    if user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only Admins can update organizations.")
        
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
        
    org.name = payload.name
    db.commit()
    return {"message": "Organization updated successfully."}

@router.put("/admin/users/{user_id}", tags=["Admin"])
def update_user(
    user_id: str,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_current_user)
):
    """Admin updates a user."""
    if admin_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only Admins can update users.")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user.name = payload.name
    user.email = payload.email
    db.commit()
    return {"message": "User updated successfully."}

@router.get("/users/me", response_model=schemas.UserResponse, tags=["Auth"])
def get_me(user: models.User = Depends(get_current_user)):
    return user

import og_integration

# ── Intel Creation (ACSAC Only) ──────────────────────────────────────────

@router.post("/intel/sync-og", response_model=List[schemas.ThreatIntelResponse], tags=["Intel"])
def sync_intel_from_og(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """ACSAC pulls alerts/advisories from OG API and publishes them."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can pull intelligence.")

    try:
        existing_case_ids = {intel.case_id for intel in db.query(models.ThreatIntel.case_id).all()}
        parsed_intels = og_integration.sync_latest_intel_from_og(existing_case_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    created_intels = []
    members = db.query(models.Organization).filter(models.Organization.org_type == models.OrgType.member).all()

    for p_intel in parsed_intels:
        temp_attachments = p_intel.pop("temp_attachments", [])
        
        intel = models.ThreatIntel(
            **p_intel,
            creator_org_id=user.org_id,
            created_by_id=user.id
        )
        db.add(intel)
        db.commit()
        db.refresh(intel)
        
        # Move the attachment files
        saved_attachments = []
        for temp_path in temp_attachments:
            if temp_path and os.path.exists(temp_path):
                final_path = os.path.join(UPLOAD_DIR, f"{intel.id}_{temp_path}")
                import shutil
                shutil.move(temp_path, final_path)
                saved_attachments.append({
                    "filename": temp_path,
                    "path": final_path
                })
                
        if saved_attachments:
            intel.attachments = saved_attachments
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(intel, "attachments")
            db.commit()
            db.refresh(intel)
        
        for member in members:
            status = models.OrgIntelStatus(
                intel_id=intel.id,
                org_id=member.id,
                status=models.MemberIntelStatus.unacknowledged
            )
            db.add(status)
        db.commit()
        created_intels.append(intel)

    return created_intels

import csv
import io
from fastapi.responses import StreamingResponse

@router.get("/intel/export/csv", tags=["Intel"])
def export_intel_csv(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Export intels and member responses to CSV with tenant isolation."""
    
    is_acsac = user.organization.org_type == models.OrgType.acsac
    
    if is_acsac:
        intels = db.query(models.ThreatIntel).order_by(models.ThreatIntel.published_at.desc()).all()
    else:
        # For members, fetch statuses for their org to find which intels they have access to
        intel_statuses = db.query(models.OrgIntelStatus)\
            .filter(models.OrgIntelStatus.org_id == user.org_id)\
            .all()
        # Sort newest first based on intel published_at
        intel_statuses.sort(key=lambda st: st.intel.published_at, reverse=True)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Comprehensive Headers covering all Alert/Advisory and Investigation/Response Form fields
    writer.writerow([
        # --- Alert or Advisory Creation Form Fields (16) ---
        "Case ID",
        "Title",
        "Type",
        "Category",
        "Classification",
        "TLP",
        "Confidence Level",
        "Description",
        "Technical Threat Data",
        "Tags",
        "Target Member",
        "Source Organization",
        "Has SLA",
        "SLA",
        "Published Date",
        "Alert Attachments",
        # --- Investigation & Response Form Fields (21) ---
        "Organization Name",
        "Member Status",
        "Acknowledged At",
        "Responded At",
        "Affected Status",
        "Affected Environment",
        "Affected Assets",
        "Response Findings / IOC Detected",
        "IOC Direction / Campaign Activity",
        "Follow-up Action / Defensive Actions",
        "Patch Status",
        "Mitigation Measure While Patch Is Being Applied",
        "General Mitigation Measures",
        "Expected Patch or Mitigation Date",
        "Delay Reason",
        "Other Alert Details",
        "Response Evidence Files",
        "Review Status",
        "Reviewer Comments",
        "SLA Compliance",
        "SLA Balance"
    ])

    def get_intel_csv_row(intel, status=None, resp=None):
        tags_str = ", ".join(intel.tags) if (intel and intel.tags) else ""
        target_member = intel.target_org.name if (intel and intel.target_org) else "All Members"
        source = intel.creator_org.name if (intel and intel.creator_org) else ""
        has_sla_str = "Yes" if (intel and intel.has_sla) else "No"
        sla_str = f"{intel.sla_value} {intel.sla_unit}(s)" if (intel and intel.has_sla) else "No"
        att_str = ", ".join([a.get("filename", "") for a in intel.attachments if isinstance(a, dict)]) if (intel and intel.attachments) else ""

        org_name = (status.organization.name if status.organization else "") if status else ((resp.organization.name if resp.organization else "") if resp else "")
        member_status_val = status.status.value if (status and status.status) else ""
        ack_at = status.acknowledged_at.isoformat() if (status and status.acknowledged_at) else ""
        resp_at = status.responded_at.isoformat() if (status and status.responded_at) else ((resp.submitted_at.isoformat() if resp.submitted_at else "") if resp else "")

        affected_status = resp.affected_member_status if (resp and resp.affected_member_status) else ""
        affected_env = resp.affected_environment if (resp and resp.affected_environment) else ""
        assets = ", ".join(resp.affected_assets) if (resp and resp.affected_assets) else ""
        findings = resp.findings if (resp and resp.findings) else ""
        ioc_dir = resp.ioc_traffic_direction if (resp and resp.ioc_traffic_direction) else ""
        follow_up = resp.follow_up_action if (resp and resp.follow_up_action) else ""
        patch_status = resp.patch_status if (resp and resp.patch_status) else ""
        mitigation_unpatched = resp.mitigation_measure_if_not_patched if (resp and resp.mitigation_measure_if_not_patched) else ""
        mitigations = ", ".join(resp.mitigation_measures) if (resp and resp.mitigation_measures) else ""
        expected_date = resp.expected_verification_date.isoformat() if (resp and resp.expected_verification_date) else ""
        delay_reason = resp.delay_reason if (resp and resp.delay_reason) else ""
        other_details = resp.other_type_of_alert if (resp and resp.other_type_of_alert) else ""
        ev_str = ", ".join([f.get("filename", "") for f in resp.evidence_files if isinstance(f, dict)]) if (resp and resp.evidence_files) else ""
        review = resp.review_status.value if (resp and resp.review_status) else ""
        reviewer_comments = resp.reviewer_comments if (resp and resp.reviewer_comments) else ""

        sla_compliance = ""
        sla_balance = ""
        if intel.has_sla and resp and resp.submitted_at and intel.published_at:
            if resp.sla_met is True:
                sla_compliance = "Yes"
            elif resp.sla_met is False:
                sla_compliance = "No"
                
            if intel.sla_value == 0:
                diff = resp.submitted_at - intel.published_at
                diff_hours = -(diff.total_seconds() / 3600.0)
                sla_balance = f"{diff_hours:.4f}"
            else:
                days = 0
                if intel.sla_unit == 'day':
                    days = intel.sla_value
                elif intel.sla_unit == 'week':
                    days = intel.sla_value * 7
                elif intel.sla_unit == 'month':
                    days = intel.sla_value * 30
                
                from datetime import timedelta
                deadline = intel.published_at + timedelta(days=days)
                diff = deadline - resp.submitted_at
                diff_hours = diff.total_seconds() / 3600.0
                if diff_hours >= 0:
                    sla_balance = "0"
                else:
                    sla_balance = f"{diff_hours:.4f}"
        elif resp and not intel.has_sla:
            sla_compliance = "N/A"

        return [
            intel.case_id,
            intel.title,
            intel.type.value if intel.type else "",
            intel.category or "",
            intel.classification or "",
            intel.tlp.value if intel.tlp else "",
            intel.confidence.value if intel.confidence else "",
            intel.description or "",
            intel.threat_data or "",
            tags_str,
            target_member,
            source,
            has_sla_str,
            sla_str,
            intel.published_at.isoformat() if intel.published_at else "",
            att_str,
            org_name,
            member_status_val,
            ack_at,
            resp_at,
            affected_status,
            affected_env,
            assets,
            findings,
            ioc_dir,
            follow_up,
            patch_status,
            mitigation_unpatched,
            mitigations,
            expected_date,
            delay_reason,
            other_details,
            ev_str,
            review,
            reviewer_comments,
            sla_compliance,
            sla_balance
        ]
    
    if is_acsac:
        for intel in intels:
            if not intel.member_statuses:
                writer.writerow(get_intel_csv_row(intel, None, None))
                continue
                
            for status in intel.member_statuses:
                resp = next((r for r in intel.responses if r.org_id == status.org_id), None)
                writer.writerow(get_intel_csv_row(intel, status, resp))
    else:
        for st in intel_statuses:
            intel = st.intel
            resp = next((r for r in intel.responses if r.org_id == st.org_id), None)
            writer.writerow(get_intel_csv_row(intel, st, resp))
            
    output.seek(0)
    
    return StreamingResponse(
        output, 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=intel_report.csv"}
    )

@router.get("/intel/next-case-id", tags=["Intel"])
def get_next_case_id(db: Session = Depends(get_db)):
    """Generate the next auto-incrementing case ID for the current year."""
    current_year = datetime.now(timezone.utc).year
    prefix = f"A&A-{current_year}-"
    
    # Query all case_ids that start with the current year prefix
    # We do a client-side or simple LIKE query
    intels = db.query(models.ThreatIntel.case_id).filter(
        models.ThreatIntel.case_id.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for (case_id,) in intels:
        parts = case_id.split("-")
        if len(parts) >= 2 and parts[-1].isdigit():
            num = int(parts[-1])
            if num > max_num:
                max_num = num
                
    next_num = max_num + 1
    next_case_id = f"{prefix}{next_num:05d}"
    
    return {"next_case_id": next_case_id}

@router.post("/intel", response_model=schemas.ThreatIntelResponse, status_code=201, tags=["Intel"])
def create_intel(
    payload: schemas.ThreatIntelCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """ACSAC publishes an Alert/Advisory. Initializes status for all members."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can publish intelligence.")

    intel = models.ThreatIntel(
        **payload.model_dump(),
        creator_org_id=user.org_id,
        created_by_id=user.id
    )
    db.add(intel)
    db.commit()
    db.refresh(intel)

    # Initialize unacknowledged status for MEMBER organizations if not DRAFT, PENDING_REVIEW, or APPROVED
    if payload.status not in (schemas.IntelStatus.draft, schemas.IntelStatus.pending_review, schemas.IntelStatus.approved):
        if payload.target_org_id:
            members = db.query(models.Organization).filter(
                models.Organization.id == payload.target_org_id,
                models.Organization.org_type == models.OrgType.member
            ).all()
        else:
            members = db.query(models.Organization).filter(models.Organization.org_type == models.OrgType.member).all()
            
        for member in members:
            status = models.OrgIntelStatus(
                intel_id=intel.id,
                org_id=member.id,
                status=models.MemberIntelStatus.unacknowledged
            )
            db.add(status)
    
    db.commit()
    db.refresh(intel)
    return intel

@router.delete("/intel", tags=["Intel"])
def delete_intel(
    payload: schemas.BulkDeletePayload,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """ACSAC deletes Alerts/Advisories."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can delete intelligence.")

    if not payload.intel_ids:
        return {"deleted_count": 0}

    # Delete cascading relationships manually
    db.query(models.OrgIntelStatus).filter(models.OrgIntelStatus.intel_id.in_(payload.intel_ids)).delete(synchronize_session=False)
    db.query(models.InvestigationResponse).filter(models.InvestigationResponse.intel_id.in_(payload.intel_ids)).delete(synchronize_session=False)
    
    # Delete main intel
    deleted_count = db.query(models.ThreatIntel).filter(models.ThreatIntel.id.in_(payload.intel_ids)).delete(synchronize_session=False)
    
    db.commit()
    return {"deleted_count": deleted_count}

@router.put("/intel/{intel_id}", response_model=schemas.ThreatIntelResponse, tags=["Intel"])
def update_intel(
    intel_id: uuid.UUID,
    payload: schemas.ThreatIntelCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """ACSAC edits an existing Alert/Advisory."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can edit intelligence.")

    intel = db.query(models.ThreatIntel).filter(models.ThreatIntel.id == intel_id).first()
    if not intel:
        raise HTTPException(status_code=404, detail="Intelligence entry not found.")

    old_target_org_id = intel.target_org_id
    old_status = intel.status

    for key, value in payload.model_dump().items():
        setattr(intel, key, value)
        
    was_draft_to_open = (old_status in [models.IntelStatus.draft, models.IntelStatus.pending_review, models.IntelStatus.approved] and payload.status == models.IntelStatus.open)
        
    if payload.status not in (models.IntelStatus.draft, models.IntelStatus.pending_review, models.IntelStatus.approved):
        if old_target_org_id != payload.target_org_id or was_draft_to_open:
            if payload.target_org_id is not None:
                # Delete statuses for all orgs except the new target
                db.query(models.OrgIntelStatus).filter(
                    models.OrgIntelStatus.intel_id == intel.id,
                    models.OrgIntelStatus.org_id != payload.target_org_id
                ).delete()
                
                # Ensure the new target has a status record
                exists = db.query(models.OrgIntelStatus).filter(
                    models.OrgIntelStatus.intel_id == intel.id,
                    models.OrgIntelStatus.org_id == payload.target_org_id
                ).first()
                if not exists:
                    new_status = models.OrgIntelStatus(
                        intel_id=intel.id,
                        org_id=payload.target_org_id,
                        status=models.MemberIntelStatus.unacknowledged
                    )
                    db.add(new_status)
            else:
                # Target is all members, ensure all members have a status
                members = db.query(models.Organization).filter(models.Organization.org_type == models.OrgType.member).all()
                existing_org_ids = [st.org_id for st in db.query(models.OrgIntelStatus).filter(models.OrgIntelStatus.intel_id == intel.id).all()]
                for member in members:
                    if member.id not in existing_org_ids:
                        new_status = models.OrgIntelStatus(
                            intel_id=intel.id,
                            org_id=member.id,
                            status=models.MemberIntelStatus.unacknowledged
                        )
                        db.add(new_status)
    else:
        # If changed to DRAFT, revoke all member statuses
        db.query(models.OrgIntelStatus).filter(
            models.OrgIntelStatus.intel_id == intel.id
        ).delete()
    
    db.commit()
    db.refresh(intel)
    return intel

@router.get("/intel/{intel_id}/attachment/{filename}", tags=["Intel"])
def download_attachment(
    intel_id: uuid.UUID,
    filename: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    intel = db.query(models.ThreatIntel).filter(models.ThreatIntel.id == intel_id).first()
    if not intel or not intel.attachments:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    # Find the requested file in the attachments array
    file_path = None
    for att in intel.attachments:
        if att.get("filename") == filename:
            file_path = att.get("path")
            break
            
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on disk.")

    return FileResponse(path=file_path, filename=filename)

@router.post("/intel/{intel_id}/attachment", tags=["Intel"])
def upload_attachment(
    intel_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """ACSAC uploads attachments to an existing Intel."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can upload attachments.")

    intel = db.query(models.ThreatIntel).filter(models.ThreatIntel.id == intel_id).first()
    if not intel:
        raise HTTPException(status_code=404, detail="Intelligence entry not found.")

    import shutil
    new_attachments = []
    
    for file in files:
        final_path = os.path.join(UPLOAD_DIR, f"{intel.id}_{file.filename}")
        with open(final_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        new_attachments.append({
            "filename": file.filename,
            "path": final_path
        })

    # Append to existing attachments
    existing_attachments = intel.attachments or []
    intel.attachments = existing_attachments + new_attachments
    
    # SQLAlchemy requires assigning a new object to JSONB to detect changes, or use flag_modified
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(intel, "attachments")
    
    db.commit()
    db.refresh(intel)
    return {"status": "success", "uploaded": len(files)}

# ── Dashboards ───────────────────────────────────────────────────────────

@router.get("/intel/acsac", response_model=List[schemas.ThreatIntelResponse], tags=["Dashboards"])
def get_acsac_dashboard(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Returns all intel with full member status visibility for ACSAC."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    return db.query(models.ThreatIntel).order_by(models.ThreatIntel.published_at.desc()).all()


@router.get("/intel/member", tags=["Dashboards"])
def get_member_dashboard(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """
    Returns intel for a specific member, including ONLY their status 
    and responses (Tenant Isolation).
    """
    if user.organization.org_type != models.OrgType.member:
        raise HTTPException(status_code=403, detail="Not a member organization")

    # Fetch all intel that has a status record for this member
    intel_statuses = db.query(models.OrgIntelStatus)\
        .filter(models.OrgIntelStatus.org_id == user.org_id)\
        .all()
    
    result = []
    for st in intel_statuses:
        intel = st.intel
        # Serialize carefully to enforce isolation: only include this member's responses
        intel_dict = {
            "id": intel.id,
            "type": intel.type,
            "status": intel.status,
            "title": intel.title,
            "case_id": intel.case_id,
            "description": intel.description,
            "threat_data": intel.threat_data,
            "tlp": intel.tlp,
            "confidence": intel.confidence,
            "tags": intel.tags,
            "classification": intel.classification,
            "category": intel.category or "General",
            "published_at": intel.published_at,
            "has_sla": intel.has_sla,
            "sla_value": intel.sla_value,
            "sla_unit": intel.sla_unit,
            "target_org_id": intel.target_org_id,
            "creator_org_id": intel.creator_org_id,
            "created_by_id": intel.created_by_id,
            "attachments": intel.attachments,
            "target_org": schemas.OrganizationResponse.model_validate(intel.target_org) if intel.target_org else None,
            "creator_org": schemas.OrganizationResponse.model_validate(intel.creator_org),
            "created_by": schemas.UserResponse.model_validate(intel.created_by),
            "my_status": schemas.OrgIntelStatusResponse.model_validate(st),
            "my_responses": [
                schemas.InvestigationResponseModel.model_validate(r) 
                for r in intel.responses if r.org_id == user.org_id
            ]
        }
        result.append(intel_dict)
        
    # Sort newest first
    result.sort(key=lambda x: x['published_at'], reverse=True)
    return result

# ── Member Workflows ─────────────────────────────────────────────────────

@router.post("/intel/{intel_id}/acknowledge", tags=["Workflows"])
def acknowledge_intel(
    intel_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Member acknowledges an alert."""
    if user.organization.org_type != models.OrgType.member:
        raise HTTPException(status_code=403, detail="Only members can acknowledge.")

    status = db.query(models.OrgIntelStatus).filter(
        models.OrgIntelStatus.intel_id == intel_id,
        models.OrgIntelStatus.org_id == user.org_id
    ).first()
    
    if not status:
        raise HTTPException(status_code=404, detail="Intel not found or not assigned to org.")
        
    if status.status == models.MemberIntelStatus.unacknowledged:
        status.status = models.MemberIntelStatus.acknowledged
        status.acknowledged_at = datetime.now(timezone.utc)
        
        intel = status.intel
        if intel.type == models.IntelType.advisory:
            all_statuses = db.query(models.OrgIntelStatus).filter(
                models.OrgIntelStatus.intel_id == intel_id
            ).all()
            all_acknowledged_or_beyond = all(
                st.status != models.MemberIntelStatus.unacknowledged 
                for st in all_statuses
            )
            if all_acknowledged_or_beyond and intel.status == models.IntelStatus.open:
                intel.status = models.IntelStatus.closed

        db.commit()
    
    return {"message": "Acknowledged successfully."}


@router.post("/intel/{intel_id}/respond", tags=["Workflows"])
def submit_investigation_response(
    intel_id: uuid.UUID,
    payload: schemas.InvestigationResponseCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Member submits an investigation response."""
    if user.organization.org_type != models.OrgType.member:
        raise HTTPException(status_code=403, detail="Only members can respond.")

    status = db.query(models.OrgIntelStatus).filter(
        models.OrgIntelStatus.intel_id == intel_id,
        models.OrgIntelStatus.org_id == user.org_id
    ).first()
    
    if not status:
        raise HTTPException(status_code=404, detail="Intel not found or not assigned to org.")

    intel = status.intel
    sla_met = None
    sla_exceeded_by = None
    now = datetime.now(timezone.utc)
    
    if intel.has_sla:
        if intel.sla_value == 0:
            sla_met = False
            sla_exceeded_by = "0 days (SLA of 0 always missed)"
        else:
            days = 0
            if intel.sla_unit == 'day':
                days = intel.sla_value
            elif intel.sla_unit == 'week':
                days = intel.sla_value * 7
            elif intel.sla_unit == 'month':
                days = intel.sla_value * 30
            
            from datetime import timedelta
            deadline = intel.published_at + timedelta(days=days)
            
            if now <= deadline:
                sla_met = True
            else:
                sla_met = False
                diff = now - deadline
                
                # format diff nicely
                total_seconds = int(diff.total_seconds())
                d = total_seconds // 86400
                h = (total_seconds % 86400) // 3600
                m = (total_seconds % 3600) // 60
                
                parts = []
                if d > 0: parts.append(f"{d}d")
                if h > 0: parts.append(f"{h}h")
                if m > 0: parts.append(f"{m}m")
                if not parts:
                    parts.append(f"{total_seconds}s")
                
                sla_exceeded_by = " ".join(parts)

    # Create response
    resp = models.InvestigationResponse(
        **payload.model_dump(),
        intel_id=intel_id,
        org_id=user.org_id,
        submitted_by_id=user.id,
        sla_met=sla_met,
        sla_exceeded_by=sla_exceeded_by
    )
    db.add(resp)

    # Update status to responded
    status.status = models.MemberIntelStatus.responded
    status.responded_at = now
    
    # Check if all targeted members have responded
    all_statuses = db.query(models.OrgIntelStatus).filter(
        models.OrgIntelStatus.intel_id == intel_id
    ).all()
    all_responded = all(
        st.status in [models.MemberIntelStatus.responded, models.MemberIntelStatus.updated, models.MemberIntelStatus.closed] 
        for st in all_statuses
    )
    if all_responded and intel.status == models.IntelStatus.open:
        intel.status = models.IntelStatus.closed
    
    db.commit()
    db.refresh(resp)
    return {"message": "Response submitted successfully.", "response_id": str(resp.id)}

@router.put("/intel/{intel_id}/responses/{response_id}", tags=["Workflows"])
def update_investigation_response(
    intel_id: uuid.UUID,
    response_id: uuid.UUID,
    payload: schemas.InvestigationResponseCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Member updates an existing investigation response."""
    if user.organization.org_type != models.OrgType.member:
        raise HTTPException(status_code=403, detail="Only members can update responses.")

    resp = db.query(models.InvestigationResponse).filter(
        models.InvestigationResponse.id == response_id,
        models.InvestigationResponse.intel_id == intel_id,
        models.InvestigationResponse.org_id == user.org_id
    ).first()
    
    if not resp:
        raise HTTPException(status_code=404, detail="Response not found.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(resp, key, value)
        
    status = db.query(models.OrgIntelStatus).filter(
        models.OrgIntelStatus.intel_id == intel_id,
        models.OrgIntelStatus.org_id == user.org_id
    ).first()
    if status:
        status.status = models.MemberIntelStatus.updated
        status.responded_at = datetime.now(timezone.utc)
        
        # Check if all targeted members have responded
        all_statuses = db.query(models.OrgIntelStatus).filter(
            models.OrgIntelStatus.intel_id == intel_id
        ).all()
        all_responded = all(
            st.status in [models.MemberIntelStatus.responded, models.MemberIntelStatus.updated, models.MemberIntelStatus.closed] 
            for st in all_statuses
        )
        intel = db.query(models.ThreatIntel).filter(models.ThreatIntel.id == intel_id).first()
        if intel and all_responded and intel.status == models.IntelStatus.open:
            intel.status = models.IntelStatus.closed
        
    db.commit()
    db.refresh(resp)
    return {"message": "Response updated successfully.", "response_id": str(resp.id)}

@router.post("/intel/{intel_id}/responses/{response_id}/evidence", tags=["Workflows"])
def upload_investigation_evidence(
    intel_id: uuid.UUID,
    response_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    if user.organization.org_type != models.OrgType.member:
        raise HTTPException(status_code=403, detail="Only members can upload evidence.")
        
    resp = db.query(models.InvestigationResponse).filter(
        models.InvestigationResponse.id == response_id,
        models.InvestigationResponse.intel_id == intel_id,
        models.InvestigationResponse.org_id == user.org_id
    ).first()
    
    if not resp:
        raise HTTPException(status_code=404, detail="Response not found.")
        
    import shutil
    new_files = list(resp.evidence_files) if resp.evidence_files else []
    
    for file in files:
        final_path = os.path.join(UPLOAD_DIR, f"{resp.id}_{file.filename}")
        with open(final_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        new_files.append({
            "filename": file.filename,
            "path": final_path
        })
        
    resp.evidence_files = new_files
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(resp, "evidence_files")
    
    db.commit()
    db.refresh(resp)
    return {"message": "Evidence uploaded successfully.", "evidence_files": resp.evidence_files}

@router.get("/intel/{intel_id}/responses/{response_id}/evidence/{filename}", tags=["Workflows"])
def download_investigation_evidence(
    intel_id: uuid.UUID,
    response_id: uuid.UUID,
    filename: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    resp = db.query(models.InvestigationResponse).filter(
        models.InvestigationResponse.id == response_id,
        models.InvestigationResponse.intel_id == intel_id
    ).first()
    
    if not resp or not resp.evidence_files:
        raise HTTPException(status_code=404, detail="Response or evidence not found.")
        
    file_path = None
    for att in resp.evidence_files:
        if att.get("filename") == filename:
            file_path = att.get("path")
            break
            
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on disk.")
        
    return FileResponse(path=file_path, filename=filename)

# ── ACSAC Workflows ─────────────────────────────────────────────────────

@router.post("/intel/{intel_id}/responses/{response_id}/review", tags=["Workflows"])
def review_response(
    intel_id: uuid.UUID,
    response_id: uuid.UUID,
    status: schemas.ResponseReviewStatus = Query(...),
    comments: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """ACSAC reviews a member's investigation response."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can review responses.")

    resp = db.query(models.InvestigationResponse).filter(
        models.InvestigationResponse.id == response_id,
        models.InvestigationResponse.intel_id == intel_id
    ).first()

    if not resp:
        raise HTTPException(status_code=404, detail="Response not found.")

    resp.review_status = status
    if comments:
        resp.reviewer_comments = comments
        
    if status == schemas.ResponseReviewStatus.rejected:
        member_status = db.query(models.OrgIntelStatus).filter(
            models.OrgIntelStatus.intel_id == intel_id,
            models.OrgIntelStatus.org_id == resp.org_id
        ).first()
        if member_status:
            member_status.status = models.MemberIntelStatus.unacknowledged
    
    db.commit()
    return {"message": f"Response marked as {status.value}"}

@router.post("/intel/{intel_id}/responses/{response_id}/clarification", tags=["Workflows"])
def add_clarification_message(
    intel_id: uuid.UUID,
    response_id: uuid.UUID,
    payload: schemas.ClarificationCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Add a clarification message to a member's investigation response."""
    resp = db.query(models.InvestigationResponse).filter(
        models.InvestigationResponse.id == response_id,
        models.InvestigationResponse.intel_id == intel_id
    ).first()

    if not resp:
        raise HTTPException(status_code=404, detail="Response not found.")

    if user.organization.org_type != models.OrgType.acsac and user.org_id != resp.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to participate in this clarification thread.")

    new_msg = {
        "id": str(uuid.uuid4()),
        "sender_name": user.name,
        "sender_org": user.organization.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "message": payload.message
    }
    thread = list(resp.clarification_thread) if resp.clarification_thread else []
    thread.append(new_msg)
    resp.clarification_thread = thread
    flag_modified(resp, "clarification_thread")
    db.commit()
    return {"message": "Clarification message added.", "clarification_thread": thread}

@router.post("/intel/{intel_id}/responses/{response_id}/clarification/close", tags=["Workflows"])
def close_response_clarification(
    intel_id: uuid.UUID,
    response_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Analyst closes a member's response clarification thread."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can close clarification threads.")
    resp = db.query(models.InvestigationResponse).filter(models.InvestigationResponse.id == response_id).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Response not found.")
    resp.clarification_is_open = False
    db.commit()
    return {"message": "Thread closed."}

@router.post("/intel/{intel_id}/status/{status_id}/clarification", tags=["Workflows"])
def add_status_clarification_message(
    intel_id: uuid.UUID,
    status_id: uuid.UUID,
    payload: schemas.ClarificationCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Add a clarification message to an Alert or Advisory member status thread."""
    st = db.query(models.OrgIntelStatus).filter(
        models.OrgIntelStatus.id == status_id,
        models.OrgIntelStatus.intel_id == intel_id
    ).first()

    if not st:
        raise HTTPException(status_code=404, detail="Status not found.")

    if user.organization.org_type != models.OrgType.acsac and user.org_id != st.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to participate in this clarification thread.")

    new_msg = {
        "id": str(uuid.uuid4()),
        "sender_name": user.name,
        "sender_org": user.organization.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "message": payload.message
    }
    thread = list(st.clarification_thread) if st.clarification_thread else []
    thread.append(new_msg)
    st.clarification_thread = thread
    flag_modified(st, "clarification_thread")
    db.commit()
    return {"message": "Clarification message added.", "clarification_thread": thread}

@router.post("/intel/{intel_id}/status/{status_id}/clarification/close", tags=["Workflows"])
def close_status_clarification(
    intel_id: uuid.UUID,
    status_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Analyst closes an org status clarification thread."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can close clarification threads.")
    st = db.query(models.OrgIntelStatus).filter(models.OrgIntelStatus.id == status_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Status not found.")
    st.clarification_is_open = False
    db.commit()
    return {"message": "Thread closed."}

# ─────────────────────────────────────────────────────────────────────────────
# ISAC PEER SHARING
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/isac/next-case-id", tags=["ISAC"])
def get_next_isac_case_id(db: Session = Depends(get_db)):
    """Generate the next auto-incrementing case ID for ISAC submissions."""
    current_year = datetime.now(timezone.utc).year
    prefix = f"INS-{current_year}-"
    
    # Query all case_ids that start with the prefix
    submissions = db.query(models.IsacSubmission.case_id).filter(
        models.IsacSubmission.case_id.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for (case_id,) in submissions:
        parts = case_id.split("-")
        if len(parts) == 3 and parts[2].isdigit():
            num = int(parts[2])
            if num > max_num:
                max_num = num
                
    next_num = max_num + 1
    next_case_id = f"{prefix}{next_num:05d}"
    
    return {"next_case_id": next_case_id}

@router.get("/isac/submissions", response_model=List[schemas.IsacSubmissionResponse], tags=["ISAC"])
def get_isac_submissions(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Returns ISAC submissions for peer sharing with draft and target member filtering."""
    submissions = db.query(models.IsacSubmission).order_by(models.IsacSubmission.created_at.desc()).all()
    filtered = []
    for sub in submissions:
        if sub.status == 'DRAFT' and sub.created_by_id != user.id and sub.org_id != user.org_id:
            continue
        if sub.target_org_id is not None and sub.target_org_id != user.org_id and sub.org_id != user.org_id and user.organization.org_type != models.OrgType.acsac:
            continue
        filtered.append(sub)
    return filtered

@router.get("/isac/export/csv", tags=["ISAC"])
def export_isac_csv(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Export ISAC peer sharing data to CSV."""
    submissions = db.query(models.IsacSubmission).order_by(models.IsacSubmission.created_at.desc()).all()
    filtered = []
    for sub in submissions:
        if sub.status == 'DRAFT' and sub.created_by_id != user.id and sub.org_id != user.org_id:
            continue
        if sub.target_org_id is not None and sub.target_org_id != user.org_id and sub.org_id != user.org_id and user.organization.org_type != models.OrgType.acsac:
            continue
        filtered.append(sub)
    submissions = filtered
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Insight ID", "Submission Type", "Title", "Target Member", "Status", "Confidence Level", "Description", "Indicators", 
        "Sighting Date (UTC)", "Submitted At (UTC)", "TLP", "Tags", 
        "Organization Name", "Submitted By"
    ])
    
    for sub in submissions:
        tags_str = ", ".join(sub.tags) if sub.tags else ""
        org_name = sub.organization.name if sub.organization else ""
        user_name = sub.created_by.email if sub.created_by else ""
        target_name = (sub.target_org.name if sub.target_org.name != "Platform" else "ACSAC") if sub.target_org else "All Member"
        
        writer.writerow([
            sub.case_id,
            sub.submission_type.value,
            sub.title or "",
            target_name,
            sub.status or "OPEN",
            sub.confidence_level or "",
            sub.description,
            sub.indicators or "",
            sub.sighting_datetime.isoformat(),
            sub.created_at.isoformat(),
            sub.tlp.value,
            tags_str,
            org_name,
            user_name
        ])
            
    output.seek(0)
    
    return StreamingResponse(
        output, 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=isac_peer_sharing_report.csv"}
    )

@router.post("/isac/submissions/{submission_id}/escalate", response_model=schemas.ThreatIntelResponse, tags=["ISAC"])
def escalate_isac_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Escalates an ISAC submission into a pending review Alert."""
    if user.role not in [models.UserRole.admin, models.UserRole.analyst]:
        raise HTTPException(status_code=403, detail="Only ACSAC admin/analyst can escalate.")
        
    db_submission = db.query(models.IsacSubmission).filter(models.IsacSubmission.id == submission_id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    current_year = datetime.now(timezone.utc).year
    prefix = f"A&A-{current_year}-"
    intels = db.query(models.ThreatIntel.case_id).filter(
        models.ThreatIntel.case_id.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for (cid,) in intels:
        parts = cid.split("-")
        if len(parts) >= 2 and parts[-1].isdigit():
            num = int(parts[-1])
            if num > max_num:
                max_num = num
                
    next_num = max_num + 1
    next_case_id = f"{prefix}{next_num:05d}"
    
    confidence_map = {
        "High": models.ConfidenceLevel.high,
        "Medium": models.ConfidenceLevel.medium,
        "Low": models.ConfidenceLevel.low
    }
    conf_level = confidence_map.get(db_submission.confidence_level, models.ConfidenceLevel.medium)
    
    draft_intel = models.ThreatIntel(
        type=models.IntelType.alert,
        status=models.IntelStatus.draft,
        title=f"[ISAC Insight] {db_submission.title}" if db_submission.title else "Untitled ISAC Insight",
        case_id=next_case_id,
        description=db_submission.description,
        threat_data=db_submission.indicators if db_submission.indicators else "No indicators provided.",
        tlp=db_submission.tlp,
        confidence=conf_level,
        classification="Shared Insights",
        creator_org_id=user.org_id,
        created_by_id=user.id,
        has_sla=False
    )
    db.add(draft_intel)
    
    db_submission.is_escalated = True
    
    db.commit()
    db.refresh(draft_intel)
    return draft_intel

@router.post("/isac/submissions", response_model=schemas.IsacSubmissionResponse, tags=["ISAC"])
def create_isac_submission(
    submission: schemas.IsacSubmissionCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Creates a new ISAC submission."""
    db_submission = models.IsacSubmission(
        **submission.model_dump(),
        org_id=user.org_id,
        created_by_id=user.id
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    return db_submission

@router.put("/isac/submissions/{id}", response_model=schemas.IsacSubmissionResponse, tags=["ISAC"])
def update_isac_submission(
    id: uuid.UUID,
    submission_update: schemas.IsacSubmissionUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Update an existing ISAC submission (only by the creator)."""
    db_submission = db.query(models.IsacSubmission).filter(models.IsacSubmission.id == id).first()
    if not db_submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    if db_submission.created_by_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this submission")
        
    old_status = db_submission.status
    update_data = submission_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_submission, key, value)
        
    db.commit()
    db.refresh(db_submission)

    return db_submission

@router.post("/isac/submissions/{submission_id}/comments", response_model=schemas.IsacCommentResponse, tags=["ISAC"])
def create_isac_comment(
    submission_id: uuid.UUID,
    comment: schemas.IsacCommentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Adds a comment to an ISAC submission."""
    sub = db.query(models.IsacSubmission).filter(models.IsacSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    db_comment = models.IsacComment(
        **comment.model_dump(),
        submission_id=submission_id,
        org_id=user.org_id,
        created_by_id=user.id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

class ClarificationMessage(BaseModel):
    message: str


@router.post("/isac/submissions/{submission_id}/clarification/close", tags=["ISAC"])
def close_isac_clarification(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Analyst closes an ISAC clarification thread."""
    if current_user.organization.org_type != 'ACSAC':
        raise HTTPException(status_code=403, detail="Only ACSAC can close clarification threads.")
    
    sub = db.query(models.IsacSubmission).filter(models.IsacSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")
    
    sub.status = "CLOSED"
    db.commit()
    return {"message": "Thread closed."}


@router.post("/isac/submissions/{submission_id}/clarification", tags=["ISAC"])
def add_isac_clarification(
    submission_id: uuid.UUID,
    payload: ClarificationMessage,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    sub = db.query(models.IsacSubmission).filter(models.IsacSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    new_msg = {
        "sender_id": str(user.id),
        "sender_name": user.name,
        "sender_org": user.organization.name,
        "message": payload.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    current_thread = sub.clarification_thread or []
    current_thread.append(new_msg)
    
    # Must assign a new list or use flag_modified for JSONB updates to be detected
    sub.clarification_thread = list(current_thread)
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(sub, "clarification_thread")
    
    db.commit()
    return {"status": "ok"}

@router.get("/analytics/dashboard", tags=["Analytics"])
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Returns aggregated data for the analytics dashboard."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC users can view analytics.")

    # 1. Intel Type Distribution
    intel_types = db.query(models.ThreatIntel.type, func.count(models.ThreatIntel.id)).group_by(models.ThreatIntel.type).all()
    intel_type_data = [{"name": t.value if hasattr(t, 'value') else str(t), "value": c} for t, c in intel_types]

    # 2. SLA Compliance
    sla_data = []
    compliant_count = db.query(models.InvestigationResponse).filter(models.InvestigationResponse.sla_met == True).count()
    non_compliant_count = db.query(models.InvestigationResponse).filter(models.InvestigationResponse.sla_met == False).count()
    if compliant_count or non_compliant_count:
        sla_data = [
            {"name": "Compliant", "value": compliant_count},
            {"name": "Non-compliant", "value": non_compliant_count}
        ]

    # 3. Intel Volume Over Time (grouped by month)
    all_intel = db.query(models.ThreatIntel.published_at).all()
    volume_dict = {}
    for (pub_date,) in all_intel:
        if pub_date:
            month_str = pub_date.strftime("%Y-%m")
            volume_dict[month_str] = volume_dict.get(month_str, 0) + 1
    
    volume_data = [{"date": k, "count": v} for k, v in sorted(volume_dict.items())]

    # 4. Status Distribution: Alerts
    alert_status = db.query(models.ThreatIntel.status, func.count(models.ThreatIntel.id)).filter(models.ThreatIntel.type == models.IntelType.alert).group_by(models.ThreatIntel.status).all()
    alert_status_data = [{"name": s.value if hasattr(s, 'value') else str(s), "value": c} for s, c in alert_status]

    # 5. Status Distribution: Advisories
    advisory_status = db.query(models.ThreatIntel.status, func.count(models.ThreatIntel.id)).filter(models.ThreatIntel.type == models.IntelType.advisory).group_by(models.ThreatIntel.status).all()
    advisory_status_data = [{"name": s.value if hasattr(s, 'value') else str(s), "value": c} for s, c in advisory_status]

    return {
        "intelTypeDistribution": intel_type_data,
        "slaCompliance": sla_data,
        "volumeOverTime": volume_data,
        "alertStatusDistribution": alert_status_data,
        "advisoryStatusDistribution": advisory_status_data
    }

# ─────────────────────────────────────────────────────────────────────────────
# Incident Reporting
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/incidents", response_model=List[schemas.IncidentReportResponse], tags=["Incident Reporting"])
def get_incidents(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Get incident reports. ACSAC sees all, others see their org's reports."""
    query = db.query(models.IncidentReport)
    if user.organization.org_type != models.OrgType.acsac:
        query = query.filter(models.IncidentReport.org_id == user.org_id)
    return query.order_by(models.IncidentReport.created_at.desc()).all()

@router.post("/incidents", response_model=schemas.IncidentReportResponse, tags=["Incident Reporting"])
def create_incident(
    incident: schemas.IncidentReportCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Create a new incident report."""
    def generate_case_id():
        year_str = datetime.now(timezone.utc).strftime("%y")
        random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"INC-{year_str}-{random_chars}"

    case_id = generate_case_id()
    while db.query(models.IncidentReport).filter(models.IncidentReport.case_id == case_id).first():
        case_id = generate_case_id()

    db_incident = models.IncidentReport(
        **incident.model_dump(),
        case_id=case_id,
        org_id=user.org_id,
        created_by_id=user.id
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

@router.put("/incidents/{incident_id}", response_model=schemas.IncidentReportResponse, tags=["Incident Reporting"])
def update_incident(
    incident_id: uuid.UUID,
    incident_update: schemas.IncidentReportCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Update an existing incident report."""
    incident = db.query(models.IncidentReport).filter(models.IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    if user.organization.org_type != models.OrgType.acsac and incident.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this incident.")
        
    for key, value in incident_update.model_dump().items():
        setattr(incident, key, value)
        
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(incident, "form_data")
    db.commit()
    db.refresh(incident)
    return incident

class IncidentStatusUpdate(schemas.BaseModel):
    status: str

@router.patch("/incidents/{incident_id}/status", tags=["Incident Reporting"])
def update_incident_status(
    incident_id: uuid.UUID,
    status_update: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Update incident status (ACSAC only)."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Not authorized to change status.")
        
    incident = db.query(models.IncidentReport).filter(models.IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    incident.status = status_update.status
    db.commit()
    db.refresh(incident)
    return incident

@router.post("/incidents/{incident_id}/attachment", tags=["Incident Reporting"])
def upload_incident_attachment(
    incident_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Upload attachments to an existing Incident."""
    incident = db.query(models.IncidentReport).filter(models.IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    if user.organization.org_type != models.OrgType.acsac and incident.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this incident.")

    import shutil
    new_attachments = []
    
    for file in files:
        final_path = os.path.join(UPLOAD_DIR, f"inc_{incident.id}_{file.filename}")
        with open(final_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        new_attachments.append({
            "filename": file.filename,
            "path": final_path
        })

    # Append to existing attachments
    existing_attachments = incident.attachments or []
    incident.attachments = existing_attachments + new_attachments
    
    # SQLAlchemy requires assigning a new object to JSONB to detect changes, or use flag_modified
    from sqlalchemy.orm.attributes import flag_modified    
    flag_modified(incident, "attachments")
    db.commit()
    
    return {"message": "Attachment(s) uploaded successfully", "attachments": new_attachments}

@router.delete("/incidents/{incident_id}/attachment/{filename}", tags=["Incident Reporting"])
def delete_incident_attachment(
    incident_id: uuid.UUID,
    filename: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Delete an attachment from an existing Incident."""
    incident = db.query(models.IncidentReport).filter(models.IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    if user.organization.org_type != models.OrgType.acsac and incident.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this incident.")
        
    attachments = incident.attachments or []
    new_attachments = [att for att in attachments if att['filename'] != filename]
    
    if len(attachments) == len(new_attachments):
        raise HTTPException(status_code=404, detail="Attachment not found.")
        
    incident.attachments = new_attachments
    flag_modified(incident, "attachments")
    db.commit()
    
    file_path = os.path.join(UPLOAD_DIR, f"inc_{incident.id}_{filename}")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass # Ignore if already deleted from disk
            
    return {"message": "Attachment deleted successfully"}

@router.get("/incidents/{incident_id}/attachment/{filename}", tags=["Incident Reporting"])
def download_incident_attachment(
    incident_id: uuid.UUID,
    filename: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Download an attachment from an Incident."""
    incident = db.query(models.IncidentReport).filter(models.IncidentReport.id == incident_id).first()
    if not incident or not incident.attachments:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    if user.organization.org_type != models.OrgType.acsac and incident.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this incident.")

    # Find the requested file in the attachments array
    file_path = None
    for att in incident.attachments:
        if att["filename"] == filename:
            file_path = att["path"]
            break
            
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk.")
        
    return FileResponse(path=file_path, filename=filename)

@router.post("/incidents/{incident_id}/clarification", tags=["Incident Reporting"])
def add_incident_clarification(
    incident_id: uuid.UUID,
    payload: ClarificationMessage,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Add a clarification message to an incident report."""
    incident = db.query(models.IncidentReport).filter(models.IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    if user.organization.org_type != models.OrgType.acsac and incident.org_id != user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to participate in this clarification thread.")
        
    if not incident.clarification_is_open:
        raise HTTPException(status_code=400, detail="Clarification thread is closed.")

    msg_obj = {
        "sender_id": str(user.id),
        "sender_name": user.name,
        "sender_org": user.organization.name,
        "message": payload.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    current_thread = incident.clarification_thread or []
    current_thread.append(msg_obj)

    incident.clarification_thread = list(current_thread)
    flag_modified(incident, "clarification_thread")
    db.commit()

    return {"message": "Clarification message added.", "clarification_thread": incident.clarification_thread}

@router.post("/incidents/{incident_id}/clarification/close", tags=["Incident Reporting"])
def close_incident_clarification(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Analyst closes an incident clarification thread."""
    if user.organization.org_type != models.OrgType.acsac:
        raise HTTPException(status_code=403, detail="Only ACSAC can close clarification threads.")

    incident = db.query(models.IncidentReport).filter(models.IncidentReport.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    if incident.organization.org_type == models.OrgType.acsac and user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only Admin can close clarification threads for incidents reported by the platform.")

    incident.clarification_is_open = False
    db.commit()
    return {"message": "Clarification thread closed."}

app.include_router(router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "operational", "version": "2.0.0"}
