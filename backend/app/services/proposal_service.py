from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from datetime import datetime
from app.models.proposal import Proposal
from app.models.job import Job
from app.models.user import User
from app.services.notification_service import NotificationService
from app.schemas.proposal import ProposalCreate

class ProposalService:
    @staticmethod
    async def apply_to_job(db: Session, data: ProposalCreate, user: User) -> Proposal:
        job = db.query(Job).filter(Job.id == data.job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.status != "open":
            raise HTTPException(status_code=400, detail="Job is not open")

        exist = db.query(Proposal).filter(
            Proposal.job_id == data.job_id,
            Proposal.freelancer_id == user.id
        ).first()
        
        if exist:
            if exist.status != "rejected":
                raise HTTPException(status_code=400, detail="Already applied")
            else:
                # If rejected, allow re-applying by updating the existing proposal
                exist.message = data.message
                exist.price = data.price
                exist.status = "pending"
                exist.created_at = datetime.now()
                db.commit()
                db.refresh(exist)
                return exist

        proposal = Proposal(
            job_id=data.job_id,
            freelancer_id=user.id,
            message=data.message,
            price=data.price
        )

        db.add(proposal)
        db.commit()
        db.refresh(proposal)

        # Notify the job's client about the new proposal
        job_owner = db.query(User).filter(User.id == job.client_id).first()
        if job_owner:
            await NotificationService.create_notification(
                db=db,
                user_id=job_owner.id,
                notif_type="new_proposal",
                title=f"New proposal on '{job.title}'",
                message=f"{user.name} submitted a proposal for your job '{job.title}'.",
                link=f"/client-dashboard?section=proposals&job_id={job.id}"
            )

        return proposal

    @staticmethod
    async def accept_proposal(db: Session, proposal_id: int, user: User):
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        job = db.query(Job).filter(Job.id == proposal.job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.client_id != user.id:
            raise HTTPException(status_code=403, detail="Not your job")
        if job.status != "open":
            raise HTTPException(status_code=400, detail="Job already started")

        if proposal.status != "pending":
            raise HTTPException(status_code=400, detail="Proposal already processed")

        proposal.status = "accepted"
        job.status = "in_progress"

        db.query(Proposal).filter(
            Proposal.job_id == proposal.job_id,
            Proposal.id != proposal_id
        ).update({"status": "rejected"})

        db.commit()
        db.refresh(proposal)

        # Notify the freelancer that their proposal was accepted
        await NotificationService.create_notification(
            db=db,
            user_id=proposal.freelancer_id,
            notif_type="accepted",
            title=f"Your proposal was accepted!",
            message=f"Congratulations! Your proposal for '{job.title}' has been accepted.",
            link=f"/freelancer-dashboard?section=applications"
        )

        return {"job_id": job.id, "message": "Proposal accepted"}

    @staticmethod
    def reject_proposal(db: Session, proposal_id: int, user: User):
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        job = db.query(Job).filter(Job.id == proposal.job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.client_id != user.id:
            raise HTTPException(status_code=403, detail="Not your job")

        if proposal.status != "pending":
            raise HTTPException(status_code=400, detail="Already processed")

        proposal.status = "rejected"
        db.commit()
        db.refresh(proposal)
        return {"message": "Proposal rejected"}

    @staticmethod
    def get_job_proposals(db: Session, job_id: int, user: User):
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.client_id != user.id:
            raise HTTPException(status_code=403, detail="Not your job")

        return db.query(Proposal)\
            .options(joinedload(Proposal.freelancer))\
            .filter(Proposal.job_id == job_id)\
            .all()

    @staticmethod
    def delete_proposal(db: Session, proposal_id: int, user: User):
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.freelancer_id != user.id:
            raise HTTPException(status_code=403, detail="Not allowed")
        if proposal.status != "pending":
            raise HTTPException(status_code=400, detail="Cannot delete a processed proposal")
        db.delete(proposal)
        db.commit()
        return {"message": "Proposal deleted"}

    @staticmethod
    def get_my_proposals(db: Session, user: User):
        return db.query(Proposal)\
            .options(joinedload(Proposal.job))\
            .filter(Proposal.freelancer_id == user.id)\
            .all()
