"""
models.py
---------
SQLAlchemy ORM models for the Threat Intelligence platform.
Updated for Phase 2 Multi-Tenancy (ACSAC and Member Orgs).
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Date, Enum as SAEnum, String, Text, ForeignKey, UniqueConstraint, Boolean, Integer
from sqlalchemy.dialects.postgresql import ARRAY, UUID, JSONB
from sqlalchemy.orm import relationship

from database import Base

# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────

class OrgType(str, enum.Enum):
    acsac  = "ACSAC"
    member = "MEMBER"

class UserRole(str, enum.Enum):
    admin   = "ADMIN"
    analyst = "ANALYST"

class IntelType(str, enum.Enum):
    alert    = "Alert"
    advisory = "Advisory"
    info_note = "Information Note/ Bulletin"

class IntelStatus(str, enum.Enum):
    open   = "OPEN"
    closed = "CLOSED"
    draft  = "DRAFT"
    pending_review = "PENDING_REVIEW"
    approved = "APPROVED"

class TLPLevel(str, enum.Enum):
    red          = "Red"
    amber_strict = "Amber+Strict"
    amber        = "Amber"
    green        = "Green"
    clear        = "Clear"

class ConfidenceLevel(str, enum.Enum):
    low    = "Low"
    medium = "Medium"
    high   = "High"

class MemberIntelStatus(str, enum.Enum):
    unacknowledged = "UNACKNOWLEDGED"
    acknowledged   = "ACKNOWLEDGED"
    investigating  = "INVESTIGATING"
    responded      = "RESPONDED"
    updated        = "UPDATED"
    closed         = "CLOSED"

class ResponseReviewStatus(str, enum.Enum):
    pending  = "PENDING"
    accepted = "ACCEPTED"
    rejected = "REJECTED"
    
class IsacSubmissionType(str, enum.Enum):
    ioc_hit = "IOC Hit"
    threat_hunt = "Threat Hunt Finding"
    attack_artefact = "Attack Artefact"
    ttp = "TTP/Adversary Behaviour"
    cyber_event = "Cyber Event"
    recon_intrusion = "Recon/Intrusion Attempt"



# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    org_type = Column(SAEnum(OrgType, name="org_type_enum", create_type=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="organization")


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="user_role_enum", create_type=True), nullable=False)

    organization = relationship("Organization", back_populates="users")


class ThreatIntel(Base):
    __tablename__ = "threat_intel"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core Classification
    type = Column(SAEnum(IntelType, name="intel_type_enum", create_type=True), nullable=False)
    status = Column(SAEnum(IntelStatus, name="intel_status_enum", create_type=True), nullable=False, default=IntelStatus.open)
    title = Column(String(255), nullable=False)
    case_id = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    threat_data = Column(Text, nullable=False)

    # Metadata
    tlp = Column(SAEnum(TLPLevel, name="tlp_level_enum", create_type=True), nullable=False)
    confidence = Column(SAEnum(ConfidenceLevel, name="confidence_level_enum", create_type=True), nullable=False)

    # Attachments
    attachments = Column(JSONB, nullable=False, default=list)

    # Arrays
    tags = Column(ARRAY(Text), nullable=False, default=list)

    classification = Column(String(100), nullable=False, default="National")
    category = Column(String(100), nullable=True, default="General")
    has_sla = Column(Boolean, nullable=False, default=False)
    sla_value = Column(Integer, nullable=True)
    sla_unit = Column(String(20), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Targeting
    target_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)

    # Creator (ACSAC Admin typically)
    creator_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    target_org = relationship("Organization", foreign_keys=[target_org_id])
    creator_org = relationship("Organization", foreign_keys=[creator_org_id])
    created_by = relationship("User")
    member_statuses = relationship("OrgIntelStatus", back_populates="intel")
    responses = relationship("InvestigationResponse", back_populates="intel")


class OrgIntelStatus(Base):
    """Tracks the lifecycle status of an Alert per Member Organization."""
    __tablename__ = "org_intel_status"
    __table_args__ = (UniqueConstraint("intel_id", "org_id", name="uq_org_intel"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    intel_id = Column(UUID(as_uuid=True), ForeignKey("threat_intel.id"), nullable=False)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    status = Column(SAEnum(MemberIntelStatus, name="member_intel_status_enum", create_type=True), nullable=False, default=MemberIntelStatus.unacknowledged)

    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    clarification_thread = Column(JSONB, nullable=False, default=list)
    clarification_is_open = Column(Boolean, nullable=False, default=True)

    intel = relationship("ThreatIntel", back_populates="member_statuses")
    organization = relationship("Organization")


class InvestigationResponse(Base):
    """A member's formal response/investigation to an Alert."""
    __tablename__ = "investigation_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    intel_id = Column(UUID(as_uuid=True), ForeignKey("threat_intel.id"), nullable=False)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    submitted_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    findings = Column(Text, nullable=True)
    affected_assets = Column(ARRAY(Text), nullable=True, default=list)
    evidence = Column(Text, nullable=True)
    evidence_files = Column(JSONB, nullable=False, default=list)
    mitigation_measures = Column(ARRAY(Text), nullable=True, default=list)

    # Alert-specific fields
    cii_sector = Column(String(255), nullable=True)
    sector_lead_name = Column(String(255), nullable=True)
    affected_member_status = Column(String(255), nullable=True)
    affected_environment = Column(String(255), nullable=True)
    delay_reason = Column(Text, nullable=True)
    expected_verification_date = Column(Date, nullable=True)
    patch_status = Column(String(255), nullable=True)
    mitigation_measure_if_not_patched = Column(Text, nullable=True)
    ioc_traffic_direction = Column(String(255), nullable=True)
    follow_up_action = Column(Text, nullable=True)
    other_type_of_alert = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    review_status = Column(SAEnum(ResponseReviewStatus, name="response_review_status_enum", create_type=True), nullable=False, default=ResponseReviewStatus.pending)
    reviewer_comments = Column(Text, nullable=True)
    clarification_thread = Column(JSONB, nullable=False, default=list)
    clarification_is_open = Column(Boolean, nullable=False, default=True)
    sla_met = Column(Boolean, nullable=True)
    sla_exceeded_by = Column(String(255), nullable=True)

    intel = relationship("ThreatIntel", back_populates="responses")
    organization = relationship("Organization")
    submitted_by = relationship("User")

