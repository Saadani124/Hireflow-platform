
from pydantic import BaseModel, EmailStr, constr

class UpdateProfileRequest(BaseModel):
    name: constr(min_length=3, max_length=100)
    email: EmailStr