from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.sql import func
from typing import List, Optional
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os, httpx, time
import cloudinary
import cloudinary.uploader

# ── Cloudinary config ──
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "pwulrfvc"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "189474275442255"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "te5CNOWj2OiUbLnlLUv-_qC7zNk"),
    secure=True,
)
import models, schemas
from database import engine, get_db, Base

# ── Auth helpers ──
SECRET_KEY = os.getenv("JWT_SECRET", "changeme-dev-secret-key-32chars!!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_password(pw: str, hashed: str) -> bool:
    return pwd_ctx.verify(pw, hashed)

def create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_member_role(db: Session, project_id: int, user_id: int) -> Optional[str]:
    m = db.query(models.ProjectMember).filter_by(project_id=project_id, user_id=user_id).first()
    return m.role if m else None

def require_project_admin(db: Session, project_id: int, user: models.User):
    role = get_member_role(db, project_id, user.id)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

Base.metadata.create_all(bind=engine)

# Auto-migrate: add columns if missing; create tables
with engine.connect() as conn:
    for col, coltype in [("month", "INTEGER"), ("week", "INTEGER"), ("note_id", "VARCHAR(50)"), ("project_id", "INTEGER")]:
        conn.execute(text(f"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS {col} {coltype}"))
    conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id INTEGER"))
    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS modules TEXT NOT NULL DEFAULT '[]'"))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS notes (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(20) NOT NULL DEFAULT '#16a34a',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS kb_docs (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            category VARCHAR(100) NOT NULL DEFAULT 'General',
            project_id INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(200) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            password_hash VARCHAR(200) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS project_members (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL DEFAULT 'member',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(project_id, user_id)
        )
    """))
    # Migrations for kb_docs Cloudinary columns
    for col, typ in [
        ("file_url", "VARCHAR(500)"),
        ("file_public_id", "VARCHAR(200)"),
        ("file_type", "VARCHAR(20)"),
        ("file_size", "INTEGER"),
    ]:
        try:
            conn.execute(text(f"ALTER TABLE kb_docs ADD COLUMN IF NOT EXISTS {col} {typ}"))
        except Exception:
            pass
    conn.commit()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth endpoints ──

@app.post("/auth/register", response_model=schemas.TokenOut)
def register(body: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(email=body.email.lower(), name=body.name, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    # Only the first registered user auto-joins all existing projects as admin
    is_first_user = db.query(models.User).count() == 1
    if is_first_user:
        for p in db.query(models.Project).all():
            db.add(models.ProjectMember(project_id=p.id, user_id=user.id, role="admin"))
        db.commit()
    return {"access_token": create_token(user.id), "token_type": "bearer", "user": user}

@app.post("/auth/login", response_model=schemas.TokenOut)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_token(user.id), "token_type": "bearer", "user": user}

@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ── Tasks (require auth) ──

@app.get("/tasks", response_model=List[schemas.TaskOut])
def get_tasks(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    member_project_ids = [m.project_id for m in db.query(models.ProjectMember).filter_by(user_id=current_user.id).all()]
    return db.query(models.Task).filter(models.Task.project_id.in_(member_project_ids)).all()

@app.post("/tasks", response_model=schemas.TaskOut)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in task.model_dump(exclude_unset=True).items():
        setattr(db_task, key, value)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()

@app.get("/tasks/{task_id}/comments", response_model=List[schemas.CommentOut])
def get_comments(task_id: int, db: Session = Depends(get_db)):
    return db.query(models.Comment).filter(models.Comment.task_id == task_id).order_by(models.Comment.created_at).all()

@app.post("/tasks/{task_id}/comments", response_model=schemas.CommentOut)
def create_comment(task_id: int, comment: schemas.CommentCreate, db: Session = Depends(get_db)):
    db_comment = models.Comment(task_id=task_id, **comment.model_dump())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

@app.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    db_comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(db_comment)
    db.commit()

@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(db: Session = Depends(get_db)):
    return db.query(models.Note).order_by(models.Note.created_at.desc()).all()

@app.post("/notes", response_model=schemas.NoteOut)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db)):
    db_note = models.Note(**note.model_dump())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.patch("/notes/{note_id}", response_model=schemas.NoteOut)
def update_note(note_id: str, note: schemas.NoteUpdate, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    for key, value in note.model_dump(exclude_unset=True).items():
        setattr(db_note, key, value)
    db_note.updated_at = func.now()
    db.commit()
    db.refresh(db_note)
    return db_note

@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: str, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()

@app.get("/kb", response_model=List[schemas.KbDocOut])
def get_kb_docs(project_id: int = None, db: Session = Depends(get_db)):
    q = db.query(models.KbDoc)
    if project_id is not None:
        q = q.filter(models.KbDoc.project_id == project_id)
    return q.order_by(models.KbDoc.updated_at.desc()).all()

@app.post("/kb", response_model=schemas.KbDocOut)
def create_kb_doc(doc: schemas.KbDocCreate, db: Session = Depends(get_db)):
    db_doc = models.KbDoc(**doc.model_dump())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.patch("/kb/{doc_id}", response_model=schemas.KbDocOut)
def update_kb_doc(doc_id: str, doc: schemas.KbDocUpdate, db: Session = Depends(get_db)):
    db_doc = db.query(models.KbDoc).filter(models.KbDoc.id == doc_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Doc not found")
    for key, value in doc.model_dump(exclude_unset=True).items():
        setattr(db_doc, key, value)
    db_doc.updated_at = func.now()
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.delete("/kb/{doc_id}", status_code=204)
def delete_kb_doc(doc_id: str, db: Session = Depends(get_db)):
    db_doc = db.query(models.KbDoc).filter(models.KbDoc.id == doc_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Doc not found")
    db.delete(db_doc)
    db.commit()

@app.post("/kb/upload", response_model=schemas.KbDocOut)
async def upload_kb_doc(
    file: UploadFile = File(...),
    project_id: Optional[int] = Form(None),
    category: str = Form("General"),
    db: Session = Depends(get_db)
):
    import io
    raw = await file.read()
    filename = file.filename or "document"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    title = filename.rsplit(".", 1)[0] if "." in filename else filename
    file_size = len(raw)

    ALLOWED = {"txt", "md", "pdf", "docx", "png", "jpg", "jpeg", "gif", "xlsx", "pptx"}
    if ext not in ALLOWED:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: .{ext}")

    # ── Upload to Cloudinary ──
    resource_type = "image" if ext in ("png", "jpg", "jpeg", "gif") else "raw"
    try:
        upload_result = cloudinary.uploader.upload(
            raw,
            public_id=f"taskflow/kb/{int(time.time() * 1000)}_{title[:40]}",
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
            overwrite=False,
        )
        file_url = upload_result.get("secure_url", "")
        file_public_id = upload_result.get("public_id", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {e}")

    # ── Extract text for search/preview ──
    content = ""
    if ext in ("txt", "md"):
        content = raw.decode("utf-8", errors="replace")
    elif ext == "pdf":
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            content = "\n\n".join(p.extract_text() or "" for p in reader.pages).strip()
        except Exception:
            content = ""
    elif ext == "docx":
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(io.BytesIO(raw))
            content = "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            content = ""

    doc_id = f"doc-{int(time.time() * 1000)}"
    db_doc = models.KbDoc(
        id=doc_id, title=title, content=content, category=category,
        project_id=project_id, file_url=file_url, file_public_id=file_public_id,
        file_type=ext, file_size=file_size,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.get("/projects", response_model=List[schemas.ProjectOut])
def get_projects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    member_project_ids = [m.project_id for m in db.query(models.ProjectMember).filter_by(user_id=current_user.id).all()]
    projects = db.query(models.Project).filter(models.Project.id.in_(member_project_ids)).order_by(models.Project.created_at).all()
    return [_project_out(p) for p in projects]

@app.post("/projects", response_model=schemas.ProjectOut)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    import json
    data = project.model_dump()
    data['modules'] = json.dumps(data.get('modules', []))
    db_project = models.Project(**data)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    db.add(models.ProjectMember(project_id=db_project.id, user_id=current_user.id, role="admin"))
    db.commit()
    return _project_out(db_project)

def _project_out(p: models.Project) -> schemas.ProjectOut:
    import json
    mods = []
    try: mods = json.loads(p.modules or "[]")
    except: pass
    return schemas.ProjectOut(id=p.id, name=p.name, color=p.color, modules=mods, created_at=p.created_at)

@app.patch("/projects/{project_id}", response_model=schemas.ProjectOut)
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    import json
    require_project_admin(db, project_id, current_user)
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = project.model_dump(exclude_unset=True)
    if 'modules' in data:
        data['modules'] = json.dumps(data['modules'])
    for key, value in data.items():
        setattr(db_project, key, value)
    db.commit()
    db.refresh(db_project)
    return _project_out(db_project)

@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_project_admin(db, project_id, current_user)
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(db_project)
    db.commit()

# ── Project members ──

@app.get("/projects/{project_id}/members", response_model=List[schemas.MemberOut])
def get_members(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not get_member_role(db, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member")
    members = db.query(models.ProjectMember).filter_by(project_id=project_id).all()
    result = []
    for m in members:
        user = db.query(models.User).filter_by(id=m.user_id).first()
        result.append(schemas.MemberOut(id=m.id, user_id=m.user_id, project_id=m.project_id, role=m.role, email=user.email, name=user.name, created_at=m.created_at))
    return result

@app.post("/projects/{project_id}/members", response_model=schemas.MemberOut)
def invite_member(project_id: int, body: schemas.MemberInvite, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_project_admin(db, project_id, current_user)
    user = db.query(models.User).filter(models.User.email == body.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. They must register first.")
    existing = db.query(models.ProjectMember).filter_by(project_id=project_id, user_id=user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    m = models.ProjectMember(project_id=project_id, user_id=user.id, role=body.role)
    db.add(m)
    db.commit()
    db.refresh(m)
    return schemas.MemberOut(id=m.id, user_id=m.user_id, project_id=m.project_id, role=m.role, email=user.email, name=user.name, created_at=m.created_at)

@app.patch("/projects/{project_id}/members/{user_id}", response_model=schemas.MemberOut)
def update_member(project_id: int, user_id: int, body: schemas.MemberUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_project_admin(db, project_id, current_user)
    m = db.query(models.ProjectMember).filter_by(project_id=project_id, user_id=user_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    m.role = body.role
    db.commit()
    db.refresh(m)
    user = db.query(models.User).filter_by(id=user_id).first()
    return schemas.MemberOut(id=m.id, user_id=m.user_id, project_id=m.project_id, role=m.role, email=user.email, name=user.name, created_at=m.created_at)

@app.delete("/projects/{project_id}/members/{user_id}", status_code=204)
def remove_member(project_id: int, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_project_admin(db, project_id, current_user)
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    m = db.query(models.ProjectMember).filter_by(project_id=project_id, user_id=user_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()

class ExtractRequest(BaseModel):
    content: str

@app.post("/extract-tasks")
async def extract_tasks(req: ExtractRequest):
    api_key = os.getenv("GREENNODE_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="GREENNODE_API_KEY not configured")
    payload = {
        "model": "minimax/minimax-m2.5",
        "messages": [
            {
                "role": "assistant",
                "content": (
                    "You are an expert at extracting actionable work items from Vietnamese and English meeting notes. "
                    "Return ONLY a valid JSON array of objects with keys 'title', 'description', and 'assignee'. "
                    "No markdown, no explanation, just the raw JSON array."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Extract the top-level actionable tasks from the meeting notes below.\n"
                    "IMPORTANT rules:\n"
                    "- Each task should be a distinct, standalone work item.\n"
                    "- 'title': short and concise (5-8 words max). Do NOT include sub-item details or long parenthetical breakdowns in the title.\n"
                    "- 'description': put the breakdown details, sub-bullets, or specifications here. If the note has sub-bullets under a task, list them in description. If no details, use empty string ''.\n"
                    "- Example: note says 'Tạo data sample (10,000 sample)' with sub-bullets '5,000 AI Gen', '1,000 keyword ngành', '2,000 câu 5-10 từ' → title: 'Tạo data sample 10,000 samples', description: '- 5,000 AI Gen\\n- 1,000 keyword ngành\\n- 2,000 câu 5-10 từ'\n"
                    "- Bullet sub-items are details of their parent, NOT separate tasks.\n"
                    "- Keep Vietnamese if the note is in Vietnamese.\n"
                    "For 'assignee': extract the person or team name (in parentheses, after a dash, or implied). Use empty string '' if none.\n"
                    "Return ONLY a JSON array: [{\"title\": \"...\", \"description\": \"...\", \"assignee\": \"...\"}, ...]\n\n"
                    f"Meeting notes:\n{req.content}"
                ),
            },
        ],
        "max_tokens": 1500,
        "temperature": 0.3,
        "top_p": 0.95,
        "presence_penalty": 0,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    data = r.json()
    text_out = data["choices"][0]["message"]["content"]
    import re, json as json_lib
    match = re.search(r'\[[\s\S]*\]', text_out)
    if not match:
        raise HTTPException(status_code=500, detail="No task list in AI response")
    raw = json_lib.loads(match.group())
    tasks = []
    for t in raw:
        if isinstance(t, str):
            tasks.append({"title": t.strip(), "assignee": ""})
        elif isinstance(t, dict) and t.get("title", "").strip():
            tasks.append({"title": t["title"].strip(), "assignee": (t.get("assignee") or "").strip()})
    return {"tasks": tasks}

@app.post("/seed")
def seed(db: Session = Depends(get_db)):
    db.query(models.Task).delete()
    db.commit()
    tasks = [
        # GreenRAG - Q2
        {"title": "Benchmark OpenRAG", "module": "GreenRAG", "status": "done", "quarter": "Q2", "year": 2026, "month": 5},
        {"title": "Dashboard golden dataset", "module": "GreenRAG", "status": "done", "quarter": "Q2", "year": 2026, "month": 6},
        {"title": "Automation benchmark", "module": "GreenRAG", "status": "done", "quarter": "Q2", "year": 2026, "month": 6},
        {"title": "Tìm thêm public dataset", "module": "GreenRAG", "status": "done", "quarter": "Q2", "year": 2026, "month": 6},
        # GreenRAG - Q3
        {"title": "Table chunking & query", "module": "GreenRAG", "status": "progress", "quarter": "Q3", "year": 2026, "month": 7, "assignee": "Team", "deadline": "2026-06-30"},
        {"title": "Kiến trúc RAG Engine", "module": "GreenRAG", "status": "progress", "quarter": "Q3", "year": 2026, "month": 7, "assignee": "Team", "deadline": "2026-09-15"},
        {"title": "Testing RAG Performance", "module": "GreenRAG", "status": "pending", "quarter": "Q3", "year": 2026, "month": 8},
        {"title": "Multi-tenant + RBAC", "module": "GreenRAG", "status": "pending", "quarter": "Q3", "year": 2026, "month": 8},
        # Doc-Intelli - Q2
        {"title": "OCR service — HN", "module": "Doc-Intelli", "status": "done", "quarter": "Q2", "year": 2026, "month": 6},
        # Doc-Intelli - Q3
        {"title": "Pipeline preprocessing", "module": "Doc-Intelli", "status": "progress", "quarter": "Q3", "year": 2026, "month": 7, "assignee": "Thành+Hoàng", "deadline": "2026-05-30"},
        # Infra - Q2
        {"title": "PostgreSQL migration", "module": "Infra", "status": "done", "quarter": "Q2", "year": 2026, "month": 4},
        {"title": "Hạ tầng production", "module": "Infra", "status": "done", "quarter": "Q2", "year": 2026, "month": 4},
        # Infra - Q3
        {"title": "Migrate sang cloud", "module": "Infra", "status": "pending", "quarter": "Q3", "year": 2026, "month": 7},
        {"title": "Message Queue Architecture", "module": "Infra", "status": "progress", "quarter": "Q3", "year": 2026, "month": 7, "assignee": "Team", "deadline": "2026-09-10"},
        # Integration - Q3
        {"title": "Authen MCP — Kim", "module": "Integration", "status": "pending", "quarter": "Q3", "year": 2026, "month": 7},
        # Release - Q3
        {"title": "Release GreenRag v2.0", "module": "Release", "status": "pending", "quarter": "Q3", "year": 2026, "month": 7},
    ]
    for t in tasks:
        db.add(models.Task(**t))
    db.commit()
    return {"message": f"Seeded {len(tasks)} tasks"}
