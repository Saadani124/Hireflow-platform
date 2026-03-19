from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user, get_current_client, get_current_freelancer, get_current_admin

router = APIRouter(prefix="/test", tags=["Test"])

@router.get("/me")
def get_me(user = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role
    }


@router.get("/client-only")
def client_route(user = Depends(get_current_client)):
    return {"message": "Hello Client"}


@router.get("/freelancer-only")
def freelancer_route(user = Depends(get_current_freelancer)):
    return {"message": "Hello Freelancer"}


@router.get("/admin-only")
def admin_route(user = Depends(get_current_admin)):
    return {"message": "Hello Admin"}