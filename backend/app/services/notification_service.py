from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.core.websocket_manager import manager
import asyncio

class NotificationService:
    @staticmethod
    async def create_notification(db: Session, user_id: int, notif_type: str, title: str, message: str, link: str = None) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            link=link
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        
        # Broadcast the new notification to the specific user via WebSocket
        notif_dict = {
            "id": notif.id,
            "user_id": notif.user_id,
            "type": notif.type,
            "title": notif.title,
            "message": notif.message,
            "link": notif.link,
            "is_read": notif.is_read,
            "created_at": notif.created_at.isoformat() if notif.created_at else None
        }
        
        # Broadcast via WebSocket manager
        await manager.send_personal_message(notif_dict, user_id)
            
        return notif

    @staticmethod
    def get_user_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 10) -> list[Notification]:
        return db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> bool:
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notif:
            notif.is_read = True
            db.commit()
            return True
        return False

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int):
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()

    @staticmethod
    def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notif:
            db.delete(notif)
            db.commit()
            return True
        return False
