import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False

class PasswordReset(BaseModel):
    old_password: str
    new_password: str

class UserProfileUpdate(BaseModel):
    name: str
    email: EmailStr

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# Assignment Schemas
class AssignmentBase(BaseModel):
    title: str
    subject: str
    department: str
    semester: str
    description: Optional[str] = None
    questions: Optional[str] = None
    total_marks: int
    due_date: datetime.datetime

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentResponse(AssignmentBase):
    id: int
    teacher_id: int
    questions_file_path: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Submission Schemas
class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    file_path: Optional[str] = None
    submitted_at: datetime.datetime
    student_name: Optional[str] = None
    assignment_title: Optional[str] = None
    assignment_subject: Optional[str] = None
    total_marks: Optional[int] = None
    has_evaluation: bool = False
    evaluation_status: Optional[str] = None
    final_marks: Optional[float] = None
    grade: Optional[str] = None

    class Config:
        from_attributes = True


# Evaluation Schemas
class AIEvaluationResponse(BaseModel):
    id: int
    submission_id: int
    ai_marks: float
    teacher_marks: Optional[float] = None
    grade: str
    accuracy: float
    completeness: float
    strengths: List[str]
    mistakes: List[str]
    missing_topics: List[str]
    suggestions: List[str]
    overall_feedback: str
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AIEvaluationUpdate(BaseModel):
    teacher_marks: float

class AIEvaluationPublish(BaseModel):
    teacher_marks: float


# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Activity Log Schemas
class ActivityLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    details: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# Analytics & Dashboard Schemas
class TeacherDashboardStats(BaseModel):
    total_assignments: int
    total_students: int
    pending_evaluations: int
    ai_evaluated: int
    published_results: int

class StudentDashboardStats(BaseModel):
    total_assignments: int
    submitted_assignments: int
    pending_feedback: int
    published_results: int

class ClassPerformanceChartData(BaseModel):
    subject: str
    average_marks: float
    highest_marks: float
    lowest_marks: float

class AssignmentPerformanceStats(BaseModel):
    assignment_id: int
    title: str
    subject: str
    average_marks: float
    highest_marks: float
    lowest_marks: float
    submission_count: int
    evaluated_count: int
    published_count: int


# ── New unified dashboard analytics schemas ──────────────────────────────
class AssignmentAverageItem(BaseModel):
    assignment_id: int
    title: str
    subject: str
    total_marks: int
    average_marks: float
    highest_marks: float
    lowest_marks: float
    submission_count: int
    evaluated_count: int
    published_count: int


class StatusMixItem(BaseModel):
    name: str
    value: int
    color: str


class TeacherDashboardAnalytics(BaseModel):
    total_assignments: int
    total_students: int
    pending_reviews: int       # submissions with NO evaluation record yet
    pending_approval: int      # evaluated but not yet published (PENDING status)
    published_results: int     # evaluations with status == PUBLISHED
    assignment_averages: List[AssignmentAverageItem]
    evaluation_status_mix: List[StatusMixItem]
