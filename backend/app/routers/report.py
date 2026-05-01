from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.report import ReportCreate, ReportResponse
from app.core.dependencies import get_current_user, get_current_admin
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

# ─── SUBMIT REPORTS (any authenticated user) ───────────────────────────────

@router.post("/job/{job_id}", status_code=201)
async def report_job(job_id: int, data: ReportCreate,
               db: Session = Depends(get_db),
               user=Depends(get_current_user)):
    report_count = await ReportService.report_job(db, job_id, user, data.reason)
    return {"message": "Job reported successfully", "report_count": report_count}


@router.post("/proposal/{proposal_id}", status_code=201)
async def report_proposal(proposal_id: int, data: ReportCreate,
                    db: Session = Depends(get_db),
                    user=Depends(get_current_user)):
    report_count = await ReportService.report_proposal(db, proposal_id, user, data.reason)
    return {"message": "Proposal reported successfully", "report_count": report_count}


# ─── ADMIN ENDPOINTS ────────────────────────────────────────────────────────

@router.get("/", response_model=list[ReportResponse])
def get_all_reports(db: Session = Depends(get_db),
                    user=Depends(get_current_admin)):
    return ReportService.get_all_reports(db)


@router.get("/job/{job_id}", response_model=list[ReportResponse])
def get_job_reports(job_id: int, db: Session = Depends(get_db),
                    user=Depends(get_current_admin)):
    return ReportService.get_job_reports(db, job_id)


@router.get("/proposal/{proposal_id}", response_model=list[ReportResponse])
def get_proposal_reports(proposal_id: int, db: Session = Depends(get_db),
                         user=Depends(get_current_admin)):
    return ReportService.get_proposal_reports(db, proposal_id)


@router.delete("/{report_id}", status_code=200)
def ignore_report(report_id: int, db: Session = Depends(get_db),
                  user=Depends(get_current_admin)):
    """Ignore a report — deletes only the Report row, not the target."""
    ReportService.ignore_report(db, report_id)
    return {"message": "Report ignored and deleted"}
