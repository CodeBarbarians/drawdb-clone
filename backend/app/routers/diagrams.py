import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import utcnow
from .presence import manager

router = APIRouter(prefix="/diagrams", tags=["diagrams"])


@router.get("", response_model=list[schemas.DiagramSummary])
def list_diagrams(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.Diagram)
        .filter(models.Diagram.owner_id == user.id)
        .order_by(models.Diagram.updated_at.desc())
        .all()
    )


@router.post("", response_model=schemas.DiagramOut, status_code=201)
def create_diagram(
    payload: schemas.DiagramCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = models.Diagram(owner_id=user.id, **payload.model_dump())
    db.add(diagram)
    db.commit()
    db.refresh(diagram)
    diagram.is_owner = True
    return diagram


def _get_owned_diagram(diagram_id: str, db: Session, user: models.User) -> models.Diagram:
    diagram = (
        db.query(models.Diagram)
        .filter(models.Diagram.id == diagram_id, models.Diagram.owner_id == user.id)
        .first()
    )
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return diagram


def _get_accessible_diagram(diagram_id: str, db: Session, user: models.User) -> tuple[models.Diagram, bool]:
    """Owner always has access. Any logged-in user gets access when the diagram
    has an active editable share link — matches the 'anyone with the link who
    logs in can edit' model rather than a per-user invite/approval flow."""
    diagram = db.query(models.Diagram).filter(models.Diagram.id == diagram_id).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    if diagram.owner_id == user.id:
        return diagram, True
    if diagram.share_token and diagram.share_mode == "editable":
        return diagram, False
    raise HTTPException(status_code=404, detail="Diagram not found")


def _record_access(db: Session, diagram_id: str, user_id: int) -> None:
    row = (
        db.query(models.DiagramAccess)
        .filter(models.DiagramAccess.diagram_id == diagram_id, models.DiagramAccess.user_id == user_id)
        .first()
    )
    if row:
        row.last_seen_at = utcnow()
    else:
        db.add(models.DiagramAccess(diagram_id=diagram_id, user_id=user_id))
    db.commit()


def _record_activity(db: Session, diagram: models.Diagram, user: models.User, before: dict) -> None:
    before = before or {}
    after_tables = len((diagram.data or {}).get("tables") or [])
    after_rels = len((diagram.data or {}).get("relationships") or [])
    before_tables = len(before.get("tables") or [])
    before_rels = len(before.get("relationships") or [])

    parts = []
    if after_tables != before_tables:
        parts.append(f"tables {before_tables}→{after_tables}")
    if after_rels != before_rels:
        parts.append(f"relationships {before_rels}→{after_rels}")
    message = f"Saved changes ({', '.join(parts)})" if parts else "Saved changes"

    db.add(models.DiagramActivity(diagram_id=diagram.id, user_id=user.id, message=message))
    db.commit()


@router.get("/{diagram_id}", response_model=schemas.DiagramOut)
def get_diagram(
    diagram_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram, is_owner = _get_accessible_diagram(diagram_id, db, user)
    if not is_owner:
        _record_access(db, diagram.id, user.id)
    diagram.is_owner = is_owner
    return diagram


@router.put("/{diagram_id}", response_model=schemas.DiagramOut)
async def update_diagram(
    diagram_id: str,
    payload: schemas.DiagramUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram, is_owner = _get_accessible_diagram(diagram_id, db, user)
    before_data = dict(diagram.data) if diagram.data else {}
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(diagram, field, value)
    db.commit()
    db.refresh(diagram)
    if not is_owner:
        _record_access(db, diagram.id, user.id)
    if "data" in changes:
        _record_activity(db, diagram, user, before_data)
        await manager.broadcast_update(diagram.id, user.id)
    diagram.is_owner = is_owner
    return diagram


@router.delete("/{diagram_id}", status_code=204)
def delete_diagram(
    diagram_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = _get_owned_diagram(diagram_id, db, user)
    db.delete(diagram)
    db.commit()


@router.post("/{diagram_id}/share", response_model=schemas.ShareOut)
def share_diagram(
    diagram_id: str,
    payload: schemas.ShareUpdate = schemas.ShareUpdate(),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = _get_owned_diagram(diagram_id, db, user)
    if not diagram.share_token:
        diagram.share_token = str(uuid.uuid4())
        diagram.share_mode = payload.share_mode
        db.commit()
        db.refresh(diagram)
    return diagram


@router.put("/{diagram_id}/share", response_model=schemas.ShareOut)
def update_share_mode(
    diagram_id: str,
    payload: schemas.ShareUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = _get_owned_diagram(diagram_id, db, user)
    if not diagram.share_token:
        raise HTTPException(status_code=400, detail="Diagram is not shared yet")
    diagram.share_mode = payload.share_mode
    db.commit()
    db.refresh(diagram)
    return diagram


@router.delete("/{diagram_id}/share", status_code=204)
def unshare_diagram(
    diagram_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = _get_owned_diagram(diagram_id, db, user)
    diagram.share_token = None
    db.commit()


@router.get("/{diagram_id}/access", response_model=list[schemas.AccessOut])
def list_access(
    diagram_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = _get_owned_diagram(diagram_id, db, user)
    rows = (
        db.query(models.DiagramAccess)
        .filter(models.DiagramAccess.diagram_id == diagram.id)
        .order_by(models.DiagramAccess.last_seen_at.desc())
        .all()
    )
    return [schemas.AccessOut(email=r.user.email, first_seen_at=r.first_seen_at, last_seen_at=r.last_seen_at) for r in rows]


@router.get("/{diagram_id}/activity", response_model=list[schemas.ActivityOut])
def list_activity(
    diagram_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram, _ = _get_accessible_diagram(diagram_id, db, user)
    rows = (
        db.query(models.DiagramActivity)
        .filter(models.DiagramActivity.diagram_id == diagram.id)
        .order_by(models.DiagramActivity.created_at.desc())
        .limit(50)
        .all()
    )
    return [schemas.ActivityOut(email=r.user.email, message=r.message, created_at=r.created_at) for r in rows]
