import httpx
import os
from dotenv import load_dotenv

load_dotenv()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
N8N_REPORT_WEBHOOK_URL = os.getenv("N8N_REPORT_WEBHOOK_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4200")


def trigger_verification_email(email: str, name: str, link: str):
    """
    Sends a POST request to the n8n webhook to trigger the verification email workflow.
    """
    if not N8N_WEBHOOK_URL:
        print("⚠️  N8N_WEBHOOK_URL not set. Skipping email trigger.")
        return

    try:
        payload = {
            "email": email,
            "name": name,
            "link": link
        }
        response = httpx.post(N8N_WEBHOOK_URL, json=payload, timeout=10)
        response.raise_for_status()
        print(f"✅ Verification email triggered for {email}")
    except Exception as e:
        print(f"❌ Failed to trigger n8n webhook: {e}")


def trigger_report_alert(type_: str, id_: int, title: str, count: int):
    """
    Sends a POST request to the n8n webhook to trigger an alert when report count exceeds threshold.
    """
    if not N8N_REPORT_WEBHOOK_URL:
        print("⚠️  N8N_REPORT_WEBHOOK_URL not set. Skipping report alert trigger.")
        return

    try:
        payload = {
            "type": type_,
            "id": id_,
            "title": title,
            "report_count": count,
            "link": f"{FRONTEND_URL}/admin?section=reports&type={type_}&id={id_}"
        }
        response = httpx.post(N8N_REPORT_WEBHOOK_URL, json=payload, timeout=5)
        response.raise_for_status()
        print(f"✅ Report alert triggered for {type_} {id_}")
    except Exception as e:
        print(f"❌ Failed to trigger report alert n8n webhook: {e}")
