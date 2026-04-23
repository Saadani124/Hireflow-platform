from pydantic import BaseModel


class ProposalCreate(BaseModel):
    job_id: int
    message: str
    price: int

class UserMini(BaseModel):
    id: int
    name: str
    profile_image: str | None

    class Config:
        orm_mode = True
class JobMini(BaseModel):
    id: int
    title: str

    class Config:
        orm_mode = True
#bch nhasno l response mtaa l API
class ProposalResponse(BaseModel):
    id: int
    job_id: int
    message: str
    price: int
    status: str

    freelancer: UserMini  #REPLACE freelancer_id
    job: JobMini
    class Config:
        orm_mode = True

