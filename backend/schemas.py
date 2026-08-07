"""
schemas.py
----------
Pydantic v2 validation schemas for the Threat Intelligence platform.
Updated for Phase 2 Multi-Tenancy (ACSAC and Member Orgs).
"""
from __future__ import annotations

import uuid
from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field, field_validator

# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────
class OrgType(str, Enum):
    acsac  = "ACSAC"
    member = "MEMBER"

class UserRole(str, Enum):
    admin   = "ADMIN"
    analyst = "ANALYST"

class IntelType(str, Enum):
    alert    = "Alert"
    advisory = "Advisory"
    info_note = "Information Note/ Bulletin"

class IntelStatus(str, Enum):
    open   = "OPEN"
    closed = "CLOSED"
    draft  = "DRAFT"
    pending_review = "PENDING_REVIEW"
    approved = "APPROVED"

class TLPLevel(str, Enum):
    red          = "Red"
    amber_strict = "Amber+Strict"
    amber        = "Amber"
    green        = "Green"
    clear        = "Clear"

class ConfidenceLevel(str, Enum):
    low    = "Low"
    medium = "Medium"
    high   = "High"

class MemberIntelStatus(str, Enum):
    unacknowledged = "UNACKNOWLEDGED"
    acknowledged   = "ACKNOWLEDGED"
    investigating  = "INVESTIGATING"
    responded      = "RESPONDED"
    updated        = "UPDATED"
    closed         = "CLOSED"

class ResponseReviewStatus(str, Enum):
    pending  = "PENDING"
    accepted = "ACCEPTED"
    rejected = "REJECTED"

class IsacSubmissionType(str, Enum):
    ioc_hit = "IOC Hit"
    threat_hunt = "Threat Hunt Finding"
    attack_artefact = "Attack Artefact"
    ttp = "TTP/Adversary Behaviour"
    cyber_event = "Cyber Event"
    recon_intrusion = "Recon/Intrusion Attempt"


# ─────────────────────────────────────────────────────────────────────────────
# Bulk Operations
# ─────────────────────────────────────────────────────────────────────────────
class BulkDeletePayload(BaseModel):
    intel_ids: List[uuid.UUID]

# ─────────────────────────────────────────────────────────────────────────────
# Organization & User
# ─────────────────────────────────────────────────────────────────────────────
class OrganizationBase(BaseModel):
    name: str
    org_type: OrgType

