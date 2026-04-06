from pymongo import MongoClient, DESCENDING
from datetime import datetime
import os

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/translatify")

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        _db = _client.get_default_database()
        _db.users.create_index("email", unique=True)
        _db.history.create_index([("user_id", 1), ("created_at", DESCENDING)])
        print("[MongoDB] Connected to:", MONGO_URI)
    return _db

def create_user(name, email, password_hash, role="user"):
    db = get_db()
    doc = {"name": name, "email": email, "password": password_hash, "role": role, "created_at": datetime.utcnow()}
    result = db.users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

def find_user_by_email(email):
    db = get_db()
    return db.users.find_one({"email": email})

def get_all_users():
    db = get_db()
    return [{**u, "_id": str(u["_id"]), "created_at": u["created_at"].isoformat()} for u in db.users.find({}, {"password": 0})]

def update_user_role(email, role):
    db = get_db()
    db.users.update_one({"email": email}, {"$set": {"role": role}})

def delete_user(email):
    db = get_db()
    db.users.delete_one({"email": email})
    db.history.delete_many({"user_email": email})

def save_history(user_id, user_email, entry):
    db = get_db()
    entry.update({"user_id": user_id, "user_email": user_email, "created_at": datetime.utcnow()})
    db.history.insert_one(entry)

def get_history(user_id, limit=20):
    db = get_db()
    docs = db.history.find({"user_id": user_id}, {"_id": 0}).sort("created_at", DESCENDING).limit(limit)
    return [{**d, "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at")} for d in docs]

def get_all_history(limit=100):
    db = get_db()
    docs = db.history.find({}, {"_id": 0}).sort("created_at", DESCENDING).limit(limit)
    return [{**d, "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at")} for d in docs]

def delete_history_entry(user_id, created_at):
    db = get_db()
    db.history.delete_one({"user_id": user_id, "created_at": created_at})

def get_stats():
    db = get_db()
    return {
        "total_users": db.users.count_documents({}),
        "total_translations": db.history.count_documents({}),
        "admin_count": db.users.count_documents({"role": "admin"}),
        "user_count": db.users.count_documents({"role": "user"}),
    }
