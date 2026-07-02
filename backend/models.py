from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

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

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author = Column(String(100), nullable=False, default="Me")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
