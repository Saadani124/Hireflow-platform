from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.session import get_db
from app.models.job import Job
from app.schemas.job import JobCreate
from app.schemas.job import JobResponse
from app.models.proposal import Proposal
from app.models.user import User

from app.core.dependencies import get_current_client,get_current_freelancer,get_current_user

router = APIRouter(prefix="/jobs",tags=["Jobs"])

#naamlo job endpoint
@router.post("/create",response_model=JobResponse)
def create_job(data:JobCreate, 
                db:Session=Depends(get_db), 
                user=Depends(get_current_client)):
    job = Job(
        title=data.title,
        description=data.description,
        budget=data.budget,
        category=data.category, 
        client_id=user.id
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return job

#list job endpoint
@router.get("/",response_model=list[JobResponse])
def list_jobs(db:Session=Depends(get_db),
                user=Depends(get_current_user)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return jobs
#client consulte ses jobs
@router.get("/me")
def get_my_jobs(db: Session=Depends(get_db),
                user=Depends(get_current_client)):

    jobs=db.query(Job).filter(Job.client_id == user.id).all()
    return jobs
#get job by id endpoint
@router.get("/{job_id}")
def get_job(job_id:int,
            db:Session=Depends(get_db),
            user=Depends(get_current_user)):
    
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

#job completed
@router.post("/complete/{job_id}")
def complete_job(job_id: int,
                 db:Session=Depends(get_db),
                 user=Depends(get_current_client)):

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.client_id != user.id:
        raise HTTPException(status_code=403, detail="Not your job")
    if job.status != "in_progress":
        raise HTTPException(status_code=400, detail="Job not in progress")

    job.status = "completed"
    db.commit()
    db.refresh(job)
    return {"message": "Job completed"}



#freelancer consulte les jobs elli postulehom
@router.get("/open")
def get_open_jobs(db: Session=Depends(get_db),
                  user=Depends(get_current_freelancer)):

    jobs=db.query(Job).filter(Job.status=="open").all()
    return jobs


#delete job
@router.delete("/jobs/{job_id}")
def delete_job(job_id: int,
               db: Session = Depends(get_db),
               user=Depends(get_current_client)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # DELETE RELATED PROPOSALS FIRST
    db.query(Proposal).filter(Proposal.job_id == job_id).delete()

    db.delete(job)
    db.commit()

    return {"message": "Job and related proposals deleted"}

@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_client)
):
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.client_id != user.id:
        raise HTTPException(status_code=403, detail="Not your job")

    if job.status != "open":
        raise HTTPException(status_code=400, detail="Cannot delete this job")

    db.delete(job)
    db.commit()

    return {"message": "Job deleted"}