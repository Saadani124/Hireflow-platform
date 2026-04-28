from app.db.session import SessionLocal
from app.models.job import Job
from app.models.proposal import Proposal
from app.models.notification import Notification
from app.models.report import Report
import random
from datetime import datetime

def seed():
    db = SessionLocal()
    try:
        print("Clearing old data...")
        db.query(Report).delete()
        db.query(Notification).delete()
        db.query(Proposal).delete()
        db.query(Job).delete()
        db.commit()

        print("Seeding large quantity of jobs...")
        # Clients from SQL: 6 (aziz), 7 (saadani), 10 (shady)
        client_ids = [6, 7, 10]
        categories = ["Web Development", "UI/UX Design", "Content Writing", "Mobile App Development", "Data Analysis", "Graphic Design", "Cybersecurity", "DevOps"]
        
        job_titles = [
            "Build a {tech} Website", "Create a {tech} Dashboard", "Design a {tech} Logo",
            "Write {tech} Documentation", "Develop a {tech} Mobile App", "Optimize {tech} Performance",
            "Audit {tech} Security", "Setup {tech} Pipeline", "Analyze {tech} Data"
        ]
        techs = ["React", "Angular", "FastAPI", "Python", "Docker", "AWS", "Figma", "Node.js", "Vue", "Flutter"]

        jobs = []
        for i in range(1, 51):
            title = random.choice(job_titles).format(tech=random.choice(techs))
            jobs.append(Job(
                id=i,
                title=f"{title} #{i}",
                description=f"This is a sample description for the job {title}. We are looking for an expert who can deliver high-quality results in a timely manner.",
                budget=random.randint(50, 1000),
                category=random.choice(categories),
                client_id=random.choice(client_ids),
                status="open"
            ))
        
        for j in jobs:
            db.add(j)
        db.commit()

        print("Seeding proposals...")
        # Freelancers from SQL: 8 (karnit67), 11 (omar), 13 (pytest999)
        freelancer_ids = [8, 11, 13]
        
        # Add some proposals for freelancer 8 to test "Applied" status
        for i in range(1, 11): # Apply to first 10 jobs
            db.add(Proposal(
                job_id=i,
                freelancer_id=8,
                message=f"I'm very interested in job #{i}. I have the skills you need!",
                price=random.randint(50, 1000),
                status="pending"
            ))
        
        # Add some random proposals for other freelancers
        for i in range(11, 21):
            db.add(Proposal(
                job_id=i,
                freelancer_id=random.choice([11, 13]),
                message="Applying for this cool opportunity!",
                price=random.randint(50, 1000),
                status="pending"
            ))

        db.commit()
        print(f"Seed complete! 50 jobs and 20 proposals created.")
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
