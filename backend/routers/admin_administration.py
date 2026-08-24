from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user, get_password_hash

router = APIRouter()

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
