import uuid
import csv
import io
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter()

class ClarificationMessage(BaseModel):
    message: str

@router.get("/isac/next-case-id", tags=["ISAC"])
def get_next_isac_case_id(db: Session = Depends(get_db)):
    """Generate the next auto-incrementing case ID for ISAC submissions."""
    current_year = datetime.now(timezone.utc).year
    prefix = f"INS-{current_year}-"
    
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

@router.post("/isac/submissions/{submission_id}/clarification/close", tags=["ISAC"])
def close_isac_clarification(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Analyst closes an ISAC clarification thread."""
    if current_user.organization.org_type != 'acsac':
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
    
    sub.clarification_thread = list(current_thread)
    flag_modified(sub, "clarification_thread")
    
    db.commit()
    return {"status": "ok"}
