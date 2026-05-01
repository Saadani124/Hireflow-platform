from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.core.dependencies import get_current_user
from app.core.security import decode_access_token
from app.services.notification_service import NotificationService
from app.core.websocket_manager import manager

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationResponse])
def get_my_notifications(skip: int = 0, limit: int = 10, db: Session = Depends(get_db),
                         user=Depends(get_current_user)):
    return NotificationService.get_user_notifications(db, user.id, skip, limit)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=1008)
        return
    user_id = payload.get("user_id")
    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            # We don't expect the client to send messages, but we need to keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


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
