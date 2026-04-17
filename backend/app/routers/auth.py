from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import registerSchema, loginSchema
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(data: registerSchema, db: Session = Depends(get_db)):

    #block le creation d'admin 
    if data.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot register as admin")

    #vérifier validité de role 
    if data.role not in ["client", "freelancer"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    #vérifier existance email 
    existing_user = db.query(User).filter(User.email==data.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully"}

@router.post("/login")
def login(data:loginSchema,
            db:Session=Depends(get_db)):

    user = db.query(User).filter(User.email==data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "user_id": user.id,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }