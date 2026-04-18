from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from datetime import datetime
from app.db.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    budget = Column(Integer, nullable=False)

    status = Column(String(50), default="open")
    category = Column(String(50), nullable=False)

    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)