class OrganizationResponse(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    model_config = {"from_attributes": True}

class MemberCreate(BaseModel):
    org_name: str
    user_name: str
    user_email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole

class UserResponse(UserBase):
    id: uuid.UUID
    org_id: uuid.UUID
    organization: OrganizationResponse
    model_config = {"from_attributes": True}

class SimpleUserResponse(UserBase):
    id: uuid.UUID
    model_config = {"from_attributes": True}

class OrganizationWithUsersResponse(OrganizationResponse):
    users: List[SimpleUserResponse] = []

class OrganizationUpdate(BaseModel):
    name: str

class UserUpdate(BaseModel):
    name: str
    email: str


# ─────────────────────────────────────────────────────────────────────────────
# Investigation Response
# ─────────────────────────────────────────────────────────────────────────────
class InvestigationResponseCreate(BaseModel):
    findings: Optional[str] = None
    affected_assets: List[str] = Field(default_factory=list)
    evidence: Optional[str] = None
    evidence_files: List[dict] = Field(default_factory=list)
    mitigation_measures: List[str] = Field(default_factory=list)
    
    # Alert-specific fields
    cii_sector: Optional[str] = None
    sector_lead_name: Optional[str] = None
    affected_member_status: Optional[str] = None
    affected_environment: Optional[str] = None
    delay_reason: Optional[str] = None
    expected_verification_date: Optional[date] = None
    patch_status: Optional[str] = None
    mitigation_measure_if_not_patched: Optional[str] = None
    ioc_traffic_direction: Optional[str] = None
    follow_up_action: Optional[str] = None
    other_type_of_alert: Optional[str] = None

    @field_validator("affected_assets", "mitigation_measures", mode="before")
    @classmethod
    def strip_and_filter_array(cls, value: list) -> list:
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return value

class InvestigationResponseModel(InvestigationResponseCreate):
    id: uuid.UUID
    intel_id: uuid.UUID
    org_id: uuid.UUID
    submitted_by_id: uuid.UUID
    submitted_at: datetime
    review_status: ResponseReviewStatus
    reviewer_comments: Optional[str] = None
    clarification_thread: List[Dict[str, Any]] = Field(default_factory=list)
    clarification_is_open: bool = True
    sla_met: Optional[bool] = None
    sla_exceeded_by: Optional[str] = None
    
    # Optional nested data
    organization: Optional[OrganizationResponse] = None
    submitted_by: Optional[UserResponse] = None

    model_config = {"from_attributes": True}

class ClarificationCreate(BaseModel):
    message: str = Field(..., min_length=1)

# ─────────────────────────────────────────────────────────────────────────────
# Threat Intel
# ─────────────────────────────────────────────────────────────────────────────
class ThreatIntelCreate(BaseModel):
    type: IntelType
    title: str = Field(..., min_length=3)
    case_id: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    threat_data: str = Field(..., min_length=1)
    tlp: TLPLevel
    confidence: ConfidenceLevel
    tags: List[str] = Field(default_factory=list)
    classification: str = Field(default="National")
    category: Optional[str] = Field(default="General")
    target_org_id: Optional[uuid.UUID] = None
    has_sla: bool = Field(default=False)
    sla_value: Optional[int] = None
    sla_unit: Optional[str] = None
    status: Optional[IntelStatus] = IntelStatus.open

    @field_validator("tags", mode="before")
    @classmethod
    def strip_and_filter_array(cls, value: list) -> list:
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return value

    @field_validator("title", "case_id", "description", "threat_data", "classification", "category", mode="before")
    @classmethod
    def strip_string_fields(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

class OrgIntelStatusResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    status: MemberIntelStatus
    acknowledged_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    clarification_thread: List[Dict[str, Any]] = Field(default_factory=list)
    clarification_is_open: bool = True
    organization: OrganizationResponse

    model_config = {"from_attributes": True}

class ThreatIntelResponse(ThreatIntelCreate):
    id: uuid.UUID
    status: IntelStatus
    published_at: datetime
    attachments: List[dict] = Field(default_factory=list)
    creator_org_id: uuid.UUID
    created_by_id: uuid.UUID

    creator_org: OrganizationResponse
    created_by: UserResponse
    target_org: Optional[OrganizationResponse] = None
    
    # For ACSAC view, we might want to see the status per member
    member_statuses: List[OrgIntelStatusResponse] = Field(default_factory=list)
    # Includes responses if requested
    responses: List[InvestigationResponseModel] = Field(default_factory=list)

    model_config = {"from_attributes": True}

# ─────────────────────────────────────────────────────────────────────────────
# ISAC Sharing
# ─────────────────────────────────────────────────────────────────────────────

class IsacCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)

    @field_validator("content", mode="before")
    @classmethod
    def strip_string_fields(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

class IsacCommentResponse(IsacCommentCreate):
    id: uuid.UUID
    submission_id: uuid.UUID
    created_at: datetime
    org_id: uuid.UUID
    created_by_id: uuid.UUID
    
    organization: OrganizationResponse
    created_by: UserResponse
    
    model_config = {"from_attributes": True}

class IsacSubmissionCreate(BaseModel):
    case_id: str = Field(..., min_length=3)
    submission_type: IsacSubmissionType
    status: Optional[str] = "OPEN"
    target_org_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    confidence_level: Optional[str] = None
    description: str = Field(..., min_length=1)
    indicators: Optional[str] = None
    sighting_datetime: datetime
    tlp: TLPLevel
    tags: List[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def strip_and_filter_array(cls, value: list) -> list:
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return value

    @field_validator("title", "description", "indicators", "case_id", mode="before")
    @classmethod
    def strip_string_fields(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

class IsacSubmissionUpdate(BaseModel):
    submission_type: Optional[IsacSubmissionType] = None
    status: Optional[str] = None
    target_org_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    confidence_level: Optional[str] = None
    description: Optional[str] = Field(None, min_length=1)
    indicators: Optional[str] = None
    sighting_datetime: Optional[datetime] = None
    tlp: Optional[TLPLevel] = None
    tags: Optional[List[str]] = None

    @field_validator("tags", mode="before")
    @classmethod
    def strip_and_filter_array(cls, value: list) -> list:
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return value

    @field_validator("title", "description", "indicators", mode="before")
    @classmethod
    def strip_string_fields(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

class IsacSubmissionResponse(IsacSubmissionCreate):
    id: uuid.UUID
    created_at: datetime
    org_id: uuid.UUID
    created_by_id: uuid.UUID
    is_escalated: bool
    
    organization: OrganizationResponse
    target_org: Optional[OrganizationResponse] = None
    created_by: UserResponse
    comments: List[IsacCommentResponse] = Field(default_factory=list)
    clarification_thread: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = {"from_attributes": True}

# ─────────────────────────────────────────────────────────────────────────────
# Incident Reporting
# ─────────────────────────────────────────────────────────────────────────────

class IncidentReportCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    incident_date: datetime
    tlp: TLPLevel
    tags: List[str] = Field(default_factory=list)
    form_data: Optional[Dict[str, Any]] = None
    is_draft: bool = False

    @field_validator("tags", mode="before")
    @classmethod
    def strip_and_filter_array(cls, value: list) -> list:
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        return value

class IncidentReportResponse(IncidentReportCreate):
    id: uuid.UUID
    case_id: str
    status: str
    created_at: datetime
    org_id: uuid.UUID
    created_by_id: uuid.UUID
    
    attachments: List[dict] = Field(default_factory=list)
    is_draft: bool = False
    clarification_thread: List[dict] = Field(default_factory=list)
    clarification_is_open: bool = True
    
    organization: OrganizationResponse
    created_by: UserResponse
    
    model_config = {"from_attributes": True}
