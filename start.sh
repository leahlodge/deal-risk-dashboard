# bin/bash

#  Kill anything already on these ports 
kill -9 $(lsof -t -i:8000) 2>/dev/null
kill -9 $(lsof -t -i:3000) 2>/dev/null

echo "Starting backend"
cd /Users/leahlodge/project/backend
source venv/bin/activate
uvicorn main:app --reload &

sleep 2

echo "Starting frontend"
cd /Users/leahlodge/project/frontend
python3 -m http.server 3000