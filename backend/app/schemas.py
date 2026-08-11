from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
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

    id: int
    name: str
    db_type: str
    data: dict
    created_at: datetime
    updated_at: datetime


class DiagramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    db_type: str
    created_at: datetime
    updated_at: datetime
