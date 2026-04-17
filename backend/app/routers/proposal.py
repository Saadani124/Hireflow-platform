from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.proposal import Proposal
from app.models.job import Job
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
        raise HTTPException(status_code=400,detail="Already applied")

    proposal = Proposal(
        job_id=data.job_id,
        freelancer_id=user.id,
        message=data.message,
        price=data.price)

    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal

# #modifier l'application
# @router.put("/{proposal_id}")
# def update_proposal(proposal_id: int,
#                     data: ProposalCreate,
#                     db: Session=Depends(get_db),
#                     user=Depends(get_current_freelancer)):  # FAUTE: get_current_user utilisé au lieu de get_current_freelancer

#     proposal = db.query(Proposal).filter(Proposal.id==proposal_id).first()
#     if not proposal:
#         raise HTTPException(status_code=404,detail="Proposal not found")
#     if proposal.freelancer_id!=user.id:
#         raise HTTPException(status_code=403,detail="Not allowed")

#     # FAUTE: pas de vérification du statut, un freelancer pouvait modifier une proposition déjà traitée
#     if proposal.status!="pending":
#         raise HTTPException(status_code=400,detail="Cannot edit a processed proposal")

#     proposal.message=data.message
#     proposal.price=data.price
#     db.commit()
#     db.refresh(proposal)
#     return proposal

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

    # FAUTE: les autres propositions du même job n'étaient pas rejetées après acceptation
    db.query(Proposal).filter(
        Proposal.job_id==proposal.job_id,
        Proposal.id!=proposal_id).update({"status":"rejected"})

    db.commit()
    db.refresh(proposal)
    return {
        "job_id":job.id,
        "message":"Proposal accepted"
    }

# client consulte les propositions(chatgpt)
@router.get("/job/{job_id}")
def get_job_proposals(job_id: int,
                      db: Session=Depends(get_db),
                      user=Depends(get_current_client)):

    job = db.query(Job).filter(Job.id==job_id).first()
    if not job:
        raise HTTPException(status_code=404,detail="Job not found")
    if job.client_id!=user.id:
        raise HTTPException(status_code=403,detail="Not your job")

    proposals = db.query(Proposal).filter(Proposal.job_id==job_id).all()
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
@router.get("/me")
def getmy_proposals(db:Session=Depends(get_db),
                    user=Depends(get_current_freelancer)):

    proposals=db.query(Proposal).filter(Proposal.freelancer_id==user.id).all()
    return proposals