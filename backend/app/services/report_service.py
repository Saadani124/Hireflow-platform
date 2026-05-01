from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.report import Report
from app.models.job import Job
from app.models.proposal import Proposal
from app.models.user import User
from app.schemas.report import ReportCreate, ReportResponse
from app.services.notification_service import NotificationService
from app.core.n8n import trigger_report_alert

class ReportService:
    @staticmethod
    def report_job(db: Session, job_id: int, user: User, reason: str) -> int:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        report = Report(
            reporter_id=user.id,
            target_type="job",
            target_id=job_id,
            reason=reason
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
            NotificationService.create_notification(
                db=db,
                user_id=admin.id,
                notif_type="report_job",
                title=f"Job reported: {job.title}",
                message=f"User '{user.name}' reported job '{job.title}'. Reason: {reason}. Total reports: {job.report_count}",
                link=f"/admin?section=reports&type=job&id={job_id}"
            )

        # Trigger n8n if threshold exceeded
        if job.report_count > 2:
            trigger_report_alert("job", job.id, job.title, job.report_count)

        return job.report_count

    @staticmethod
    def report_proposal(db: Session, proposal_id: int, user: User, reason: str) -> int:
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        job = db.query(Job).filter(Job.id == proposal.job_id).first()
        title = f"Proposal on '{job.title}'" if job else f"Proposal #{proposal_id}"

        report = Report(
            reporter_id=user.id,
            target_type="proposal",
            target_id=proposal_id,
            reason=reason
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
            NotificationService.create_notification(
                db=db,
                user_id=admin.id,
                notif_type="report_proposal",
                title=f"Proposal reported: {title}",
                message=f"User '{user.name}' reported {title}. Reason: {reason}. Total reports: {proposal.report_count}",
                link=f"/admin?section=reports&type=proposal&id={proposal_id}"
            )

        # Trigger n8n if threshold exceeded
        if proposal.report_count > 2:
            trigger_report_alert("proposal", proposal.id, title, proposal.report_count)

        return proposal.report_count

    @staticmethod
    def get_all_reports(db: Session) -> list[ReportResponse]:
        reports = db.query(Report).order_by(Report.created_at.desc()).all()
        return ReportService._format_reports(db, reports)

    @staticmethod
    def get_job_reports(db: Session, job_id: int) -> list[ReportResponse]:
        reports = db.query(Report).filter(
            Report.target_type == "job",
            Report.target_id == job_id
        ).order_by(Report.created_at.desc()).all()
        return ReportService._format_reports(db, reports)

    @staticmethod
    def get_proposal_reports(db: Session, proposal_id: int) -> list[ReportResponse]:
        reports = db.query(Report).filter(
            Report.target_type == "proposal",
            Report.target_id == proposal_id
        ).order_by(Report.created_at.desc()).all()
        return ReportService._format_reports(db, reports)

    @staticmethod
    def ignore_report(db: Session, report_id: int):
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        db.delete(report)
        db.commit()

    @staticmethod
    def _format_reports(db: Session, reports: list[Report]) -> list[ReportResponse]:
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
