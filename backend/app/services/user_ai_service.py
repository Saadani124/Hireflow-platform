import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

class UserAIService:
    @staticmethod
    def generate_bio(answers: dict) -> str:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            return "Professional Freelancer (API Key Missing)"

        prompt = f"""
        You are a professional profile writer. Create a compelling, high-impact freelancer bio based on these answers:
        - Professional Title: {answers.get('title')}
        - Top Skills: {answers.get('skills')}
        - Experience: {answers.get('experience')} years
        - Achievement: {answers.get('achievement')}
        - Desired Tone: {answers.get('tone', 'Professional')}

        Requirements:
        1. Keep it between 150-300 words.
        2. Use the specified tone.
        3. Make it professional and persuasive for clients.
        4. Do NOT use placeholders.
        """

        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key.strip()}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are an expert copywriter for professional freelancers."},
                        {"role": "user", "content": prompt},
                    ]
                },
                timeout=20
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content'].strip()
            return "Failed to generate bio. Please try again."

        except Exception as e:
            print(f"[AI Bio Gen Error] {e}")
            return "Connectivity error with AI Core."

    @staticmethod
    def summarize_bio(bio: str) -> list[str]:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key or not bio:
            return []

        prompt = f"""
        Summarize the following freelancer bio into 3-5 short, punchy professional points or skills.
        Each point should be a single line, no more than 10 words.
        Focus on achievements, core stack, and years of experience.

        BIO:
        {bio}

        Return ONLY a JSON list of strings. Example: ["5+ Years React Expert", "Built 20+ Mobile Apps", "Fluent in English & French"]
        """

        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key.strip()}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a recruitment specialist. Extract key highlights as JSON."},
                        {"role": "user", "content": prompt},
                    ]
                },
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                return json.loads(content)
            return []

        except Exception as e:
            print(f"[AI Summary Error] {e}")
            return []
