from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.job import Job
from app.models.proposal import Proposal
from app.models.user import User
from app.schemas.job import JobCreate

class JobService:
    @staticmethod
    def create_job(db: Session, data: JobCreate, user: User) -> Job:
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

    @staticmethod
    def list_jobs(db: Session, user: User, skip: int = 0, limit: int = 50):
        total = db.query(Job).filter(Job.status == "open").count()
        jobs = db.query(Job).filter(Job.status == "open").order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
        
        # If user is a freelancer, check which jobs they applied to
        if user and user.role == "freelancer":
            proposals = db.query(Proposal.job_id, Proposal.status).filter(
                Proposal.freelancer_id == user.id
            ).all()
            
            status_map = {row[0]: row[1] for row in proposals}
            
            for job in jobs:
                status = status_map.get(job.id)
                job.applied = status is not None and status != "rejected"
                job.rejected = status == "rejected"
                
        return {"items": jobs, "total": total}

    @staticmethod
    def get_my_jobs(db: Session, user: User):
        return db.query(Job).filter(Job.client_id == user.id).all()

    @staticmethod
    def get_job(db: Session, job_id: int):
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job

    @staticmethod
    def complete_job(db: Session, job_id: int, user: User):
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

    @staticmethod
    def delete_job(db: Session, job_id: int, user: User):
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
