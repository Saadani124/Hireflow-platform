from pydantic import BaseModel
from datetime import datetime


class ReportCreate(BaseModel):
    reason: str


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    reporter_name: str
    target_type: str
    target_id: int
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True
