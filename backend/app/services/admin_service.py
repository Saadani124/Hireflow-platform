from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.user import User
from app.models.job import Job
from app.models.proposal import Proposal
from app.models.report import Report
from app.services.notification_service import NotificationService

class AdminService:
    @staticmethod
    def get_stats(db: Session):
        total_users = db.query(User).count()
        total_jobs = db.query(Job).count()
        total_proposals = db.query(Proposal).count()

        open_jobs = db.query(Job).filter(Job.status == "open").count()
        in_progress_jobs = db.query(Job).filter(Job.status == "in_progress").count()
        completed_jobs = db.query(Job).filter(Job.status == "completed").count()

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

    @staticmethod
    def get_all_users(db: Session):
        return db.query(User).all()

    @staticmethod
    def get_jobs(db: Session, skip: int = 0, limit: int = 50, search_id: int = None):
        query = db.query(Job)
        if search_id is not None:
            query = query.filter(Job.id == search_id)

        total = query.count()
        jobs = query.offset(skip).limit(limit).all()
        return {"items": jobs, "total": total}

    @staticmethod
    def get_proposals(db: Session, skip: int = 0, limit: int = 50, search_id: int = None):
        query = db.query(Proposal)
        if search_id is not None:
            query = query.filter(Proposal.id == search_id)

        total = query.count()
        proposals = query.offset(skip).limit(limit).all()
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
                "created_at": p.created_at,
                "report_count": p.report_count if hasattr(p, "report_count") else 0
            })
        return {"items": res, "total": total}

    @staticmethod
    async def delete_job(db: Session, job_id: int, admin_message: str):
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        client_id = job.client_id
        job_title = job.title

        # Clear reports for this job
        db.query(Report).filter(Report.target_type == "job", Report.target_id == job_id).delete()
        # DELETE RELATED PROPOSALS FIRST
        db.query(Proposal).filter(Proposal.job_id == job_id).delete()

        db.delete(job)
        db.commit()

        # Notify the client
        await NotificationService.create_notification(
            db=db,
            user_id=client_id,
            notif_type="deleted_job",
            title=f"Your job '{job_title}' was removed",
            message=f"Admin message: {admin_message}",
            link="/client-dashboard?section=my-jobs"
        )
        return {"message": "Job and related proposals deleted"}

    @staticmethod
    def delete_user(db: Session, user_id: int):
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        if target_user.role == "admin":
            raise HTTPException(status_code=400, detail="You cannot delete an administrative account")

        if target_user.role == "client":
            client_jobs = db.query(Job).filter(Job.client_id == user_id).all()
            for j in client_jobs:
                db.query(Report).filter(Report.target_type == "job", Report.target_id == j.id).delete()
                db.query(Proposal).filter(Proposal.job_id == j.id).delete()
                db.delete(j)
        elif target_user.role == "freelancer":
            db.query(Report).filter(Report.target_type == "proposal",
                                    Report.target_id.in_(
                                        db.query(Proposal.id).filter(Proposal.freelancer_id == user_id)
                                    )).delete(synchronize_session=False)
            db.query(Proposal).filter(Proposal.freelancer_id == user_id).delete()

        # Clear reports filed BY this user and notifications FOR this user
        db.query(Report).filter(Report.reporter_id == user_id).delete()
        from app.models.notification import Notification
        db.query(Notification).filter(Notification.user_id == user_id).delete()

        db.delete(target_user)
        db.commit()
        return {"message": "User and related data deleted"}

    @staticmethod
    async def delete_proposal(db: Session, proposal_id: int, admin_message: str):
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        freelancer_id = proposal.freelancer_id
        job = db.query(Job).filter(Job.id == proposal.job_id).first()
        job_title = job.title if job else f"Job #{proposal.job_id}"

        # Clear reports for this proposal
        db.query(Report).filter(Report.target_type == "proposal", Report.target_id == proposal_id).delete()

        db.delete(proposal)
        db.commit()

        # Notify the freelancer
        await NotificationService.create_notification(
            db=db,
            user_id=freelancer_id,
            notif_type="deleted_proposal",
            title=f"Your proposal for '{job_title}' was removed",
            message=f"Admin message: {admin_message}",
            link="/freelancer-dashboard?section=applications"
        )
        return {"message": "Proposal deleted"}
