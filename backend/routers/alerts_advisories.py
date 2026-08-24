import uuid
from typing import List, Optional
import os
from datetime import datetime, timezone
import shutil

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

import models
import schemas
from database import get_db
from dependencies import get_current_user, UPLOAD_DIR
import og_integration

router = APIRouter()

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
                shutil.move(temp_path, final_path)
                saved_attachments.append({
                    "filename": temp_path,
                    "path": final_path
                })
                
        if saved_attachments:
            intel.attachments = saved_attachments
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

    db.query(models.OrgIntelStatus).filter(models.OrgIntelStatus.intel_id.in_(payload.intel_ids)).delete(synchronize_session=False)
    db.query(models.InvestigationResponse).filter(models.InvestigationResponse.intel_id.in_(payload.intel_ids)).delete(synchronize_session=False)
    
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
                db.query(models.OrgIntelStatus).filter(
                    models.OrgIntelStatus.intel_id == intel.id,
                    models.OrgIntelStatus.org_id != payload.target_org_id
                ).delete()
                
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

    new_attachments = []
    
    for file in files:
        final_path = os.path.join(UPLOAD_DIR, f"{intel.id}_{file.filename}")
        with open(final_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        new_attachments.append({
            "filename": file.filename,
            "path": final_path
        })

    existing_attachments = intel.attachments or []
    intel.attachments = existing_attachments + new_attachments
    
    flag_modified(intel, "attachments")
    
    db.commit()
    db.refresh(intel)
    return {"status": "success", "uploaded": len(files)}

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

    intel_statuses = db.query(models.OrgIntelStatus)\
        .filter(models.OrgIntelStatus.org_id == user.org_id)\
        .all()
    
    result = []
    for st in intel_statuses:
        intel = st.intel
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
        
    result.sort(key=lambda x: x['published_at'], reverse=True)
    return result

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

    resp = models.InvestigationResponse(
        **payload.model_dump(),
        intel_id=intel_id,
        org_id=user.org_id,
        submitted_by_id=user.id,
        sla_met=sla_met,
        sla_exceeded_by=sla_exceeded_by
    )
    db.add(resp)

    status.status = models.MemberIntelStatus.responded
    status.responded_at = now
    
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
