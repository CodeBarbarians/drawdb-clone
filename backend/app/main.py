import re
import uuid

from sqlalchemy import inspect, text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .auth import hash_password
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import admin, auth, diagrams, oauth, presence, public, reflect

Base.metadata.create_all(bind=engine)


def _migrate_diagram_id_to_uuid(conn) -> None:
    # Diagram.id moved from an autoincrement int to a UUID string (so /editor/<id>
    # and /share/<token> URLs don't leak sequential, guessable identifiers).
    # SQLite can't ALTER COLUMN a primary key's type in place, so rebuild the
    # table: existing rows keep everything but get a freshly generated id.
    rows = conn.execute(
        text(
            "SELECT id, owner_id, name, db_type, data, share_token, created_at, updated_at FROM diagrams"
        )
    ).fetchall()
    conn.execute(text("ALTER TABLE diagrams RENAME TO diagrams_old_int_id"))
    conn.execute(
        text(
            """
            CREATE TABLE diagrams (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                owner_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                db_type VARCHAR(50) NOT NULL,
                data JSON NOT NULL,
                share_token VARCHAR(36),
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY(owner_id) REFERENCES users (id)
            )
            """
        )
    )
    for row in rows:
        conn.execute(
            text(
                """
                INSERT INTO diagrams (id, owner_id, name, db_type, data, share_token, created_at, updated_at)
                VALUES (:id, :owner_id, :name, :db_type, :data, :share_token, :created_at, :updated_at)
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "owner_id": row.owner_id,
                "name": row.name,
                "db_type": row.db_type,
                "data": row.data,
                "share_token": row.share_token,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            },
        )
    conn.execute(text("DROP TABLE diagrams_old_int_id"))
    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_diagrams_share_token ON diagrams (share_token)"))


def _sanitize_username_base(email: str, user_id: int) -> str:
    base = re.sub(r"[^a-zA-Z0-9_.-]", ".", email.split("@")[0]).strip(".")
    if len(base) < 2:
        base = f"user{user_id}"
    return base[:50]


def _backfill_usernames(conn) -> None:
    # Existing accounts predate the username column — derive one from their
    # email's local part so they aren't left with a blank display name.
    taken = {row[0] for row in conn.execute(text("SELECT username FROM users WHERE username IS NOT NULL"))}
    rows = conn.execute(text("SELECT id, email FROM users WHERE username IS NULL ORDER BY id")).fetchall()
    for row in rows:
        base = _sanitize_username_base(row.email, row.id)
        candidate = base
        suffix = 2
        while candidate in taken:
            candidate = f"{base}{suffix}"[:50]
            suffix += 1
        taken.add(candidate)
        conn.execute(text("UPDATE users SET username = :username WHERE id = :id"), {"username": candidate, "id": row.id})


def _run_migrations() -> None:
    # No Alembic in this project — create_all only creates missing tables, it
    # never alters existing ones, so schema changes after the sqlite file
    # already exists need manual handling here.
    inspector = inspect(engine)
    diagram_columns = {col["name"]: col for col in inspector.get_columns("diagrams")}
    if "share_token" not in diagram_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE diagrams ADD COLUMN share_token VARCHAR(36)"))
            conn.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS ix_diagrams_share_token ON diagrams (share_token)")
            )
        diagram_columns = {col["name"]: col for col in inspect(engine).get_columns("diagrams")}

    if str(diagram_columns["id"]["type"]).upper().startswith("INT"):
        with engine.begin() as conn:
            _migrate_diagram_id_to_uuid(conn)

    if "share_mode" not in diagram_columns:
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE diagrams ADD COLUMN share_mode VARCHAR(20) NOT NULL DEFAULT 'readonly'")
            )

    user_columns = {col["name"]: col for col in inspector.get_columns("users")}
    if "username" not in user_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(50)"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"))

    if "is_admin" not in user_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"))

    with engine.begin() as conn:
        _backfill_usernames(conn)


def _seed_admin_user() -> None:
    db = SessionLocal()
    try:
        email = "admin@codebarbarians.com"
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            if not user.is_admin:
                user.is_admin = True
                db.commit()
            return

        username = "admin"
        if db.query(models.User).filter(models.User.username == username).first():
            username = None

        db.add(
            models.User(
                username=username,
                email=email,
                hashed_password=hash_password("P@ssw0rd@123"),
                is_admin=True,
            )
        )
        db.commit()
    finally:
        db.close()


_run_migrations()
_seed_admin_user()

app = FastAPI(title="drawdb-clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(diagrams.router)
app.include_router(public.router)
app.include_router(presence.router)
app.include_router(admin.router)
app.include_router(reflect.router)


@app.get("/health")
def health():
    return {"status": "ok"}
