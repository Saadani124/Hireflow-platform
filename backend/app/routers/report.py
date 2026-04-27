from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import requests

from app.db.session import get_db
from app.models.report import Report
from app.models.notification import Notification
from app.models.job import Job
from app.models.proposal import Proposal
from app.models.user import User
from app.schemas.report import ReportCreate, ReportResponse
from app.core.dependencies import get_current_user, get_current_admin

router = APIRouter(prefix="/reports", tags=["Reports"])

N8N_WEBHOOK_URL = "http://localhost:5678/webhook/hireflow-reports"


def _fire_n8n_alert(type_: str, id_: int, title: str, count: int):
    """Fire an n8n webhook alert when report count exceeds threshold."""
    try:
        requests.post(N8N_WEBHOOK_URL, json={
            "type": type_,
            "id": id_,
            "title": title,
            "report_count": count,
            "link": f"http://localhost:4200/admin?section=reports&type={type_}&id={id_}"
        }, timeout=3)
    except Exception:
        pass  # Don't block the main request if n8n is down


# ─── SUBMIT REPORTS (any authenticated user) ───────────────────────────────

@router.post("/job/{job_id}", status_code=201)
def report_job(job_id: int, data: ReportCreate,
               db: Session = Depends(get_db),
               user=Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    report = Report(
        reporter_id=user.id,
        target_type="job",
        target_id=job_id,
        reason=data.reason
    )
    try:
        db.add(report)
        job.report_count = (job.report_count or 0) + 1
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already reported this job")

    # Notify admin in-app
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            type="report_job",
            title=f"Job reported: {job.title}",
            message=f"User '{user.name}' reported job '{job.title}'. Reason: {data.reason}. Total reports: {job.report_count}",
            link=f"/admin?section=reports&type=job&id={job_id}"
        )
        db.add(notif)
    db.commit()

    # Trigger n8n if threshold exceeded
    if job.report_count > 10:
        _fire_n8n_alert("job", job.id, job.title, job.report_count)

    return {"message": "Job reported successfully", "report_count": job.report_count}


@router.post("/proposal/{proposal_id}", status_code=201)
def report_proposal(proposal_id: int, data: ReportCreate,
                    db: Session = Depends(get_db),
                    user=Depends(get_current_user)):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    job = db.query(Job).filter(Job.id == proposal.job_id).first()
    title = f"Proposal on '{job.title}'" if job else f"Proposal #{proposal_id}"

    report = Report(
        reporter_id=user.id,
        target_type="proposal",
        target_id=proposal_id,
        reason=data.reason
    )
    try:
        db.add(report)
        proposal.report_count = (proposal.report_count or 0) + 1
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already reported this proposal")

    # Notify admin in-app
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            type="report_proposal",
            title=f"Proposal reported: {title}",
            message=f"User '{user.name}' reported {title}. Reason: {data.reason}. Total reports: {proposal.report_count}",
            link=f"/admin?section=reports&type=proposal&id={proposal_id}"
        )
        db.add(notif)
    db.commit()

    if proposal.report_count > 10:
        _fire_n8n_alert("proposal", proposal.id, title, proposal.report_count)

    return {"message": "Proposal reported successfully", "report_count": proposal.report_count}


# ─── ADMIN ENDPOINTS ────────────────────────────────────────────────────────

@router.get("/", response_model=list[ReportResponse])
def get_all_reports(db: Session = Depends(get_db),
                    user=Depends(get_current_admin)):
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    result = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        result.append(ReportResponse(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_name=reporter.name if reporter else "Unknown",
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            created_at=r.created_at
        ))
    return result


@router.get("/job/{job_id}", response_model=list[ReportResponse])
def get_job_reports(job_id: int, db: Session = Depends(get_db),
                    user=Depends(get_current_admin)):
    reports = db.query(Report).filter(
        Report.target_type == "job",
        Report.target_id == job_id
    ).order_by(Report.created_at.desc()).all()
    result = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        result.append(ReportResponse(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_name=reporter.name if reporter else "Unknown",
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            created_at=r.created_at
        ))
    return result


@router.get("/proposal/{proposal_id}", response_model=list[ReportResponse])
def get_proposal_reports(proposal_id: int, db: Session = Depends(get_db),
                         user=Depends(get_current_admin)):
    reports = db.query(Report).filter(
        Report.target_type == "proposal",
        Report.target_id == proposal_id
    ).order_by(Report.created_at.desc()).all()
    result = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        result.append(ReportResponse(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_name=reporter.name if reporter else "Unknown",
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            created_at=r.created_at
        ))
    return result


@router.delete("/{report_id}", status_code=200)
def ignore_report(report_id: int, db: Session = Depends(get_db),
                  user=Depends(get_current_admin)):
    """Ignore a report — deletes only the Report row, not the target."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report ignored and deleted"}
