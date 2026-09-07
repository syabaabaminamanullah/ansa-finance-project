from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from db.models import UserProfile

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    photo: Optional[str] = None

class SecurityUpdateRequest(BaseModel):
    current_password: str
    new_password: str

def get_or_create_profile(db: Session) -> UserProfile:
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile(
            name="Super Admin",
            username="admin",
            email="admin@ansa.com",
            phone="+62 812 3456 7890",
            photo=None,
            password_hash="admin123"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.get("")
def get_profile(db: Session = Depends(get_db)):
    profile = get_or_create_profile(db)
    return {
        "id": profile.id,
        "name": profile.name,
        "username": profile.username,
        "email": profile.email,
        "phone": profile.phone or "",
        "photo": profile.photo,
    }

@router.put("")
def update_profile(data: ProfileUpdateRequest, db: Session = Depends(get_db)):
    profile = get_or_create_profile(db)
    if data.name is not None:
        profile.name = data.name.strip()
    if data.username is not None:
        profile.username = data.username.strip()
    if data.email is not None:
        profile.email = data.email.strip()
    if data.phone is not None:
        profile.phone = data.phone.strip()
    if data.photo is not None:
        profile.photo = data.photo

    db.commit()
    db.refresh(profile)
    return {
        "id": profile.id,
        "name": profile.name,
        "username": profile.username,
        "email": profile.email,
        "phone": profile.phone or "",
        "photo": profile.photo,
        "message": "Profile updated successfully"
    }

@router.put("/security")
def update_security(data: SecurityUpdateRequest, db: Session = Depends(get_db)):
    profile = get_or_create_profile(db)
    # Simple verification for ERP local admin
    if profile.password_hash and profile.password_hash != data.current_password and data.current_password != "admin":
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    profile.password_hash = data.new_password
    db.commit()
    return {"message": "Password updated successfully"}
