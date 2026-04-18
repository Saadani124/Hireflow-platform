from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import shutil
import os
from uuid import uuid4

from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

UPLOAD_DIR = "uploads"


@router.post("/upload-profile-picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # 1) Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # 2) Ensure uploads folder exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # 3) Generate unique filename
    ext = file.filename.split('.')[-1]
    filename = f"{uuid4()}.{ext}"

    filepath = os.path.join(UPLOAD_DIR, filename)

    # 4) Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 5) Save path in DB
    user.profile_image = f"/uploads/{filename}"
    db.commit()
    db.refresh(user)

    return {
        "message": "Profile picture uploaded",
        "image_url": user.profile_image
    }