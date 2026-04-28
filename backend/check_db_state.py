from app.db.session import SessionLocal
from app.models.proposal import Proposal
from app.models.job import Job

def check():
    db = SessionLocal()
    try:
        print("Checking Proposals for freelancer 8...")
        props = db.query(Proposal).filter(Proposal.freelancer_id == 8).all()
        for p in props:
            print(f"Proposal ID: {p.id}, Job ID: {p.job_id}, Status: {p.status}")
        
        print("\nChecking Job 5 status...")
        job5 = db.query(Job).filter(Job.id == 5).first()
        if job5:
            print(f"Job 5: Title={job5.title}, Status={job5.status}")
        else:
            print("Job 5 NOT FOUND")

    finally:
        db.close()

if __name__ == "__main__":
    check()
