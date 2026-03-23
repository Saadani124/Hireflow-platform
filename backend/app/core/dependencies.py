from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.security import decode_access_token

oauth2_scheme = HTTPBearer()

#hedhi njibo beha el user mel token
def get_current_user(token:str=Depends(oauth2_scheme),
                        db:Session=Depends(get_db)):

    token = token.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


#hedhi njibo beha el admin mel token
def get_current_admin(user:User=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    return user


#hedhi njibo beha el client mel token
def get_current_client(user:User=Depends(get_current_user)):
    if user.role != "client":
        raise HTTPException(status_code=403, detail="Unauthorized")
    return user


#hedhi njibo beha el freelancer mel token
def get_current_freelancer(user:User=Depends(get_current_user)):
    if user.role != "freelancer":
        raise HTTPException(status_code=403, detail="Unauthorized")
    return user
