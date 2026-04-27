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
    # Manual enrichment since they are objects
    res = []
    for p in proposals:
        res.append({
            "id": p.id,
            "job_id": p.job_id,
            "job_title": p.job.title if p.job else "Unknown Job",
            "freelancer_id": p.freelancer_id,
            "freelancer_name": p.freelancer.name if p.freelancer else "Unknown Freelancer",
            "message": p.message,
            "price": p.price,
            "status": p.status,
            "created_at": p.created_at
        })
    return res

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

#delete user
@router.delete("/users/{user_id}")
def delete_user(user_id: int,
                db: Session = Depends(get_db),
                user=Depends(get_current_admin)):

    target_user = db.query(User).filter(User.id == user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # prevent admin from deleting other admins (or themselves)
    if target_user.role == "admin":
        raise HTTPException(status_code=400, detail="You cannot delete an administrative account")

    # DELETE RELATED DATA (Jobs if client, Proposals if freelancer)
    if target_user.role == "client":
        # Delete client's jobs and their proposals
        client_jobs = db.query(Job).filter(Job.client_id == user_id).all()
        for j in client_jobs:
            db.query(Proposal).filter(Proposal.job_id == j.id).delete()
            db.delete(j)
    
    elif target_user.role == "freelancer":
        # Delete freelancer's proposals
        db.query(Proposal).filter(Proposal.freelancer_id == user_id).delete()

    db.delete(target_user)
    db.commit()

    return {"message": "User and related data deleted"}