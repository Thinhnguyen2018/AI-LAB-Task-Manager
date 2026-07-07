from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.sql import func
from typing import List, Optional
from pydantic import BaseModel
import os, httpx, time
import models, schemas
from database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

# Auto-migrate: add columns if missing; create tables
with engine.connect() as conn:
    for col, coltype in [("month", "INTEGER"), ("week", "INTEGER"), ("note_id", "VARCHAR(50)"), ("project_id", "INTEGER")]:
        conn.execute(text(f"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS {col} {coltype}"))
    conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id INTEGER"))
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
    conn.commit()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/tasks", response_model=List[schemas.TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(models.Task).all()

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
    raw = await file.read()
    filename = file.filename or "document"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("txt", "md"):
        content = raw.decode("utf-8", errors="replace")
    elif ext == "pdf":
        try:
            import io
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            content = "\n\n".join(p.extract_text() or "" for p in reader.pages).strip()
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not parse PDF: {e}")
    elif ext in ("docx",):
        try:
            import io
            from docx import Document
            doc = Document(io.BytesIO(raw))
            content = "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not parse DOCX: {e}")
    else:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: .{ext}. Supported: .txt, .md, .pdf, .docx")

    title = filename.rsplit(".", 1)[0] if "." in filename else filename
    doc_id = f"doc-{int(time.time() * 1000)}"
    db_doc = models.KbDoc(id=doc_id, title=title, content=content, category=category, project_id=project_id)
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.get("/projects", response_model=List[schemas.ProjectOut])
def get_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).order_by(models.Project.created_at).all()

@app.post("/projects", response_model=schemas.ProjectOut)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.patch("/projects/{project_id}", response_model=schemas.ProjectOut)
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in project.model_dump(exclude_unset=True).items():
        setattr(db_project, key, value)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(db_project)
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
                    "Return ONLY a valid JSON array of objects with keys 'title' and 'assignee'. "
                    "No markdown, no explanation, just the raw JSON array. "
                    "Be thorough and inclusive — extract EVERY item that implies work to be done, even if implicit."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Extract ALL actionable tasks from the meeting notes below. Include:\n"
                    "- Explicit action items and TODOs\n"
                    "- Features or work being discussed that needs to be done\n"
                    "- Follow-ups, investigations, decisions pending\n"
                    "- Any item mentioning a person doing something\n"
                    "- Any change, migration, or implementation mentioned\n"
                    "Do NOT skip items just because they are written as descriptions or discussion points — if it implies work, include it.\n"
                    "Write each task as a short, clear action title (keep Vietnamese if the note is in Vietnamese).\n"
                    "For 'assignee': extract the person or team name mentioned for that task (in parentheses, after a dash, or implied by context). "
                    "If no assignee is mentioned, use empty string ''.\n"
                    "Return ONLY a JSON array of objects: [{\"title\": \"...\", \"assignee\": \"...\"}, ...]\n\n"
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
