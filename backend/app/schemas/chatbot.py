from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    user_role: Optional[str] = None
    user_name: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
