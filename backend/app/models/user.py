from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True,index=True)
    name=Column(String,nullable=False)
    email=Column(String,unique=True,nullable=False)
    password_hash=Column(String,nullable=False)

    role_id=Column(Integer,ForeignKey("roles.id"),nullable=False)
    created_at=Column(DateTime,default=datetime.utcnow)

    role=relationship("Role",back_populates="users")