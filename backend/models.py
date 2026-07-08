from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from database import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    color = Column(String(20), nullable=False, default="#16a34a")
    modules = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Board(Base):
    __tablename__ = "boards"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    module = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    quarter = Column(String(5), nullable=False)
    year = Column(Integer, nullable=False, default=2026)
    assignee = Column(String(100))
    deadline = Column(String(20))
    description = Column(Text)
    month = Column(Integer)
    week = Column(Integer)
    note_id = Column(String(50))
    project_id = Column(Integer, nullable=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="SET NULL"), nullable=True)

class Note(Base):
    __tablename__ = "notes"
    id = Column(String(50), primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False, default="")
    project_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class KbCollection(Base):
    __tablename__ = "kb_collections"
    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class KbDoc(Base):
    __tablename__ = "kb_docs"
    id = Column(String(50), primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False, default="")
    category = Column(String(100), nullable=False, default="General")
    project_id = Column(Integer, nullable=True)
    collection_id = Column(String(50), nullable=True)
    file_url = Column(String(500), nullable=True)
    file_public_id = Column(String(200), nullable=True)
    file_type = Column(String(20), nullable=True)
    file_size = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author = Column(String(100), nullable=False, default="Me")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProjectMember(Base):
    __tablename__ = "project_members"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="member")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_member"),)
