from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, Assignment, Submission, AIEvaluation
from ..schemas import (
    TeacherDashboardStats, StudentDashboardStats, AssignmentPerformanceStats,
    TeacherDashboardAnalytics, AssignmentAverageItem, StatusMixItem
)
from ..auth_jwt import get_teacher_user, get_student_user, get_current_user
from typing import List

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])


@router.get("/teacher/dashboard", response_model=TeacherDashboardStats)
def get_teacher_dashboard_stats(
    current_user: User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    # Assignments created by this teacher
    total_assignments = db.query(Assignment).filter(Assignment.teacher_id == current_user.id).count()
    
    # Total students registered in the system
    total_students = db.query(User).filter(User.role == "student").count()
    
    # Fetch all submissions for this teacher's assignments
    teacher_assignment_ids = [a.id for a in db.query(Assignment.id).filter(Assignment.teacher_id == current_user.id).all()]
    
    if not teacher_assignment_ids:
        return {
            "total_assignments": 0,
            "total_students": total_students,
            "pending_evaluations": 0,
            "ai_evaluated": 0,
            "published_results": 0
        }
        
    # Submissions that already have an evaluation record
    evaluated_sub_ids = (
        db.query(AIEvaluation.submission_id)
        .join(Submission, AIEvaluation.submission_id == Submission.id)
        .filter(Submission.assignment_id.in_(teacher_assignment_ids))
        .all()
    )
    evaluated_sub_ids_set = {row[0] for row in evaluated_sub_ids}

    total_subs = db.query(Submission).filter(
        Submission.assignment_id.in_(teacher_assignment_ids)
    ).count()

    # Pending Reviews = submissions with NO evaluation record at all
    pending_evaluations = total_subs - len(evaluated_sub_ids_set)

    eval_query = (
        db.query(AIEvaluation)
        .join(Submission, AIEvaluation.submission_id == Submission.id)
        .filter(Submission.assignment_id.in_(teacher_assignment_ids))
    )
    ai_evaluated = eval_query.count()
    published_results = eval_query.filter(AIEvaluation.status == "PUBLISHED").count()

    return {
        "total_assignments": total_assignments,
        "total_students": total_students,
        "pending_evaluations": pending_evaluations,
        "ai_evaluated": ai_evaluated,
        "published_results": published_results
    }


@router.get("/student/dashboard", response_model=StudentDashboardStats)
def get_student_dashboard_stats(
    current_user: User = Depends(get_student_user),
    db: Session = Depends(get_db)
):
    # Total available assignments
    total_assignments = db.query(Assignment).count()
    
    # Submissions by student
    student_subs = db.query(Submission).filter(Submission.student_id == current_user.id).all()
    submitted_count = len(student_subs)
    
    student_sub_ids = [s.id for s in student_subs]
    
    if not student_sub_ids:
        return {
            "total_assignments": total_assignments,
            "submitted_assignments": 0,
            "pending_feedback": 0,
            "published_results": 0
        }
        
    published_count = db.query(AIEvaluation).filter(
        AIEvaluation.submission_id.in_(student_sub_ids),
        AIEvaluation.status == "PUBLISHED"
    ).count()
    
    pending_feedback = submitted_count - published_count
    
    return {
        "total_assignments": total_assignments,
        "submitted_assignments": submitted_count,
        "pending_feedback": pending_feedback,
        "published_results": published_count
    }


@router.get("/teacher/analytics", response_model=List[AssignmentPerformanceStats])
def get_teacher_analytics(
    current_user: User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    # Fetch all assignments created by this teacher
    assignments = db.query(Assignment).filter(Assignment.teacher_id == current_user.id).all()
    
    stats_list = []
    for ass in assignments:
        submissions = db.query(Submission).filter(Submission.assignment_id == ass.id).all()
        submission_count = len(submissions)
        
        if submission_count == 0:
            stats_list.append({
                "assignment_id": ass.id,
                "title": ass.title,
                "subject": ass.subject,
                "average_marks": 0.0,
                "highest_marks": 0.0,
                "lowest_marks": 0.0,
                "submission_count": 0,
                "evaluated_count": 0,
                "published_count": 0
            })
            continue
            
        sub_ids = [s.id for s in submissions]
        evals = db.query(AIEvaluation).filter(AIEvaluation.submission_id.in_(sub_ids)).all()
        evaluated_count = len(evals)
        
        published_evals = [e for e in evals if e.status == "PUBLISHED"]
        published_count = len(published_evals)
        
        # Calculate scores based on finalized marks (teacher_marks if not None, else ai_marks)
        scores = []
        for ev in evals:
            # We can calculate analytics on all evaluations or only published. Let's do all evaluated to give immediate visibility.
            mark = ev.teacher_marks if ev.teacher_marks is not None else ev.ai_marks
            scores.append(mark)
            
        if scores:
            average_marks = round(sum(scores) / len(scores), 1)
            highest_marks = max(scores)
            lowest_marks = min(scores)
        else:
            average_marks = 0.0
            highest_marks = 0.0
            lowest_marks = 0.0
            
        stats_list.append({
            "assignment_id": ass.id,
            "title": ass.title,
            "subject": ass.subject,
            "average_marks": average_marks,
            "highest_marks": highest_marks,
            "lowest_marks": lowest_marks,
            "submission_count": submission_count,
            "evaluated_count": evaluated_count,
            "published_count": published_count
        })
        
    return stats_list


# ── New unified dashboard-analytics endpoint ──────────────────────────────────
@router.get("/teacher/dashboard-analytics", response_model=TeacherDashboardAnalytics)
def get_teacher_dashboard_analytics(
    current_user: User = Depends(get_teacher_user),
    db: Session = Depends(get_db)
):
    """Single endpoint that returns all KPI stats + chart data for the teacher dashboard."""

    # ── 1. Total Assignments ──────────────────────────────────────────────────
    teacher_assignments = (
        db.query(Assignment)
        .filter(Assignment.teacher_id == current_user.id)
        .all()
    )
    total_assignments = len(teacher_assignments)
    teacher_assignment_ids = [a.id for a in teacher_assignments]

    # ── 2. Total Students (distinct students who submitted) ───────────────────
    if teacher_assignment_ids:
        distinct_student_rows = (
            db.query(Submission.student_id)
            .filter(Submission.assignment_id.in_(teacher_assignment_ids))
            .distinct()
            .all()
        )
        total_students = len(distinct_student_rows)
    else:
        total_students = 0

    # Early return when teacher has no assignments
    if not teacher_assignment_ids:
        return TeacherDashboardAnalytics(
            total_assignments=0,
            total_students=0,
            pending_reviews=0,
            pending_approval=0,
            published_results=0,
            assignment_averages=[],
            evaluation_status_mix=[]
        )

    # ── 3. Submission + Evaluation counts ────────────────────────────────────
    all_submissions = (
        db.query(Submission)
        .filter(Submission.assignment_id.in_(teacher_assignment_ids))
        .all()
    )
    all_sub_ids = [s.id for s in all_submissions]
    total_submissions = len(all_submissions)

    all_evals = (
        db.query(AIEvaluation)
        .filter(AIEvaluation.submission_id.in_(all_sub_ids))
        .all()
    ) if all_sub_ids else []

    evaluated_sub_ids = {e.submission_id for e in all_evals}
    pending_approval_evals = [e for e in all_evals if e.status == "PENDING"]
    published_evals = [e for e in all_evals if e.status == "PUBLISHED"]

    # Submissions with NO evaluation record at all
    pending_reviews = total_submissions - len(evaluated_sub_ids)
    pending_approval = len(pending_approval_evals)   # AI done, teacher hasn't published
    published_results = len(published_evals)

    # ── 4. Assignment Averages (bar chart) ────────────────────────────────────
    # Group evaluations by assignment
    sub_to_assignment = {s.id: s.assignment_id for s in all_submissions}
    eval_by_assignment: dict = {}  # assignment_id -> [AIEvaluation]
    for ev in all_evals:
        aid = sub_to_assignment.get(ev.submission_id)
        if aid:
            eval_by_assignment.setdefault(aid, []).append(ev)

    assignment_averages = []
    for ass in teacher_assignments:
        subs_for_ass = [s for s in all_submissions if s.assignment_id == ass.id]
        evals_for_ass = eval_by_assignment.get(ass.id, [])
        published_for_ass = [e for e in evals_for_ass if e.status == "PUBLISHED"]

        scores = []
        for ev in evals_for_ass:
            mark = ev.teacher_marks if ev.teacher_marks is not None else ev.ai_marks
            scores.append(mark)

        avg = round(sum(scores) / len(scores), 1) if scores else 0.0
        high = max(scores) if scores else 0.0
        low = min(scores) if scores else 0.0

        assignment_averages.append(AssignmentAverageItem(
            assignment_id=ass.id,
            title=ass.title,
            subject=ass.subject,
            total_marks=ass.total_marks,
            average_marks=avg,
            highest_marks=high,
            lowest_marks=low,
            submission_count=len(subs_for_ass),
            evaluated_count=len(evals_for_ass),
            published_count=len(published_for_ass)
        ))

    # ── 5. Evaluation Status Mix (pie chart) ──────────────────────────────────
    unevaluated_count = pending_reviews  # submissions with zero evaluation

    status_mix_raw = [
        {"name": "Not Evaluated",    "value": unevaluated_count, "color": "#e5e7eb"},
        {"name": "Pending Approval", "value": pending_approval,  "color": "#f59e0b"},
        {"name": "Published",        "value": published_results,  "color": "#10b981"},
    ]
    evaluation_status_mix = [
        StatusMixItem(**item)
        for item in status_mix_raw
        if item["value"] > 0
    ]

    return TeacherDashboardAnalytics(
        total_assignments=total_assignments,
        total_students=total_students,
        pending_reviews=pending_reviews,
        pending_approval=pending_approval,
        published_results=published_results,
        assignment_averages=assignment_averages,
        evaluation_status_mix=evaluation_status_mix
    )


@router.get("/student/analytics")
def get_student_analytics(
    current_user: User = Depends(get_student_user),
    db: Session = Depends(get_db)
):
    # Fetch all published evaluations for this student
    submissions = db.query(Submission).filter(Submission.student_id == current_user.id).all()
    
    analytics_data = []
    for sub in submissions:
        eval_rec = db.query(AIEvaluation).filter(
            AIEvaluation.submission_id == sub.id,
            AIEvaluation.status == "PUBLISHED"
        ).first()
        
        if not eval_rec:
            continue
            
        # Get class average for this assignment
        class_subs = db.query(Submission.id).filter(Submission.assignment_id == sub.assignment_id).all()
        class_sub_ids = [c[0] for c in class_subs]
        
        class_evals = db.query(AIEvaluation).filter(AIEvaluation.submission_id.in_(class_sub_ids)).all()
        class_scores = [e.teacher_marks if e.teacher_marks is not None else e.ai_marks for e in class_evals]
        
        class_avg = round(sum(class_scores) / len(class_scores), 1) if class_scores else 0.0
        
        student_score = eval_rec.teacher_marks if eval_rec.teacher_marks is not None else eval_rec.ai_marks
        
        analytics_data.append({
            "assignment_id": sub.assignment_id,
            "title": sub.assignment.title,
            "subject": sub.assignment.subject,
            "student_score": student_score,
            "class_average": class_avg,
            "total_marks": sub.assignment.total_marks,
            "grade": eval_rec.grade
        })
        
    return analytics_data
