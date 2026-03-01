from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

#load variables from a .env file
load_dotenv()

#njib connection mn .env file
db = os.environ["DATABASE_URL"]

#create the Engine: the actual manager that talks to your database
engine = create_engine(
    db,
    #tests connections before use: if a connection is dead: it creates a new one
    pool_pre_ping=True 
)

# Create a class: a factory for producing new database sessions
SessionLocal=sessionmaker(
    autocommit=False,  # Transactions won't save until you explicitly call db.commit()
    autoflush=False,   # Won't send SQL to DB until you commit or manually flush
    bind=engine        # Links this session factory to the engine created above
)

def get_db():
    #create a fresh database session from our factory
    db = SessionLocal()
    try:
        #give the session to the caller(FastAPI)
        yield db
    finally:
        #lazm dima nsaker
        db.close()
