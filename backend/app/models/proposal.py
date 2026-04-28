from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from datetime import datetime
from app.db.base import Base
from sqlalchemy.orm import relationship


class Proposal(Base):
    __tablename__="proposals"

    id=Column(Integer,primary_key=True,index=True)
    job_id=Column(Integer,ForeignKey("jobs.id"),nullable=False)
    job = relationship("Job")
    freelancer_id=Column(Integer,ForeignKey("users.id"),nullable=False)
    freelancer = relationship("User")
    message = Column(String(255), nullable=False)
    price=Column(Integer,nullable=False)
    
    status = Column(String(50), default="pending")
    report_count = Column(Integer, default=0)
    created_at=Column(DateTime,default=datetime.utcnow)
    

    #important
    __table_args__=(
        UniqueConstraint("job_id","freelancer_id",name="unique_application"),
    )
    