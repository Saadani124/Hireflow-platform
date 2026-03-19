from pydantic import BaseModel, EmailStr

class registerSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  #client ou freelancer

class loginSchema(BaseModel):
    email: EmailStr
    password: str