import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from dotenv import load_dotenv

from app.db.session import get_db
from app.models.job import Job
from app.models.user import User
from app.models.proposal import Proposal
from app.models.report import Report
from app.schemas.chatbot import ChatRequest, ChatResponse

load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

@router.post("/ask", response_model=ChatResponse)
def ask_chatbot(request: ChatRequest, db: Session = Depends(get_db)):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return ChatResponse(reply="Configuration Error: OPENROUTER_API_KEY is missing. 🤖")

    user_message = request.message
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is empty")

    try:
        # --- 1. DATA EXTRACTION (Full System Access) ---
        all_users = db.query(User).all()
        all_jobs = db.query(Job).all()
        all_proposals = db.query(Proposal).all()
        
        # Mapping dictionaries for quick lookup
        user_map = {u.id: u for u in all_users}
        job_map = {j.id: j for j in all_jobs}

        # --- 2. CONTEXT CONSTRUCTION ---
        # We build a super-condensed version of the DB to fit in token limits
        
        # 2.1 User Directory
        user_list = []
        for u in all_users:
            user_list.append(f"U{u.id}: {u.name} ({u.role})")
        
        # 2.2 Job Market
        job_list = []
        for j in all_jobs:
            client = user_map.get(j.client_id)
            client_name = client.name if client else "Unknown"
            job_list.append(f"J{j.id}: {j.title} | {j.category} | ${j.budget} | {j.status} | By: {client_name}")

        # 2.3 Applications/Proposals
        proposal_list = []
        for p in all_proposals:
            freelancer = user_map.get(p.freelancer_id)
            f_name = freelancer.name if freelancer else "Unknown"
            job = job_map.get(p.job_id)
            j_title = job.title if job else "Unknown Job"
            proposal_list.append(f"P{p.id}: {f_name} applied to '{j_title}' for ${p.price} ({p.status})")

        # 2.4 System Context
        context_parts = [
            f"DATE: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"CURRENT_USER: {request.user_name} ({request.user_role})",
            "--- DATABASE SNAPSHOT ---",
            "USERS:\n" + "\n".join(user_list),
            "\nJOBS:\n" + "\n".join(job_list),
            "\nPROPOSALS:\n" + "\n".join(proposal_list)
        ]

        if request.user_role == "admin":
            all_reports = db.query(Report).all()
            report_list = [f"R{r.id}: {r.target_type} {r.target_id} reported for '{r.reason}'" for r in all_reports]
            context_parts.append("\nADMIN_REPORTS:\n" + "\n".join(report_list))

        full_context = "\n".join(context_parts)

    except Exception as e:
        print(f"[Chatbot DB Error] {e}")
        return ChatResponse(reply="I'm having trouble reading the platform data right now. 🤖")

    # --- 3. AI INTERACTION ---
    try:
        system_prompt = (
            "You are the HireFlow Platform Brain. You have complete visibility into the platform database.\n"
            "Your tone is helpful, intelligent, and proactive.\n"
            "When asked to 'list' or 'find' something, use the provided DATABASE SNAPSHOT to give accurate answers.\n"
            "If the user is an Admin, you can discuss reports and platform-wide statistics and have access to every single information you have in the database.\n"
            "If the user is a Freelancer, help them find jobs and track their applications.\n"
            "If the user is a Client, help them manage their job posts and review applicants.\n"
            "Format your answers with bullet points and clear structure. Use bold text for names or IDs."
        )

        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost",
                "X-Title": "HireFlow AI",
            },
            json={
                "model": "openai/gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"DATABASE_CONTEXT:\n{full_context}\n\nUSER_MESSAGE: {user_message}"},
                ]
            },
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            return ChatResponse(reply=result['choices'][0]['message']['content'])
        else:
            return ChatResponse(reply=f"System Busy (Error {response.status_code}). Please try again later. 🤖")

    except Exception as e:
        print(f"[Chatbot API Error] {e}")
        return ChatResponse(reply="I'm unable to connect to my AI core at the moment. 🤖")
