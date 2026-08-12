from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user_optional
from ..database import get_db

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/diagrams/{share_token}", response_model=schemas.PublicDiagramOut)
def get_public_diagram(
    share_token: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_current_user_optional),
):
    diagram = db.query(models.Diagram).filter(models.Diagram.share_token == share_token).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")

    # Read-only links are viewable by anyone with no login. Editable links are
    # still viewable by anyone (so a visitor can preview before deciding to log
    # in), but only a logged-in user is handed the real diagram id needed to
    # open it in the full editor — that's the login gate for actually editing.
    can_edit = diagram.share_mode == "editable" and user is not None
    return schemas.PublicDiagramOut(
        name=diagram.name,
        db_type=diagram.db_type,
        data=diagram.data,
        share_mode=diagram.share_mode,
        can_edit=can_edit,
        editable_diagram_id=diagram.id if can_edit else None,
    )
