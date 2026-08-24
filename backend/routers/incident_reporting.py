import uuid
import os
import random
import string
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel

import models
import schemas
from database import get_db
from dependencies import get_current_user, UPLOAD_DIR

router = APIRouter()

class ClarificationMessage(BaseModel):
    message: str

class IncidentStatusUpdate(BaseModel):
    status: str

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
        
    flag_modified(incident, "form_data")
    db.commit()
    db.refresh(incident)
    return incident

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

    existing_attachments = incident.attachments or []
    incident.attachments = existing_attachments + new_attachments
    
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
            pass
            
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
