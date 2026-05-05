
Deal Risk Analysis Dashboard
How to Run the Project: 

Step 1 — Open the Backend Folder in Terminal
Navigate to the project folder where main.py and requirements.txt are located.

cd deal-risk-dashboard
cd backend


Step 2  — Create the needed  Virtual Environment (venv)
py -m venv venv

Step 3 — Activate the Virtual Environment
venv\Scripts\activate

Once activated, you should see:( venv)

Step 4 — Install Dependencies

Run: pip install -r requirements.txt

If pip does not work, use:
pip3 install -r requirements.txt

Step 5 — Start the Backend Server

Run: uvicorn main:app --reload

The API will run at:
http://127.0.0.1:8000

Then in a second terminal 

Step 6 — Start the Frontend Server
cd deal-risk-dashboard
cd frontend

Then Run: py -m http.server 3000

Step 7 — Open the browser 
http://localhost:3000/login.html


Step 8 - Login Credentials 

Admin Account
Username: sarah.jones
Password: sarah123

Analyst Account
Username: michael.chen
Password: michael123

Viewer Account
Username: emma.clarke
Password: emma123

API  documentation is available at:
http://127.0.0.1:8000/docs

N.B.:
uvicorn only runs the backend API
py -m http.server 3000 runs the frontend
