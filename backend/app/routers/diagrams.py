from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

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
    return diagram


def _get_owned_diagram(diagram_id: int, db: Session, user: models.User) -> models.Diagram:
    diagram = (
        db.query(models.Diagram)
        .filter(models.Diagram.id == diagram_id, models.Diagram.owner_id == user.id)
        .first()
    )
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return diagram


@router.get("/{diagram_id}", response_model=schemas.DiagramOut)
def get_diagram(
    diagram_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_owned_diagram(diagram_id, db, user)


@router.put("/{diagram_id}", response_model=schemas.DiagramOut)
def update_diagram(
    diagram_id: int,
    payload: schemas.DiagramUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = _get_owned_diagram(diagram_id, db, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(diagram, field, value)
    db.commit()
    db.refresh(diagram)
    return diagram


@router.delete("/{diagram_id}", status_code=204)
def delete_diagram(
    diagram_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    diagram = _get_owned_diagram(diagram_id, db, user)
    db.delete(diagram)
    db.commit()
