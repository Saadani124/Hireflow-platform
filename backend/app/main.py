from fastapi import FastAPI
from passlib.context import CryptContext
from app.db.session import engine,SessionLocal

from app.db.base import Base
from app.models.role import Role
from app.models.user import User

# IMPORTANT: Models must be imported before Base.metadata.create_all
# This ensures SQLAlchemy "knows" about your tables before trying to create them.
# from app.models import user, job_listing  

#initialize FastAPI
app = FastAPI(title="HireFlow API")

#creation des tables
Base.metadata.create_all(bind=engine)

#init pwd hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_admins():
    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            return
        ADMIN_USERS = [
            {"name": "Saada", "email": "admin1", "password": "dedsec"},
            {"name": "Aziz", "email": "admin2", "password": "dedsec"},
        ]
        for admin in ADMIN_USERS:
            exists = db.query(User).filter(User.email==admin["email"]).first()
            if not exists:
                hashed_password = pwd_context.hash(admin["password"])
                db.add(User(
                    name=admin["name"],
                    email=admin["email"],
                    password_hash=hashed_password,
                    role_id=admin_role.id
                ))
        db.commit()
        print("✅ Admin users seeded")
    finally:
        db.close()

def seed_roles():
    db = SessionLocal()
    try:
        roles_to_create=["client", "freelancer", "admin"]
        for role_name in roles_to_create:
            exists = db.query(Role).filter(Role.name == role_name).first()
            if not exists:
                db.add(Role(name=role_name))
        db.commit()
        print("✅ Roles seeded")
    finally:
        db.close()

seed_admins()
seed_roles()

#basic 'GET' method
@app.get("/")
def root():
    # Returns a simple JSON response to verify the API is online
    return {"message": "HireFlow API is running"}
