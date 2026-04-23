from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import shutil
import os
from uuid import uuid4

from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.user import UpdateProfileRequest


router = APIRouter(prefix="/users", tags=["Users"])

UPLOAD_DIR = "uploads"

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return user

DEFAULT_IMAGE = "/uploads/default.png"

@router.post("/upload-profile-picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # 🔴 DELETE OLD IMAGE (except default)
    if user.profile_image and user.profile_image != DEFAULT_IMAGE:
        old_path = user.profile_image.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    # SAVE NEW IMAGE
    ext = file.filename.split('.')[-1]
    filename = f"{uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # UPDATE DB
    user.profile_image = f"/uploads/{filename}"
    db.commit()
    db.refresh(user)

    return {
        "message": "Profile picture updated",
        "image_url": user.profile_image
    }

@router.put("/me")
def update_profile(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # 🔴 CHECK EMAIL UNIQUE
    existing = db.query(User).filter(
        User.email == data.email,
        User.id != user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    # 🔴 UPDATE FIELDS
    user.name = data.name
    user.email = data.email

    db.commit()
    db.refresh(user)

    return user