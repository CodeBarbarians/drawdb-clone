import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    # OAuth (Google/GitHub) accounts get a random, never-shared value here since
    # they don't set a password — keeps the column NOT NULL, no schema split needed.
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    diagrams: Mapped[list["Diagram"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Diagram(Base):
    __tablename__ = "diagrams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled Diagram")
    db_type: Mapped[str] = mapped_column(String(50), nullable=False, default="postgresql")
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    share_token: Mapped[str | None] = mapped_column(String(36), unique=True, index=True, nullable=True)
    share_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="readonly")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    owner: Mapped["User"] = relationship(back_populates="diagrams")


class DiagramAccess(Base):
    """Tracks which users have opened an editable share link, for the owner's People panel."""

    __tablename__ = "diagram_access"
    __table_args__ = (UniqueConstraint("diagram_id", "user_id", name="uq_diagram_access_diagram_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    diagram_id: Mapped[str] = mapped_column(ForeignKey("diagrams.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship()


class DiagramActivity(Base):
    """Append-only log of save events, for the owner's Activity panel."""

    __tablename__ = "diagram_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    diagram_id: Mapped[str] = mapped_column(ForeignKey("diagrams.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped["User"] = relationship()
