from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])

class AdminDeleteBody(BaseModel):
    admin_message: str

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), user = Depends(get_current_admin)):
    return AdminService.get_stats(db)

@router.get("/users")
def get_all_users(db: Session = Depends(get_db), user = Depends(get_current_admin)):
    return AdminService.get_all_users(db)

@router.get("/jobs")
def get_all_jobs(db: Session = Depends(get_db),
                 user = Depends(get_current_admin),
                 skip: int = 0,
                 limit: int = 50,
                 search_id: int = None):
    return AdminService.get_jobs(db, skip, limit, search_id)

@router.get("/proposals")
def get_all_proposals(db: Session = Depends(get_db),
                       user = Depends(get_current_admin),
                       skip: int = 0,
                       limit: int = 50,
                       search_id: int = None):
    return AdminService.get_proposals(db, skip, limit, search_id)

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: int,
               body: AdminDeleteBody,
               db: Session = Depends(get_db),
               user = Depends(get_current_admin)):
    return await AdminService.delete_job(db, job_id, body.admin_message)

@router.delete("/users/{user_id}")
def delete_user(user_id: int,
                db: Session = Depends(get_db),
                user = Depends(get_current_admin)):
    return AdminService.delete_user(db, user_id)

@router.delete("/proposals/{proposal_id}")
async def delete_proposal(proposal_id: int,
                    body: AdminDeleteBody,
                    db: Session = Depends(get_db),
                    user = Depends(get_current_admin)):
    return await AdminService.delete_proposal(db, proposal_id, body.admin_message)