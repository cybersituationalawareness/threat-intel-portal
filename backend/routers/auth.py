from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user, verify_password

router = APIRouter()

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

@router.get("/users/me", response_model=schemas.UserResponse, tags=["Auth"])
def get_me(user: models.User = Depends(get_current_user)):
    return user
