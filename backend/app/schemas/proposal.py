from pydantic import BaseModel


class ProposalCreate(BaseModel):
    job_id: int
    message: str
    price: int

#bch nhasno l response mtaa l API
class ProposalResponse(BaseModel):
    id: int
    job_id: int
    freelancer_id: int
    message: str
    price: int
    status: str

    class Config:
        orm_mode = True