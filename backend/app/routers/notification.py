from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.core.dependencies import get_current_user
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationResponse])
def get_my_notifications(db: Session = Depends(get_db),
                         user=Depends(get_current_user)):
    return NotificationService.get_user_notifications(db, user.id)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(db: Session = Depends(get_db),
                     user=Depends(get_current_user)):
    count = NotificationService.get_unread_count(db, user.id)
    return {"count": count}


@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db),
              user=Depends(get_current_user)):
    success = NotificationService.mark_as_read(db, notification_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db),
                  user=Depends(get_current_user)):
    NotificationService.mark_all_as_read(db, user.id)
    return {"message": "All marked as read"}


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db),
                        user=Depends(get_current_user)):
    success = NotificationService.delete_notification(db, notification_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}
