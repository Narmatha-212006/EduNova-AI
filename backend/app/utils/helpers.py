from sqlalchemy.orm import Session
from ..models import ActivityLog, Notification

def log_activity(db: Session, user_id: int, action: str, details: str = None):
    """
    Utility function to log user activity into the database.
    """
    try:
        log_entry = ActivityLog(
            user_id=user_id,
            action=action,
            details=details
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        # Keep executing even if logging fails
        print(f"Failed to log activity: {str(e)}")


def create_notification(db: Session, user_id: int, title: str, message: str):
    """
    Utility function to create a notification for a user.
    """
    try:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            is_read=False
        )
        db.add(notification)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to create notification: {str(e)}")