class IsacSubmission(Base):
    """Peer sharing submission (ISAC style)"""
    __tablename__ = "isac_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(String(50), nullable=False, unique=True, index=True)
    submission_type = Column(SAEnum(IsacSubmissionType, name="isac_submission_type_enum", create_type=True), nullable=False)
    status = Column(String(50), nullable=False, default="OPEN")
    title = Column(String(255), nullable=True)
    confidence_level = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    indicators = Column(Text, nullable=True) # Text area for raw indicators
    sighting_datetime = Column(DateTime(timezone=True), nullable=False)
    
    tlp = Column(SAEnum(TLPLevel, name="tlp_level_enum", create_type=False), nullable=False)
    tags = Column(ARRAY(Text), nullable=False, default=list)
    clarification_thread = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    target_org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_escalated = Column(Boolean, nullable=False, default=False)

    target_org = relationship("Organization", foreign_keys=[target_org_id])
    organization = relationship("Organization", foreign_keys=[org_id])
    created_by = relationship("User")
    comments = relationship("IsacComment", back_populates="submission", cascade="all, delete-orphan", order_by="IsacComment.created_at")

class IsacComment(Base):
    """Comments on an ISAC submission"""
    __tablename__ = "isac_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("isac_submissions.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    organization = relationship("Organization")
    created_by = relationship("User")
    submission = relationship("IsacSubmission", back_populates="comments")

class IncidentReport(Base):
    """Member incident reports"""
    __tablename__ = "incident_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(String(50), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    incident_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), nullable=False, default="Open")
    tlp = Column(SAEnum(TLPLevel, name="tlp_level_enum", create_type=False), nullable=False)
    tags = Column(ARRAY(Text), nullable=False, default=list)
    form_data = Column(JSONB, nullable=True) # Added for flexible form storage
    attachments = Column(JSONB, nullable=True, default=list)
    is_draft = Column(Boolean, nullable=False, default=False)
    clarification_thread = Column(JSONB, nullable=False, default=list)
    clarification_is_open = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    organization = relationship("Organization")
    created_by = relationship("User")
