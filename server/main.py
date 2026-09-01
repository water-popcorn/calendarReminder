from __future__ import annotations

import json
import os
import re
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "calendar.db")))
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

app = FastAPI(title="Calendar Reminder Local Server", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.on_event("startup")
def startup() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL COLLATE NOCASE,
              password_hash TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS requests (
              id TEXT PRIMARY KEY, user_id TEXT, source_type TEXT NOT NULL,
              source_text TEXT NOT NULL, status TEXT NOT NULL, result_json TEXT,
              created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            """
        )


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ParseBody(BaseModel):
    requestId: str = Field(min_length=4, max_length=100)
    text: str = Field(min_length=1, max_length=10000)
    locale: str = "zh-CN"
    now: datetime
    timezone: str = "Asia/Shanghai"


def current_user(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    with db() as conn:
        row = conn.execute("SELECT user_id, expires_at FROM sessions WHERE token=?", (authorization[7:],)).fetchone()
    if not row or datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
        return None
    return row["user_id"]


def issue_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    with db() as conn:
        conn.execute(
            "INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)",
            (token, user_id, (datetime.utcnow() + timedelta(days=30)).isoformat()),
        )
    return token


def parse_event(body: ParseBody) -> dict[str, Any]:
    text = re.sub(r"\s+", " ", body.text).strip()
    title = text[:80]
    anchor: datetime | None = None
    patterns = [
        r"(?P<m>\d{1,2})月(?P<d>\d{1,2})日(?:[^0-9]{0,8})(?P<h>\d{1,2})[:：](?P<min>\d{2})",
        r"(?P<m>\d{1,2})/(?P<d>\d{1,2})(?:[^0-9]{0,8})(?P<h>\d{1,2})[:：](?P<min>\d{2})",
        r"\b(?P<m>\d{1,2})[/-](?P<d>\d{1,2})\s+(?P<h>\d{1,2}):(?P<min>\d{2})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        try:
            anchor = body.now.replace(month=int(match["m"]), day=int(match["d"]), hour=int(match["h"]), minute=int(match["min"]), second=0, microsecond=0)
            break
        except ValueError:
            continue
    if anchor:
        event = {
            "title": title,
            "anchorTime": anchor.isoformat(),
            "startTime": (anchor - timedelta(hours=1)).isoformat(),
            "endTime": (anchor + timedelta(hours=1)).isoformat(),
            "dueTime": None,
            "allDay": False,
            "timezone": body.timezone,
            "location": None,
            "notes": text,
            "recurrence": None,
            "confidence": 0.72,
            "missingFields": [],
        }
        return {"events": [event], "warnings": ["规则解析结果，请核对字段"]}
    missing = ["time"]
    if not re.search(r"(20\d{2}|19\d{2}|年)", text):
        missing.append("year")
    if not re.search(r"(\d{1,2}月|\d{1,2}[/-]\d{1,2})", text):
        missing.extend(["month", "day"])
    event = {
        "title": title,
        "anchorTime": None,
        "startTime": None,
        "endTime": None,
        "dueTime": None,
        "allDay": True,
        "timezone": body.timezone,
        "location": None,
        "notes": text,
        "recurrence": None,
        "confidence": 0.55,
        "missingFields": sorted(set(missing)),
    }
    return {"events": [event], "warnings": ["未识别到明确时间，请确认全天日期"]}


@app.get("/api/v1/health")
def health() -> dict[str, Any]:
    return {"data": {"api": "ok", "database": DB_PATH.exists(), "model": "rule-fallback", "version": app.version}}


@app.post("/api/v1/auth/register")
def register(body: RegisterBody) -> dict[str, Any]:
    user_id = str(uuid.uuid4())
    try:
        with db() as conn:
            conn.execute("INSERT INTO users(id,email,password_hash,created_at) VALUES(?,?,?,?)", (user_id, body.email, pwd_context.hash(body.password), datetime.utcnow().isoformat()))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "邮箱已注册")
    return {"data": {"userId": user_id, "verificationRequired": False}}


@app.post("/api/v1/auth/login")
def login(body: LoginBody) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT id,password_hash FROM users WHERE email=?", (body.email,)).fetchone()
    if not row or not pwd_context.verify(body.password, row["password_hash"]):
        raise HTTPException(401, "邮箱或密码错误")
    return {"data": {"accessToken": issue_token(row["id"]), "expiresIn": 2592000}}


@app.post("/api/v1/auth/logout")
def logout(authorization: str | None = Header(default=None)) -> dict[str, bool]:
    if authorization and authorization.startswith("Bearer "):
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token=?", (authorization[7:],))
    return {"data": {"ok": True}}


@app.post("/api/v1/parse")
def parse(body: ParseBody, user_id: str | None = Depends(current_user)) -> dict[str, Any]:
    result = parse_event(body)
    now = datetime.utcnow().isoformat()
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO requests(id,user_id,source_type,source_text,status,result_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
            (body.requestId, user_id, "text", body.text, "PARSED", json.dumps(result, ensure_ascii=False), now, now),
        )
    return {"data": {"requestId": body.requestId, **result, "modelVersion": "rule-fallback-0.1", "needsConfirmation": True}}


@app.get("/api/v1/requests/{request_id}")
def get_request(request_id: str, user_id: str | None = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM requests WHERE id=? AND (user_id=? OR user_id IS NULL)", (request_id, user_id)).fetchone()
    if not row:
        raise HTTPException(404, "请求不存在")
    return {"data": {"requestId": row["id"], "status": row["status"], "result": json.loads(row["result_json"] or "{}")}}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=os.getenv("SERVER_HOST", "0.0.0.0"), port=int(os.getenv("SERVER_PORT", "21512")), reload=False)
