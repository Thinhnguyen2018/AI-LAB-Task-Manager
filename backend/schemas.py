from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    color: str = "#16a34a"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class ProjectOut(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime
    model_config = {"from_attributes": True}

class TaskBase(BaseModel):
    title: str
    module: str
    status: str = "pending"
    quarter: str
    year: int = 2026
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None
    month: Optional[int] = None
    week: Optional[int] = None
    note_id: Optional[str] = None
    project_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    module: Optional[str] = None
    status: Optional[str] = None
    quarter: Optional[str] = None
    year: Optional[int] = None
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None
    month: Optional[int] = None
    week: Optional[int] = None
    note_id: Optional[str] = None
    project_id: Optional[int] = None

class TaskOut(TaskBase):
    id: int
    model_config = {"from_attributes": True}

class NoteCreate(BaseModel):
    id: str
    title: str
    content: str = ""

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteOut(BaseModel):
    id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class CommentCreate(BaseModel):
    author: str = "Me"
    content: str

class CommentOut(BaseModel):
    id: int
    task_id: int
    author: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}
