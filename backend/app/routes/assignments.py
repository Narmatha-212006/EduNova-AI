import os
import shutil
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Assignment
from ..schemas import AssignmentResponse
from ..auth_jwt import get_current_user, get_teacher_user
from ..utils.file_parser import extract_text_from_file
from ..utils.helpers import log_activity

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])

# Create Upload Directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    title: str = Form(...),
    subject: str = Form(...),
    department: str = Form(...),
    semester: str = Form(...),
    description: Optional[str] = Form(None),
    questions: Optional[str] = Form(None),
    total_marks: int = Form(...),
    due_date: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    # Parse due_date
    try:
        # Accept different ISO datetime string styles (stripping 'Z' if present)
        dt_str = due_date.replace("Z", "")
        if "T" not in dt_str:
            dt_str = f"{dt_str}T23:59:59"
        parsed_due_date = datetime.datetime.fromisoformat(dt_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid due_date format. Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)."
        )

    file_path = None
    extracted_text = questions or ""

    if file:
        # Ensure file extension is valid
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".pdf", ".docx", ".txt"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF, DOCX, and TXT files are allowed."
            )
            
        # Secure file saving
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"q_{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Extract questions text from file if no manual text was supplied
            extracted_file_text = extract_text_from_file(file_path)
            if not extracted_text:
                extracted_text = extracted_file_text
            else:
                extracted_text = f"{extracted_text}\n\n[Extracted from Attachment]:\n{extracted_file_text}"
        except Exception as e:
            # Clean up file on failure
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process questions file: {str(e)}"
            )

    new_assignment = Assignment(
        teacher_id=current_user.id,
        title=title,
        subject=subject,
        department=department,
        semester=semester,
        description=description,
        questions=extracted_text,
        questions_file_path=file_path,
        total_marks=total_marks,
        due_date=parsed_due_date
    )
    
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    log_activity(
        db, 
        current_user.id, 
        "ASSIGNMENT_CREATE", 
        f"Created assignment '{new_assignment.title}' for {new_assignment.subject} ({new_assignment.total_marks} Marks)"
    )
    
    return new_assignment


@router.get("/", response_model=List[AssignmentResponse])
def get_assignments(
    search: Optional[str] = None,
    subject: Optional[str] = None,
    department: Optional[str] = None,
    semester: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Assignment)
    
    # Filter by user department/semester if student (optional, let's keep it general or apply filters if supplied)
    if search:
        query = query.filter(
            (Assignment.title.like(f"%{search}%")) | 
            (Assignment.subject.like(f"%{search}%")) |
            (Assignment.description.like(f"%{search}%"))
        )
    if subject:
        query = query.filter(Assignment.subject == subject)
    if department:
        query = query.filter(Assignment.department == department)
    if semester:
        query = query.filter(Assignment.semester == semester)
        
    assignments = query.order_by(Assignment.created_at.desc()).all()
    return assignments


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    return assignment
