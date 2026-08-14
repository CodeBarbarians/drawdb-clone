from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import hash_password, require_admin
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=schemas.AdminUserListOut)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    query = db.query(models.User).order_by(models.User.created_at.desc())
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": users, "total": total, "page": page, "page_size": page_size}


@router.post("/users", response_model=schemas.AdminUserOut, status_code=201)
def create_user(
    payload: schemas.AdminUserCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if payload.username and db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Diagram.diagrams cascade only removes the Diagram rows themselves —
    # DiagramAccess/DiagramActivity/DiagramVersion reference diagram_id and
    # user_id directly with no ORM cascade, so they'd otherwise dangle after
    # the user is gone.
    owned_diagram_ids = [
        d.id for d in db.query(models.Diagram.id).filter(models.Diagram.owner_id == user.id)
    ]
    if owned_diagram_ids:
        db.query(models.DiagramActivity).filter(
            models.DiagramActivity.diagram_id.in_(owned_diagram_ids)
        ).delete(synchronize_session=False)
        db.query(models.DiagramAccess).filter(
            models.DiagramAccess.diagram_id.in_(owned_diagram_ids)
        ).delete(synchronize_session=False)
        db.query(models.DiagramVersion).filter(
            models.DiagramVersion.diagram_id.in_(owned_diagram_ids)
        ).delete(synchronize_session=False)

    db.query(models.DiagramActivity).filter(models.DiagramActivity.user_id == user.id).delete(
        synchronize_session=False
    )
    db.query(models.DiagramAccess).filter(models.DiagramAccess.user_id == user.id).delete(
        synchronize_session=False
    )
    db.query(models.DiagramVersion).filter(models.DiagramVersion.user_id == user.id).delete(
        synchronize_session=False
    )

    db.delete(user)
    db.commit()
