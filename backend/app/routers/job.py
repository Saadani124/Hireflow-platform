from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.session import get_db
from app.models.job import Job
from app.schemas.job import JobCreate

from app.core.dependencies import get_current_client
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs"])

#naamlo job endpoint
@router.post("/create")
def create_job(data: JobCreate, db: Session = Depends(get_db), user = Depends(get_current_client)):

    job = Job(
        title=data.title,
        description=data.description,
        budget=data.budget,
        client_id=user.id
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job

#list job endpoint
@router.get("/")
def list_jobs(db: Session = Depends(get_db), user = Depends(get_current_user)):
    jobs = db.query(Job).all()
    return jobs

#get job by id endpoint
@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job