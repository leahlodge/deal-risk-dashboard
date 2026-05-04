from database import SessionLocal
import models
from auth import hash_password

db = SessionLocal()

users = [
    {
        "username": "sarah.jones",
        "password_hash": hash_password("sarah123"),
        "role": "admin"
    },
    {
        "username": "michael.chen",
        "password_hash": hash_password("michael123"),
        "role": "analyst"
    },
    {
        "username": "david.smith",
        "password_hash": hash_password("david123"),
        "role": "analyst"
    },
    {
        "username": "emma.clarke",
        "password_hash": hash_password("emma123"),
        "role": "viewer"
    },
    {
        "username": "james.wilson",
        "password_hash": hash_password("james123"),
        "role": "viewer"
    }
]

for user_data in users:
    existing_user = db.query(models.User).filter(
        models.User.username == user_data["username"]
    ).first()

    if existing_user:
        existing_user.password_hash = user_data["password_hash"]
        existing_user.role = user_data["role"]
    else:
        new_user = models.User(**user_data)
        db.add(new_user)

db.commit()
db.close()

print("Users created successfully")