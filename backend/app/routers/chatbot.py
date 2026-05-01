import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job import Job
from app.models.user import User
from app.models.proposal import Proposal
from app.schemas.chatbot import ChatRequest, ChatResponse
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

@router.post("/ask", response_model=ChatResponse)
def ask_chatbot(request: ChatRequest, db: Session = Depends(get_db)):
    user_message = request.message
    api_key = os.getenv("OPENROUTER_API_KEY")
    print(f"[Chatbot Info] Message received. API Key starts with: {api_key[:10] if api_key else 'None'}...")
    
    if not api_key or api_key == "sk-or-v1-placeholder":
        return ChatResponse(reply="API Key is missing in .env file! 🤖")

    if not user_message:
        raise HTTPException(status_code=400, detail="Message is empty")

    # 1. Fetch Context from Database
    try:
        jobs = db.query(Job).all()
        freelancers = db.query(User).filter(User.role == "freelancer").all()
        
        # 1.1 Extra context for Admins
        admin_stats = ""
        if request.user_role == "admin":
            total_clients = db.query(User).filter(User.role == "client").count()
            total_freelancers = len(freelancers)
            total_proposals = db.query(Proposal).count()
            active_jobs = [j for j in jobs if j.status == "open"]
            admin_stats = f"\nPLATFORM STATS (ADMIN ONLY):\n- Total Clients: {total_clients}\n- Total Freelancers: {total_freelancers}\n- Total Active Jobs: {len(active_jobs)}\n- Total Proposals: {total_proposals}\n"
            
    except Exception as db_err:
        print(f"Database Error: {db_err}")
        return ChatResponse(reply="I can't access the database right now. 🤖")

    # 2. Construct Prompt
    context = f"You are an assistant for HireFlow. User is {request.user_name or 'a Guest'} (Role: {request.user_role or 'unknown'}).\n"
    if admin_stats:
        context += admin_stats
    
    context += "\nHere is the current platform data:\n\n"
    
    context += "Jobs:\n"
    for job in jobs:
        context += f"- {job.title} (Budget: {job.budget}, Status: {job.status})\n"
    
    context += "\nFreelancers:\n"
    for f in freelancers:
        context += f"- {f.name} (Email: {f.email})\n"

    context += "\nUser Question: " + user_message

    # 3. Call OpenRouter
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost",
                "X-Title": "HireFlow",
            },
            json={
                "model": "openai/gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant for HireFlow. Use the provided context to answer questions. Be concise and friendly. Use plain text and line breaks for lists. No markdown unless necessary."},
                    {"role": "user", "content": context},
                ]
            },
            timeout=15
        )
        
        if response.status_code != 200:
            error_msg = response.text
            print(f"OpenRouter Error ({response.status_code}): {error_msg}")
            return ChatResponse(reply=f"AI Error ({response.status_code}): {error_msg[:100]}... 🤖")

        data = response.json()
        if 'choices' not in data:
            return ChatResponse(reply=f"AI returned an unexpected response format: {str(data)[:100]}... 🤖")
            
        reply = data['choices'][0]['message']['content']
        return ChatResponse(reply=reply)

    except requests.exceptions.Timeout:
        return ChatResponse(reply="The AI is taking too long to respond. Please try again. 🤖")
    except Exception as e:
        print(f"Chatbot Exception: {e}")
        return ChatResponse(reply=f"Error: {str(e)[:100]}... 🤖")
