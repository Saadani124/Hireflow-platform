from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint, ForeignKey
from datetime import datetime
from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(20), nullable=False)   # "job" or "proposal"
    target_id = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("reporter_id", "target_type", "target_id", name="unique_report"),
    )
