from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    username: str = Field(min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str | None = None
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class DiagramCreate(BaseModel):
    name: str = "Untitled Diagram"
    db_type: str = "postgresql"
    data: dict = Field(default_factory=dict)


class DiagramUpdate(BaseModel):
    name: str | None = None
    db_type: str | None = None
    data: dict | None = None


class DiagramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    db_type: str
    data: dict
    share_token: str | None = None
    share_mode: str = "readonly"
    is_owner: bool = True
    created_at: datetime
    updated_at: datetime


class DiagramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    db_type: str
    created_at: datetime
    updated_at: datetime


class ShareUpdate(BaseModel):
    share_mode: str = Field(default="readonly", pattern="^(readonly|editable)$")


class ShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    share_token: str
    share_mode: str


class PublicDiagramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    db_type: str
    data: dict
    share_mode: str
    can_edit: bool = False
    editable_diagram_id: str | None = None


class AccessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    username: str | None = None
    first_seen_at: datetime
    last_seen_at: datetime


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    username: str | None = None
    message: str
    created_at: datetime
