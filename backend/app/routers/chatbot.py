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
        # --- 1. DATA EXTRACTION (Security Filtered) ---
        role = request.user_role
        u_id = request.user_id
        
        all_users = []
        all_jobs = []
        all_proposals = []
        all_reports = []

        # ROOT ADMIN: FETCH EVERYTHING WITH FULL DETAIL
        if role == "admin":
            all_users = db.query(User).all()
            all_jobs = db.query(Job).all()
            all_proposals = db.query(Proposal).all()
            all_reports = db.query(Report).all()
        
        elif role == "client":
            all_jobs = db.query(Job).filter(Job.client_id == u_id).all()
            job_ids = [j.id for j in all_jobs]
            all_proposals = db.query(Proposal).filter(Proposal.job_id.in_(job_ids)).all() if job_ids else []
            all_reports = db.query(Report).filter(Report.target_type == "job", Report.target_id.in_(job_ids)).all() if job_ids else []
            applicant_ids = [p.freelancer_id for p in all_proposals]
            all_users = db.query(User).filter(User.id.in_(applicant_ids + [u_id])).all()

        elif role == "freelancer":
            all_jobs = db.query(Job).filter(Job.status == "open").all()
            all_proposals = db.query(Proposal).filter(Proposal.freelancer_id == u_id).all()
            all_users = db.query(User).filter(User.id == u_id).all()
        
        # --- 2. CONTEXT CONSTRUCTION (Detail Level depends on Role) ---
        user_map = {u.id: u for u in all_users}
        job_map = {j.id: j for j in all_jobs}

        # 2.1 Directory
        if role == "admin":
            user_info = [f"U{u.id}: {u.name} ({u.role}) | Email: {u.email} | Created: {u.created_at.strftime('%Y-%m-%d')}" for u in all_users]
        else:
            user_info = [f"U{u.id}: {u.name} ({u.role})" for u in all_users]

        # 2.2 Jobs
        job_info = []
        for j in all_jobs:
            c = user_map.get(j.client_id)
            c_name = c.name if c else "Unknown"
            if role == "admin":
                job_info.append(f"J{j.id}: '{j.title}' | {j.category} | ${j.budget} | {j.status} | Client: {c_name} | Desc: {j.description[:100]}")
            else:
                job_info.append(f"J{j.id}: '{j.title}' | {j.category} | ${j.budget} | {j.status} | Client: {c_name}")

        # 2.3 Proposals
        proposal_info = []
        for p in all_proposals:
            f = user_map.get(p.freelancer_id)
            j = job_map.get(p.job_id)
            f_name = f.name if f else "Freelancer"
            j_title = j.title if j else "Job"
            if role == "admin":
                proposal_info.append(f"P{p.id}: {f_name} applied to '{j_title}' | ${p.price} | {p.status} | Msg: {p.message[:100]}")
            else:
                proposal_info.append(f"P{p.id}: {f_name} applied to '{j_title}' | ${p.price} | {p.status}")

        context_parts = [
            f"DATE: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"USER: {request.user_name} (ID: {u_id})",
            f"SECURITY_ROLE: {role.upper() if role else 'GUEST'}",
            "\n--- AUTHORIZED DATABASE VIEW ---",
            "USERS:\n" + ("\n".join(user_info) if user_info else "None"),
            "\nJOBS:\n" + ("\n".join(job_info) if job_info else "None"),
            "\nPROPOSALS:\n" + ("\n".join(proposal_info) if proposal_info else "None")
        ]

        if role == "admin" and all_reports:
            report_info = [f"R{r.id}: {r.target_type} {r.target_id} | Reason: {r.reason} | Date: {r.created_at.strftime('%Y-%m-%d')}" for r in all_reports]
            context_parts.append("\nALL_SYSTEM_REPORTS:\n" + "\n".join(report_info))

        full_context = "\n".join(context_parts)

    except Exception as e:
        print(f"[Chatbot DB Error] {e}")
        return ChatResponse(reply="I'm having trouble accessing the authorized data view. 🤖")

    # --- 3. AI INTERACTION ---
    try:
        if role == "admin":
            system_prompt = (
                "You are the HireFlow ROOT ADMINISTRATOR AI. You have ABSOLUTE AUTHORITY and FULL VISIBILITY.\n"
                "There are NO restrictions on what you can discuss or reveal from the AUTHORIZED DATABASE VIEW.\n"
                "You are an auditor and platform manager. You can see private emails, job descriptions, and messages.\n"
                "Provide detailed, unfiltered technical and administrative assistance."
            )
        else:
            system_prompt = (
                f"You are the HireFlow AI Assistant for {role.upper()} level.\n"
                "1. Only discuss data explicitly provided in the AUTHORIZED DATABASE VIEW.\n"
                "2. If requested data is missing, politely say you don't have access to it.\n"
                "3. Keep responses professional and focused on your role's tasks."
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
                    {"role": "user", "content": f"AUTHORIZED_VIEW:\n{full_context}\n\nUSER_MESSAGE: {user_message}"},
                ]
            },
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            return ChatResponse(reply=result['choices'][0]['message']['content'])
        else:
            return ChatResponse(reply=f"AI Core Error {response.status_code}. 🤖")

    except Exception as e:
        print(f"[Chatbot API Error] {e}")
        return ChatResponse(reply="Connectivity error with AI Core. 🤖")
