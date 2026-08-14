from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import URL, make_url

from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(tags=["reflect"])

# Only dialects the frontend can render columns for. Anything else (in
# particular sqlite/file-based URLs) is rejected before a connection is ever
# attempted, since this endpoint accepts a connection string typed by an
# authenticated user rather than one the operator configured.
REQUIRED_DRIVER_BY_BACKEND = {
    "postgresql": "psycopg2",
    "mysql": "pymysql",
    "mariadb": "pymysql",
    "mssql": "pymssql",
    "hana": None,
}

# Kept short and applied per-dialect using each driver's own kwarg name — a
# user-supplied host that's slow or unreachable should fail fast rather than
# hang a worker thread.
CONNECT_ARGS_BY_BACKEND = {
    "postgresql": {"connect_timeout": 5},
    "mysql": {"connect_timeout": 5},
    "mariadb": {"connect_timeout": 5},
    "mssql": {"login_timeout": 5, "timeout": 5},
    "hana": {},
}


def _normalize_and_validate(connection_string: str) -> URL:
    try:
        url = make_url(connection_string)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid connection string") from None

    backend = url.get_backend_name()
    if backend not in REQUIRED_DRIVER_BY_BACKEND:
        allowed = ", ".join(sorted(REQUIRED_DRIVER_BY_BACKEND))
        raise HTTPException(status_code=400, detail=f"Unsupported database type '{backend}'. Allowed: {allowed}")

    required_driver = REQUIRED_DRIVER_BY_BACKEND[backend]
    if required_driver and url.get_driver_name() != required_driver:
        url = url.set(drivername=f"{backend}+{required_driver}")
    return url


def _introspect(url: URL) -> dict:
    engine = create_engine(url, connect_args=CONNECT_ARGS_BY_BACKEND.get(url.get_backend_name(), {}))
    try:
        inspector = inspect(engine)
        tables = []
        for table_name in inspector.get_table_names():
            columns = inspector.get_columns(table_name)
            pk = inspector.get_pk_constraint(table_name) or {}
            try:
                unique_constraints = inspector.get_unique_constraints(table_name)
            except NotImplementedError:
                unique_constraints = []

            tables.append(
                {
                    "name": table_name,
                    "columns": [
                        {
                            "name": c["name"],
                            "type": str(c["type"]),
                            "nullable": c.get("nullable", True),
                            "default": str(c["default"]) if c.get("default") is not None else None,
                            "autoincrement": bool(c.get("autoincrement", False)),
                        }
                        for c in columns
                    ],
                    "primary_key": pk.get("constrained_columns") or [],
                    "foreign_keys": [
                        {
                            "constrained_columns": fk["constrained_columns"],
                            "referred_table": fk["referred_table"],
                            "referred_columns": fk["referred_columns"],
                        }
                        for fk in inspector.get_foreign_keys(table_name)
                    ],
                    "indexes": [
                        {"name": idx["name"], "columns": idx["column_names"], "unique": bool(idx.get("unique"))}
                        for idx in inspector.get_indexes(table_name)
                    ],
                    "unique_constraints": [
                        {"name": u.get("name"), "columns": u["column_names"]} for u in unique_constraints
                    ],
                }
            )

        enums = []
        try:
            for e in inspector.get_enums():
                enums.append({"name": e["name"], "values": e["labels"]})
        except (NotImplementedError, AttributeError):
            pass

        return {"tables": tables, "enums": enums}
    finally:
        engine.dispose()


@router.post("/reflect")
async def reflect_database(
    payload: schemas.ReflectRequest,
    _: models.User = Depends(get_current_user),
):
    url = _normalize_and_validate(payload.connection_string)
    try:
        return await run_in_threadpool(_introspect, url)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read schema: {exc}") from exc
