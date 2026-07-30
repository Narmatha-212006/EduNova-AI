import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Submission, AIEvaluation, Assignment
from ..schemas import AIEvaluationResponse, AIEvaluationUpdate, AIEvaluationPublish
from ..auth_jwt import get_current_user, get_teacher_user
from ..services.gemini_service import evaluate_with_gemini
from ..utils.helpers import log_activity, create_notification

router = APIRouter(prefix="/api/evaluations", tags=["AI Evaluations"])


def format_evaluation_response(eval_model: AIEvaluation) -> dict:
    """Helper to convert AIEvaluation DB model (with JSON strings) to schema representation."""
    try:
        strengths = json.loads(eval_model.strengths)
    except Exception:
        strengths = [eval_model.strengths] if eval_model.strengths else []
        
    try:
        mistakes = json.loads(eval_model.mistakes)
    except Exception:
        mistakes = [eval_model.mistakes] if eval_model.mistakes else []
        
    try:
        missing_topics = json.loads(eval_model.missing_topics)
    except Exception:
        missing_topics = [eval_model.missing_topics] if eval_model.missing_topics else []
        
    try:
        suggestions = json.loads(eval_model.suggestions)
    except Exception:
        suggestions = [eval_model.suggestions] if eval_model.suggestions else []

    return {
        "id": eval_model.id,
        "submission_id": eval_model.submission_id,
        "ai_marks": eval_model.ai_marks,
        "teacher_marks": eval_model.teacher_marks,
        "grade": eval_model.grade,
        "accuracy": eval_model.accuracy,
        "completeness": eval_model.completeness,
        "strengths": strengths,
        "mistakes": mistakes,
        "missing_topics": missing_topics,
        "suggestions": suggestions,
        "overall_feedback": eval_model.overall_feedback,
        "status": eval_model.status,
        "created_at": eval_model.created_at
    }


@router.post("/evaluate/{submission_id}", response_model=AIEvaluationResponse)
def trigger_ai_evaluation(
    submission_id: int,
    current_user: User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
        
    assignment = submission.assignment
    
    # Retrieve question and student answer text
    # Fallback to description if questions field is empty
    question_text = assignment.questions or assignment.description or "Evaluate the student's submission."
    student_answer_text = submission.extracted_text or "No text was extracted from this file."
    
    # Trigger evaluation via service (Google Gemini API or Mock)
    eval_result = evaluate_with_gemini(
        assignment_title=assignment.title,
        subject=assignment.subject,
        question=question_text,
        student_answer=student_answer_text,
        total_marks=float(assignment.total_marks)
    )
    
    # Check if evaluation record already exists
    eval_rec = db.query(AIEvaluation).filter(AIEvaluation.submission_id == submission_id).first()
    
    if eval_rec:
        # Update existing
        eval_rec.ai_marks = eval_result["ai_marks"]
        eval_rec.grade = eval_result["grade"]
        eval_rec.accuracy = eval_result["accuracy"]
        eval_rec.completeness = eval_result["completeness"]
        eval_rec.strengths = json.dumps(eval_result["strengths"])
        eval_rec.mistakes = json.dumps(eval_result["mistakes"])
        eval_rec.missing_topics = json.dumps(eval_result["missing_topics"])
        eval_rec.suggestions = json.dumps(eval_result["suggestions"])
        eval_rec.overall_feedback = eval_result["overall_feedback"]
        eval_rec.status = "PENDING"  # Reset back to PENDING for approval
    else:
        # Create new
        eval_rec = AIEvaluation(
            submission_id=submission_id,
            ai_marks=eval_result["ai_marks"],
            grade=eval_result["grade"],
            accuracy=eval_result["accuracy"],
            completeness=eval_result["completeness"],
            strengths=json.dumps(eval_result["strengths"]),
            mistakes=json.dumps(eval_result["mistakes"]),
            missing_topics=json.dumps(eval_result["missing_topics"]),
            suggestions=json.dumps(eval_result["suggestions"]),
            overall_feedback=eval_result["overall_feedback"],
            status="PENDING"
        )
        db.add(eval_rec)
        
    db.commit()
    db.refresh(eval_rec)
    
    log_activity(
        db, 
        current_user.id, 
        "AI_EVALUATION", 
        f"Generated AI evaluation for submission ID {submission_id} (Recommended Score: {eval_rec.ai_marks})"
    )
    
    return format_evaluation_response(eval_rec)


@router.get("/report/{submission_id}", response_model=AIEvaluationResponse)
def get_evaluation_report(
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
        
    # Student authorization: can only see their own submissions
    if current_user.role == "student" and submission.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to view this report"
        )
        
    eval_rec = db.query(AIEvaluation).filter(AIEvaluation.submission_id == submission_id).first()
    if not eval_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI evaluation report has not been generated yet for this submission."
        )
        
    # Student authorization: cannot see pending draft evaluations
    if current_user.role == "student" and eval_rec.status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI evaluation results have not been finalized or published by the teacher."
        )
        
    return format_evaluation_response(eval_rec)


@router.post("/publish/{submission_id}", response_model=AIEvaluationResponse)
def publish_evaluation_report(
    submission_id: int,
    publish_in: AIEvaluationPublish,
    current_user: User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
        
    eval_rec = db.query(AIEvaluation).filter(AIEvaluation.submission_id == submission_id).first()
    if not eval_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish. Trigger AI evaluation first."
        )
        
    assignment = submission.assignment
    
    # Cap teacher marks to total marks
    final_marks = float(publish_in.teacher_marks)
    if final_marks > assignment.total_marks:
        final_marks = float(assignment.total_marks)
    elif final_marks < 0:
        final_marks = 0.0

    eval_rec.teacher_marks = final_marks
    eval_rec.status = "PUBLISHED"
    
    db.commit()
    db.refresh(eval_rec)
    
    log_activity(
        db, 
        current_user.id, 
        "PUBLISH_MARKS", 
        f"Published evaluation marks for submission ID {submission_id} (Final Score: {eval_rec.teacher_marks})"
    )
    
    # Notify student
    student_msg = (
        f"Your results for the assignment '{assignment.title}' in '{assignment.subject}' have been published! "
        f"Final Marks: {eval_rec.teacher_marks}/{assignment.total_marks} (Grade: {eval_rec.grade}). "
        f"You can now view your report card and read professor feedback."
    )
    create_notification(db, submission.student_id, "Assignment Marks Published", student_msg)
    
    return format_evaluation_response(eval_rec)
