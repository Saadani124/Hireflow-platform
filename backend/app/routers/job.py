from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.job import JobCreate, JobResponse, PaginatedJobResponse
from app.services.job_service import JobService
from app.core.dependencies import get_current_client, get_current_user, get_current_freelancer

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/create", response_model=JobResponse)
def create_job(data: JobCreate, db: Session = Depends(get_db), user = Depends(get_current_client)):
    return JobService.create_job(db, data, user)

@router.get("/", response_model=PaginatedJobResponse)
def list_jobs(db: Session = Depends(get_db),
              user = Depends(get_current_user),
              skip: int = 0,
              limit: int = 50):
    return JobService.list_jobs(db, user, skip, limit)

@router.get("/me")
def get_my_jobs(db: Session = Depends(get_db), user = Depends(get_current_client)):
    return JobService.get_my_jobs(db, user)

@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return JobService.get_job(db, job_id)

@router.post("/complete/{job_id}")
def complete_job(job_id: int, db: Session = Depends(get_db), user = Depends(get_current_client)):
    return JobService.complete_job(db, job_id, user)

@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), user = Depends(get_current_client)):
    return JobService.delete_job(db, job_id, user)