from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import registerSchema, loginSchema
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.n8n import trigger_verification_email

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4200")

router = APIRouter(prefix="/auth", tags=["Auth"])


def create_verification_token(user_id: int) -> str:
    """Creates a JWT token used for email verification (expires in 24h)."""
    from jose import jwt
    from datetime import datetime, timedelta
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM")
    payload = {
        "user_id": user_id,
        "purpose": "email_verification",
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register")
def register(data: registerSchema, db: Session = Depends(get_db)):

    # Block admin registration
    if data.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot register as admin")

    # Validate role
    if data.role not in ["client", "freelancer"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Check email uniqueness
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Freelancers start unverified; clients are auto-verified
    is_verified = True if data.role == "client" else False

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        profile_image="/uploads/default.png",
        is_verified=is_verified
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send verification email for freelancers via n8n
    if data.role == "freelancer":
        token = create_verification_token(user.id)
        verify_link = f"{FRONTEND_URL}/verify?token={token}"
        trigger_verification_email(
            email=user.email,
            name=user.name,
            link=verify_link
        )
        return {"message": "Registration successful! Please check your email to verify your account."}

    return {"message": "User registered successfully"}


@router.post("/login")
def login(data: loginSchema, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Block unverified freelancers from logging in
    if user.role == "freelancer" and not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox."
        )

    token = create_access_token({
        "user_id": user.id,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/verify")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Handles the email verification link click."""
    payload = decode_access_token(token)

    if not payload or payload.get("purpose") != "email_verification":
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        # Already verified — just redirect to login
        return RedirectResponse(url=f"{FRONTEND_URL}/login?verified=already")

    user.is_verified = True
    db.commit()

    return RedirectResponse(url=f"{FRONTEND_URL}/login?verified=true")