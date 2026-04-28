from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session ,joinedload

from app.db.session import get_db
from app.models.proposal import Proposal
from app.models.job import Job
from app.models.user import User
from app.models.notification import Notification
from app.schemas.proposal import ProposalCreate
from app.schemas.proposal import ProposalResponse

from app.core.dependencies import get_current_client, get_current_freelancer

router = APIRouter(prefix="/proposals", tags=["Proposals"])

#application au job
@router.post("/apply",response_model=ProposalResponse)
def apply_to_job(data: ProposalCreate,
                 db: Session=Depends(get_db),
                 user=Depends(get_current_freelancer)):  # FAUTE: get_current_user utilisé au lieu de get_current_freelancer

    job = db.query(Job).filter(Job.id==data.job_id).first()
    if not job:
        raise HTTPException(status_code=404,detail="Job not found")
    if job.status!="open":
        raise HTTPException(status_code=400,detail="Job is not open")

    exist = db.query(Proposal).filter(
        Proposal.job_id==data.job_id,
        Proposal.freelancer_id==user.id).first()
    
    if exist:
        if exist.status != "rejected":
            raise HTTPException(status_code=400,detail="Already applied")
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
        price=data.price)

    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    # Notify the job's client about the new proposal
    job_owner = db.query(User).filter(User.id == job.client_id).first()
    if job_owner:
        notif = Notification(
            user_id=job_owner.id,
            type="new_proposal",
            title=f"New proposal on '{job.title}'",
            message=f"{user.name} submitted a proposal for your job '{job.title}'.",
            link=f"/client-dashboard?section=proposals&job_id={job.id}"
        )
        db.add(notif)
        db.commit()

    return proposal

#modifier l'application
@router.put("/{proposal_id}")
def update_proposal(proposal_id: int,
                    data: ProposalCreate,
                    db: Session=Depends(get_db),
                    user=Depends(get_current_freelancer)):  # FAUTE: get_current_user utilisé au lieu de get_current_freelancer

    proposal = db.query(Proposal).filter(Proposal.id==proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404,detail="Proposal not found")
    if proposal.freelancer_id!=user.id:
        raise HTTPException(status_code=403,detail="Not allowed")

    # FAUTE: pas de vérification du statut, un freelancer pouvait modifier une proposition déjà traitée
    if proposal.status!="pending":
        raise HTTPException(status_code=400,detail="Cannot edit a processed proposal")

    proposal.message=data.message
    proposal.price=data.price
    db.commit()
    db.refresh(proposal)
    return proposal
#rejection 
@router.post("/reject/{proposal_id}")
def reject_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_client)
):
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
#acceptation
@router.post("/accept/{proposal_id}")
def accept_proposal(proposal_id: int,
                    db: Session=Depends(get_db),
                    user=Depends(get_current_client)):

    proposal = db.query(Proposal).filter(Proposal.id==proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404,detail="Proposal not found")

    job = db.query(Job).filter(Job.id==proposal.job_id).first()
    if not job:
        raise HTTPException(status_code=404,detail="Job not found")
    if job.client_id!=user.id:
        raise HTTPException(status_code=403,detail="Not your job")
    if job.status!="open":
        raise HTTPException(status_code=400,detail="Job already started")

    # FAUTE: pas de vérification du statut, une proposition déjà acceptée pouvait être acceptée à nouveau
    if proposal.status!="pending":
        raise HTTPException(status_code=400,detail="Proposal already processed")

    proposal.status="accepted"
    job.status="in_progress"

    db.query(Proposal).filter(
        Proposal.job_id==proposal.job_id,
        Proposal.id!=proposal_id).update({"status":"rejected"})

    db.commit()
    db.refresh(proposal)

    # Notify the freelancer that their proposal was accepted
    notif = Notification(
        user_id=proposal.freelancer_id,
        type="accepted",
        title=f"Your proposal was accepted!",
        message=f"Congratulations! Your proposal for '{job.title}' has been accepted.",
        link=f"/freelancer-dashboard?section=applications"
    )
    db.add(notif)
    db.commit()

    return {
        "job_id":job.id,
        "message":"Proposal accepted"
    }

# client consulte les propositions(chatgpt)
@router.get("/job/{job_id}", response_model=list[ProposalResponse])
def get_job_proposals(job_id: int,
                      db: Session=Depends(get_db),
                      user=Depends(get_current_client)):

    job = db.query(Job).filter(Job.id==job_id).first()
    if not job:
        raise HTTPException(status_code=404,detail="Job not found")
    if job.client_id!=user.id:
        raise HTTPException(status_code=403,detail="Not your job")

    proposals = db.query(Proposal)\
.options(joinedload(Proposal.freelancer))\
.filter(Proposal.job_id == job_id)\
.all()
    return proposals

#suppression (claude)
@router.delete("/{proposal_id}")
def delete_proposal(proposal_id: int, db: Session=Depends(get_db), user=Depends(get_current_freelancer)):
    proposal = db.query(Proposal).filter(Proposal.id==proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404,detail="Proposal not found")
    if proposal.freelancer_id!=user.id:
        raise HTTPException(status_code=403,detail="Not allowed")
    if proposal.status!="pending":
        raise HTTPException(status_code=400,detail="Cannot delete a processed proposal")
    db.delete(proposal)
    db.commit()
    return {"message":"Proposal deleted"}

#freelancer consulte ses proposals
@router.get("/me", response_model=list[ProposalResponse])
def getmy_proposals(db:Session=Depends(get_db),
                    user=Depends(get_current_freelancer)):

    proposals=db.query(Proposal)\
    .options(joinedload(Proposal.job))\
    .filter(Proposal.freelancer_id == user.id)\
    .all()
    return proposals