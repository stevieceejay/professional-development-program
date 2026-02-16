import requests
import json
import os

# Configuration
BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:5000")  # Adjust to your backend URL
API_URL = f"{BASE_URL}/api"

# Test user credentials - Bob from seed data
TEST_USER = {
    "username": "bob",
    "email": "bob@example.test",
    "password": os.environ.get("TEST_USER_PASSWORD")
}

if not TEST_USER["password"]:
    print("✗ TEST_USER_PASSWORD environment variable is not set. Set it before running this test.")
    exit(2)
}

def test_user_login():
    """Test user login and get auth token"""
    response = requests.post(f"{API_URL}/auth/login", json={
        "username": TEST_USER["username"],
        "password": TEST_USER["password"]
    })
    
    if response.status_code == 200:
        token = response.json().get("token")
        print(f"✓ Login successful. Token: {token[:20]}...")
        return token
    else:
        print(f"✗ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_submit_assignment(token, assignment_id):
    """Test submitting an assignment as a user"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Week 1 MBTI & Career Interest submission
    submission_data = {
        "assignment_id": assignment_id,
        "content": """My MBTI personality type is ISTJ - The Logistician.

I am interested in pursuing a career in backend software development and systems architecture. I enjoy building robust, efficient systems and solving complex technical problems. My goal is to become a senior backend engineer working on scalable enterprise applications.""",
        "files": []
    }
    
    response = requests.post(
        f"{API_URL}/assignments/{assignment_id}/submit",
        headers=headers,
        json=submission_data
    )
    
    if response.status_code in [200, 201]:
        print(f"✓ Submission successful")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"✗ Submission failed: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    print("Testing user task submission...\n")
    
    # Step 1: Login
    token = test_user_login()
    
    if token:
        # Step 2: Submit Week 1 assignment (use the ID from create_week1_assignment.py)
        test_submit_assignment(token, assignment_id=1)