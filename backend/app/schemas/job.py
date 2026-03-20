from pydantic import BaseModel


class JobCreate(BaseModel):
    title: str
    description: str
    budget: int