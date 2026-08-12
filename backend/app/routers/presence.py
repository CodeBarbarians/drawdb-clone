from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from .. import models
from ..auth import decode_user_from_token
from ..database import get_db

router = APIRouter(tags=["presence"])


class ConnectionManager:
    """In-memory presence tracking, keyed by diagram id. Purely for showing who's
    currently viewing a diagram and letting one viewport follow another live —
    actual edits still go through the normal REST save/load flow, not this
    channel, so there's no conflict-resolution/sync concern here."""

    def __init__(self) -> None:
        self.rooms: dict[str, dict[WebSocket, dict]] = {}

    async def connect(self, diagram_id: str, websocket: WebSocket, user: models.User) -> None:
        await websocket.accept()
        self.rooms.setdefault(diagram_id, {})[websocket] = {
            "user_id": user.id,
            "email": user.email,
            "viewport": None,
        }

    def disconnect(self, diagram_id: str, websocket: WebSocket) -> None:
        room = self.rooms.get(diagram_id)
        if room and websocket in room:
            del room[websocket]
            if not room:
                self.rooms.pop(diagram_id, None)

    async def broadcast_presence(self, diagram_id: str) -> None:
        room = self.rooms.get(diagram_id, {})
        # The same user can hold multiple connections (two tabs, two devices).
        # Collapse those to one entry so the frontend's per-user list/keys and
        # "follow" targeting don't have to deal with duplicates — the most
        # recently connected tab's viewport wins.
        by_user: dict[int, dict] = {}
        for info in room.values():
            by_user[info["user_id"]] = info
        payload = {
            "type": "presence",
            "users": [
                {"user_id": info["user_id"], "email": info["email"], "viewport": info["viewport"]}
                for info in by_user.values()
            ],
        }
        for ws in list(room.keys()):
            try:
                await ws.send_json(payload)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/diagrams/{diagram_id}")
async def diagram_presence(
    websocket: WebSocket,
    diagram_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    user = decode_user_from_token(token, db)
    if user is None:
        await websocket.close(code=4401)
        return

    diagram = db.query(models.Diagram).filter(models.Diagram.id == diagram_id).first()
    has_access = diagram is not None and (
        diagram.owner_id == user.id or (diagram.share_token and diagram.share_mode == "editable")
    )
    if not has_access:
        await websocket.close(code=4403)
        return

    await manager.connect(diagram_id, websocket, user)
    await manager.broadcast_presence(diagram_id)
    try:
        while True:
            msg = await websocket.receive_json()
            if msg.get("type") == "viewport":
                manager.rooms[diagram_id][websocket]["viewport"] = msg.get("viewport")
                await manager.broadcast_presence(diagram_id)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(diagram_id, websocket)
        await manager.broadcast_presence(diagram_id)
