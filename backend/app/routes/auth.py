from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, ActivityLog
from ..schemas import UserCreate, UserResponse, UserLogin, Token, PasswordReset, UserProfileUpdate, ActivityLogResponse
from ..auth_jwt import get_password_hash, verify_password, create_access_token, get_current_user
from ..utils.helpers import log_activity
from typing import List

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if role is valid
    if user_in.role not in ["teacher", "student"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'teacher' or 'student'"
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
        
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password=hashed_password,
        role=user_in.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_activity(db, new_user.id, "USER_SIGNUP", f"User registered with role: {new_user.role}")
    return new_user


@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    log_activity(db, user.id, "USER_LOGIN", f"User logged in from browser (Remember Me: {login_in.remember_me})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email
    }


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(profile_in: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if email is being updated and if it belongs to someone else
    if profile_in.email != current_user.email:
        other_user = db.query(User).filter(User.email == profile_in.email).first()
        if other_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already in use by another user."
            )
            
    current_user.name = profile_in.name
    current_user.email = profile_in.email
    
    db.commit()
    db.refresh(current_user)
    
    log_activity(db, current_user.id, "PROFILE_UPDATE", f"Profile details updated: {current_user.name} ({current_user.email})")
    return current_user


@router.post("/reset-password")
def reset_password(pwd_in: PasswordReset, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(pwd_in.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
        
    current_user.password = get_password_hash(pwd_in.new_password)
    db.commit()
    
    log_activity(db, current_user.id, "PASSWORD_RESET", "Password was reset successfully")
    return {"message": "Password reset successfully"}


@router.get("/logs", response_model=List[ActivityLogResponse])
def get_user_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).order_by(ActivityLog.created_at.desc()).limit(50).all()
    return logs
