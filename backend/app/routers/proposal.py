from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.proposal import ProposalCreate, ProposalResponse
from app.services.proposal_service import ProposalService
from app.core.dependencies import get_current_client, get_current_freelancer

router = APIRouter(prefix="/proposals", tags=["Proposals"])

@router.post("/apply", response_model=ProposalResponse)
async def apply_to_job(data: ProposalCreate,
                 db: Session = Depends(get_db),
                 user = Depends(get_current_freelancer)):
    return await ProposalService.apply_to_job(db, data, user)

@router.post("/reject/{proposal_id}")
def reject_proposal(proposal_id: int,
                    db: Session = Depends(get_db),
                    user = Depends(get_current_client)):
    return ProposalService.reject_proposal(db, proposal_id, user)

@router.post("/accept/{proposal_id}")
async def accept_proposal(proposal_id: int,
                    db: Session = Depends(get_db),
                    user = Depends(get_current_client)):
    return await ProposalService.accept_proposal(db, proposal_id, user)

@router.get("/job/{job_id}", response_model=list[ProposalResponse])
def get_job_proposals(job_id: int,
                      db: Session = Depends(get_db),
                      user = Depends(get_current_client)):
    return ProposalService.get_job_proposals(db, job_id, user)

@router.delete("/{proposal_id}")
def delete_proposal(proposal_id: int, 
                    db: Session = Depends(get_db), 
                    user = Depends(get_current_freelancer)):
    return ProposalService.delete_proposal(db, proposal_id, user)

@router.get("/me", response_model=list[ProposalResponse])
def get_my_proposals(db: Session = Depends(get_db),
                    user = Depends(get_current_freelancer)):
    return ProposalService.get_my_proposals(db, user)