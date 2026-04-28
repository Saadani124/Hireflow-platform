from pydantic import BaseModel


class JobCreate(BaseModel):
    title: str
    description: str
    budget: int
    category: str

#bch nhasno l response mtaa l API
class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    budget: int
    status: str
    category: str
    applied: bool = False
    rejected: bool = False
    
    class Config:
        from_attributes = True

class PaginatedJobResponse(BaseModel):
    items: list[JobResponse]
    total: int
