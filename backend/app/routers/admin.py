from fastapi import Depends, HTTPException
from app.core.dependencies import get_current_admin
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.job import Job
from app.models.proposal import Proposal

router = APIRouter(prefix="/admin", tags=["Admin"])

#stats
@router.get("/stats")
def get_stats(db: Session=Depends(get_db),
              user=Depends(get_current_admin)):

    total_users=db.query(User).count()
    total_jobs=db.query(Job).count()
    total_proposals=db.query(Proposal).count()

    open_jobs=db.query(Job).filter(Job.status == "open").count()
    in_progress_jobs=db.query(Job).filter(Job.status == "in_progress").count()
    completed_jobs=db.query(Job).filter(Job.status == "completed").count()
    return {
        "users": total_users,
        "jobs": total_jobs,
        "proposals": total_proposals,
        "job_status": {
            "open": open_jobs,
            "in_progress": in_progress_jobs,
            "completed": completed_jobs
        }
    }

#list users
@router.get("/users")
def get_all_users(db: Session = Depends(get_db),
                  user = Depends(get_current_admin)):

    users = db.query(User).all()
    return users

#list jobs
@router.get("/jobs")
def get_all_jobs(db: Session = Depends(get_db),
                 user = Depends(get_current_admin)):

    jobs = db.query(Job).all()
    return jobs

#list proposals
@router.get("/proposals")
def get_all_proposals(db: Session = Depends(get_db),
                      user = Depends(get_current_admin)):

    proposals = db.query(Proposal).all()
    return proposals

#delete job
@router.delete("/jobs/{job_id}")
def delete_job(job_id: int,
               db: Session = Depends(get_db),
               user=Depends(get_current_admin)):

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # DELETE RELATED PROPOSALS FIRST
    db.query(Proposal).filter(Proposal.job_id == job_id).delete()

    db.delete(job)
    db.commit()

    return {"message": "Job and related proposals deleted"}