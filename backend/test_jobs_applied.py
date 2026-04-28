import requests

BASE_URL = "http://localhost:8000"

def test():
    # Login as freelancer
    login_data = {"email": "karnit@gmail.com", "password": "karnit"}
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
        
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get jobs
        jobs_response = requests.get(f"{BASE_URL}/jobs/", headers=headers)
        if jobs_response.status_code != 200:
            print(f"Get jobs failed: {jobs_response.text}")
            return
        
        jobs = jobs_response.json()
        applied_jobs = [j for j in jobs if j.get("applied") is True]
        
        print(f"Total jobs: {len(jobs)}")
        print(f"Applied jobs count: {len(applied_jobs)}")
        for j in sorted(applied_jobs, key=lambda x: x['id']):
            print(f"Applied to Job ID: {j['id']} - {j['title']}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
