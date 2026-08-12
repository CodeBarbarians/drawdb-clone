import uuid

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

    async def connect(
        self,
        diagram_id: str,
        websocket: WebSocket,
        key,
        label: str,
        is_guest: bool = False,
        username: str | None = None,
    ) -> None:
        await websocket.accept()
        self.rooms.setdefault(diagram_id, {})[websocket] = {
            "user_id": key,
            "email": label,
            "username": username,
            "viewport": None,
            "is_guest": is_guest,
        }
        # Tell this connection its own key up front — it has no other way to
        # know it (guests get a server-generated id) and needs it to filter
        # itself out of its own presence list.
        await websocket.send_json({"type": "you", "user_id": key})

    def disconnect(self, diagram_id: str, websocket: WebSocket) -> None:
        room = self.rooms.get(diagram_id)
        if room and websocket in room:
            del room[websocket]
            if not room:
                self.rooms.pop(diagram_id, None)

    async def broadcast_presence(self, diagram_id: str) -> None:
        room = self.rooms.get(diagram_id, {})
        # The same identity can hold multiple connections (two tabs, two
        # devices). Collapse those to one entry so the frontend's per-user
        # list/keys and "follow" targeting don't have to deal with duplicates
        # — the most recently connected tab's viewport wins.
        by_key: dict = {}
        for info in room.values():
            by_key[info["user_id"]] = info
        payload = {
            "type": "presence",
            "users": [
                {
                    "user_id": info["user_id"],
                    "email": info["email"],
                    "username": info["username"],
                    "viewport": info["viewport"],
                    "is_guest": info["is_guest"],
                }
                for info in by_key.values()
            ],
        }
        for ws in list(room.keys()):
            try:
                await ws.send_json(payload)
            except Exception:
                pass

    async def broadcast_update(self, diagram_id: str, editor_user_id: int) -> None:
        """Tell everyone viewing this diagram that its data changed on the server,
        so followers reload instead of sitting on a stale canvas until they
        manually refresh. `editor_user_id` lets the editor's own tab ignore its
        own save (it already has the latest state)."""
        room = self.rooms.get(diagram_id, {})
        payload = {"type": "diagram_updated", "by": editor_user_id}
        for ws in list(room.keys()):
            try:
                await ws.send_json(payload)
            except Exception:
                pass


manager = ConnectionManager()


async def _run_presence_loop(diagram_id: str, websocket: WebSocket) -> None:
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

    await manager.connect(
        diagram_id, websocket, key=user.id, label=user.email, is_guest=False, username=user.username
    )
    await _run_presence_loop(diagram_id, websocket)


@router.websocket("/ws/share/{share_token}")
async def shared_diagram_presence(
    websocket: WebSocket,
    share_token: str,
    name: str = Query(...),
    db: Session = Depends(get_db),
):
    """Presence for anonymous visitors on a view-only share link. They have no
    account, so identity is just a display name they typed in — good enough
    for "who's here" and "follow this viewport", nothing that needs to survive
    a reconnect or be trusted for anything else. Guests can follow other
    connections but (enforced client-side, since it's just a UI affordance)
    are never themselves a follow target."""
    diagram = db.query(models.Diagram).filter(models.Diagram.share_token == share_token).first()
    if diagram is None:
        await websocket.close(code=4404)
        return

    label = (name or "").strip()[:40] or "Anonymous"
    guest_key = f"guest-{uuid.uuid4().hex[:8]}"

    await manager.connect(diagram.id, websocket, key=guest_key, label=label, is_guest=True)
    await _run_presence_loop(diagram.id, websocket)
