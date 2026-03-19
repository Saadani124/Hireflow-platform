from fastapi import FastAPI
from passlib.context import CryptContext
from app.db.session import engine,SessionLocal

from app.db.base import Base
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
                    role="admin"
                ))
        db.commit()
        print("✅ Admin users seeded")
    finally:
        db.close()


seed_admins()

#basic 'GET' method
@app.get("/")
def root():
    # Returns a simple JSON response to verify the API is online
    return {"message": "HireFlow API is running"}
