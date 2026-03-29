from pydantic import BaseModel


class JobCreate(BaseModel):
    title: str
    description: str
    budget: int

#bch nhasno l response mtaa l API
class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    budget: int
    status: str
