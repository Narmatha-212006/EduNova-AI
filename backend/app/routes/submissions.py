import os
import shutil
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Assignment, Submission, AIEvaluation
from ..schemas import SubmissionResponse
from ..auth_jwt import get_current_user, get_student_user, get_teacher_user
from ..utils.file_parser import extract_text_from_file
from ..utils.helpers import log_activity

router = APIRouter(prefix="/api/submissions", tags=["Submissions"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_assignment(
    assignment_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_student_user),
    db: Session = Depends(get_db)
):
    # Verify assignment exists
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # Check if due date is passed
    # Allow late submissions but log or warn if needed, or enforce block.
    # Let's check: typically we can allow late submissions but flag them. Let's allow and log.
    is_late = datetime.datetime.utcnow() > assignment.due_date

    # Check if already submitted
    existing_submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()
    if existing_submission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted an answer for this assignment. Resubmissions are not permitted."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF, DOCX, and TXT files are allowed."
        )

    # Save file
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"s_{assignment_id}_{current_user.id}_{timestamp}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text content
        extracted_text = extract_text_from_file(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process submission file: {str(e)}"
        )

    # Create submission record
    new_submission = Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        file_path=file_path,
        extracted_text=extracted_text
    )
    
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    
    log_activity(
        db, 
        current_user.id, 
        "SUBMISSION_UPLOAD", 
        f"Submitted answer for assignment '{assignment.title}' (Late: {is_late})"
    )

    # Construct clean response
    return {
        "id": new_submission.id,
        "assignment_id": new_submission.assignment_id,
        "student_id": new_submission.student_id,
        "file_path": new_submission.file_path,
        "submitted_at": new_submission.submitted_at,
        "student_name": current_user.name,
        "assignment_title": assignment.title,
        "assignment_subject": assignment.subject,
        "total_marks": assignment.total_marks,
        "has_evaluation": False,
        "evaluation_status": None,
        "final_marks": None,
        "grade": None
    }


@router.get("/assignment/{assignment_id}", response_model=SubmissionResponse)
def get_student_submission(
    assignment_id: int,
    current_user: User = Depends(get_student_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found for this assignment"
        )
        
    eval_rec = db.query(AIEvaluation).filter(AIEvaluation.submission_id == submission.id).first()
    assignment = submission.assignment
    
    has_eval = eval_rec is not None
    eval_status = eval_rec.status if has_eval else None
    
    # Hide marks and grades from students if not published yet
    final_marks = None
    grade = None
    if has_eval and eval_status == "PUBLISHED":
        final_marks = eval_rec.teacher_marks if eval_rec.teacher_marks is not None else eval_rec.ai_marks
        grade = eval_rec.grade

    return {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "file_path": submission.file_path,
        "submitted_at": submission.submitted_at,
        "student_name": current_user.name,
        "assignment_title": assignment.title,
        "assignment_subject": assignment.subject,
        "total_marks": assignment.total_marks,
        "has_evaluation": has_eval,
        "evaluation_status": eval_status,
        "final_marks": final_marks,
        "grade": grade
    }


@router.get("/teacher/list", response_model=List[SubmissionResponse])
def list_submissions_for_teacher(
    assignment_id: Optional[int] = None,
    search_student: Optional[str] = None,
    current_user: User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    query = db.query(Submission).join(Assignment).join(User, Submission.student_id == User.id)
    
    if assignment_id:
        query = query.filter(Submission.assignment_id == assignment_id)
        
    if search_student:
        query = query.filter(User.name.like(f"%{search_student}%"))
        
    submissions = query.order_by(Submission.submitted_at.desc()).all()
    
    response_list = []
    for sub in submissions:
        eval_rec = db.query(AIEvaluation).filter(AIEvaluation.submission_id == sub.id).first()
        has_eval = eval_rec is not None
        eval_status = eval_rec.status if has_eval else None
        
        final_marks = None
        grade = None
        if has_eval:
            final_marks = eval_rec.teacher_marks if eval_rec.teacher_marks is not None else eval_rec.ai_marks
            grade = eval_rec.grade
            
        response_list.append({
            "id": sub.id,
            "assignment_id": sub.assignment_id,
            "student_id": sub.student_id,
            "file_path": sub.file_path,
            "submitted_at": sub.submitted_at,
            "student_name": sub.student.name,
            "assignment_title": sub.assignment.title,
            "assignment_subject": sub.assignment.subject,
            "total_marks": sub.assignment.total_marks,
            "has_evaluation": has_eval,
            "evaluation_status": eval_status,
            "final_marks": final_marks,
            "grade": grade
        })
        
    return response_list


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission_detail(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
        
    # Enforce Student restriction: can only view their own submission
    if current_user.role == "student" and submission.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to view this submission"
        )
        
    eval_rec = db.query(AIEvaluation).filter(AIEvaluation.submission_id == submission.id).first()
    has_eval = eval_rec is not None
    eval_status = eval_rec.status if has_eval else None
    
    final_marks = None
    grade = None
    # Students can only see published evaluation marks
    if has_eval:
        if current_user.role == "teacher" or eval_status == "PUBLISHED":
            final_marks = eval_rec.teacher_marks if eval_rec.teacher_marks is not None else eval_rec.ai_marks
            grade = eval_rec.grade

    return {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "file_path": submission.file_path,
        "submitted_at": submission.submitted_at,
        "student_name": submission.student.name,
        "assignment_title": submission.assignment.title,
        "assignment_subject": submission.assignment.subject,
        "total_marks": submission.assignment.total_marks,
        "has_evaluation": has_eval,
        "evaluation_status": eval_status,
        "final_marks": final_marks,
        "grade": grade
    }
