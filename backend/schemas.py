from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    color: str = "#16a34a"
    modules: list[str] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    modules: Optional[list[str]] = None

class ProjectOut(BaseModel):
    id: int
    name: str
    color: str
    modules: list[str] = []
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
    project_id: Optional[int] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    project_id: Optional[int] = None

class NoteOut(BaseModel):
    id: str
    title: str
    content: str
    project_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class KbDocCreate(BaseModel):
    id: str
    title: str
    content: str = ""
    category: str = "General"
    project_id: Optional[int] = None

class KbDocUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class KbDocOut(BaseModel):
    id: str
    title: str
    content: str
    category: str
    project_id: Optional[int] = None
    file_url: Optional[str] = None
    file_public_id: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
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

class UserRegister(BaseModel):
    email: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class MemberOut(BaseModel):
    id: int
    user_id: int
    project_id: int
    role: str
    email: str
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}

class MemberInvite(BaseModel):
    email: str
    role: str = "member"

class MemberUpdate(BaseModel):
    role: str
