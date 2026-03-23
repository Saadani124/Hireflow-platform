from pydantic import BaseModel


class ProposalCreate(BaseModel):
    job_id: int
    message: str
    price: int