import uuid
import os
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from passlib.context import CryptContext

import models
from database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
