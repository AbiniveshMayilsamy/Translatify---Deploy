import os
import psycopg2
import psycopg2.extras
from datetime import datetime

DATABASE_URL = os.environ.get("DATABASE_URL", "")

_conn = None

def get_db():
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        _conn.autocommit = True
        _init_tables(_conn)
        print("[PostgreSQL] Connected")
    return _conn

def _init_tables(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id          SERIAL PRIMARY KEY,
                name        TEXT NOT NULL,
                email       TEXT UNIQUE NOT NULL,
                password    TEXT NOT NULL,
                role        TEXT NOT NULL DEFAULT 'user',
                created_at  TIMESTAMP DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id          SERIAL PRIMARY KEY,
                user_id     TEXT NOT NULL,
                user_email  TEXT NOT NULL,
                type        TEXT,
                original    TEXT,
                translated  TEXT,
                src_lang    TEXT,
                tgt_lang    TEXT,
                created_at  TIMESTAMP DEFAULT NOW()
            )
        """)

# ── Users ─────────────────────────────────────────────────────────────────────
def create_user(name, email, password_hash, role="user"):
    conn = get_db()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s,%s,%s,%s) RETURNING *",
            (name, email, password_hash, role)
        )
        row = dict(cur.fetchone())
        row["_id"] = str(row["id"])
        return row

def find_user_by_email(email):
    conn = get_db()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        row = cur.fetchone()
        if row:
            row = dict(row)
            row["_id"] = str(row["id"])
        return row

def get_all_users():
    conn = get_db()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC")
        rows = []
        for r in cur.fetchall():
            r = dict(r)
            r["_id"] = str(r["id"])
            r["created_at"] = r["created_at"].isoformat() if r.get("created_at") else None
            rows.append(r)
        return rows

def update_user_role(email, role):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role=%s WHERE email=%s", (role, email))

def delete_user(email):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM history WHERE user_email=%s", (email,))
        cur.execute("DELETE FROM users WHERE email=%s", (email,))

# ── History ───────────────────────────────────────────────────────────────────
def save_history(user_id, user_email, entry):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO history (user_id, user_email, type, original, translated, src_lang, tgt_lang)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (user_id, user_email,
             entry.get("type"), entry.get("original"), entry.get("translated"),
             entry.get("src_lang"), entry.get("tgt_lang"))
        )

def get_history(user_id, limit=20):
    conn = get_db()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM history WHERE user_id=%s ORDER BY created_at DESC LIMIT %s",
            (user_id, limit)
        )
        rows = []
        for r in cur.fetchall():
            r = dict(r)
            r["created_at"] = r["created_at"].isoformat() if r.get("created_at") else None
            rows.append(r)
        return rows

def get_all_history(limit=100):
    conn = get_db()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM history ORDER BY created_at DESC LIMIT %s", (limit,))
        rows = []
        for r in cur.fetchall():
            r = dict(r)
            r["created_at"] = r["created_at"].isoformat() if r.get("created_at") else None
            rows.append(r)
        return rows

def delete_history_entry(user_id, created_at):
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM history WHERE user_id=%s AND created_at=%s", (user_id, created_at))

def get_stats():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM history")
        total_translations = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users WHERE role='admin'")
        admin_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users WHERE role='user'")
        user_count = cur.fetchone()[0]
    return {
        "total_users": total_users,
        "total_translations": total_translations,
        "admin_count": admin_count,
        "user_count": user_count,
    }
