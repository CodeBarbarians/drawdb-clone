import uuid

from sqlalchemy import inspect, text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .config import settings
from .database import Base, engine
from .routers import auth, diagrams, presence, public

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


_run_migrations()

app = FastAPI(title="drawdb-clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(diagrams.router)
app.include_router(public.router)
app.include_router(presence.router)


@app.get("/health")
def health():
    return {"status": "ok"}
