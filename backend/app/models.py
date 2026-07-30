import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'teacher' or 'student'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    assignments = relationship("Assignment", back_populates="teacher", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    semester = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    questions = Column(Text, nullable=True)  # Store text questions or extracted questions text
    questions_file_path = Column(String(500), nullable=True)  # Store file path if PDF/DOCX is uploaded
    total_marks = Column(Integer, nullable=False)
    due_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    teacher = relationship("User", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=True)
    extracted_text = Column(Text, nullable=True)  # Save parsed content for evaluation
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
    ai_evaluation = relationship("AIEvaluation", back_populates="submission", uselist=False, cascade="all, delete-orphan")


class AIEvaluation(Base):
    __tablename__ = "ai_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), unique=True, nullable=False)
    ai_marks = Column(Float, nullable=False)
    teacher_marks = Column(Float, nullable=True)  # Final marks published by teacher
    grade = Column(String(10), nullable=False)
    accuracy = Column(Float, nullable=False)  # Accuracy percentage
    completeness = Column(Float, nullable=False)  # Completeness percentage
    strengths = Column(Text, nullable=False)  # JSON-encoded array of strengths
    mistakes = Column(Text, nullable=False)  # JSON-encoded array of mistakes/errors
    missing_topics = Column(Text, nullable=False)  # JSON-encoded array of missing topics
    suggestions = Column(Text, nullable=False)  # JSON-encoded array of suggestions
    overall_feedback = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING")  # 'PENDING' or 'PUBLISHED'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    submission = relationship("Submission", back_populates="ai_evaluation")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="logs")
