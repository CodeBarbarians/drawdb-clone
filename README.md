# drawdb-clone

A self-hosted database schema designer — draw ER diagrams on a canvas, import
DBML, or point it at a live database and have the schema drawn for you.

Built because [drawDB](https://drawdb.app) moved to a paid model.

**Stack** — FastAPI - SQLAlchemy - React + Vite - React Flow - Tailwind

## What it does

- **Visual editor** — tables, columns, types and relationships on a React Flow
  canvas, with Dagre auto-layout for arranging an imported schema
- **Reverse engineering** — connect to a live database and generate the diagram
  from its actual schema
- **DBML import/export** via `@dbml/core`
- **Export** to PNG (html-to-image) and PDF (jsPDF)
- **Accounts** — email/password plus Google and GitHub OAuth
- **Sharing** — share a diagram by link, with a share token separate from the
  diagram id
- **Presence** — see who else is viewing a shared diagram
- **Admin** — user management

### Databases it can reflect

PostgreSQL (`psycopg2`), MySQL / MariaDB (`PyMySQL`), SQL Server (`pymssql`)
and SAP HANA (`sqlalchemy-hana`, `hdbcli`).

## Layout

```
backend/
  app/
    main.py        app setup, CORS, startup migrations
    models.py      SQLAlchemy models
    schemas.py     Pydantic schemas
    auth.py        password hashing, JWT
    config.py      settings from environment
    routers/
      auth.py      register, login
      oauth.py     Google and GitHub
      diagrams.py  CRUD, save, load
      reflect.py   introspect a live database
      public.py    share-link access
      presence.py  who is viewing
      admin.py     user administration
  requirements.txt
frontend/          React editor
render.yaml        Render.com blueprint, both services
run.bat            Windows: starts both, bound to your LAN IP
```

## Running it

```bash
# backend
cd backend
python -m venv venv && venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev   # http://localhost:5173
```

On Windows, `run.bat` starts both and detects your LAN IP so you can open the
editor from a phone or another machine on the network.

## Configuration

Backend environment variables:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | JWT signing |
| `DATABASE_URL` | app's own storage; defaults to SQLite |
| `CORS_ORIGINS` | comma-separated allowed origins |
| `BACKEND_BASE_URL` / `FRONTEND_BASE_URL` | OAuth redirects |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional |

Frontend: `VITE_API_URL`.

Credentials for the databases you *reflect* are supplied per request and are
not persisted.

## Deployment

`render.yaml` deploys the API and a static frontend. Note the free tier uses
SQLite on an ephemeral disk, so diagrams reset on redeploy — swap `DATABASE_URL`
for a Postgres connection string if you want them to survive.

## Notes

Diagram ids are UUIDs rather than autoincrementing integers. With sequential
ids, `/editor/4` tells you `/editor/3` exists and belongs to someone else. The
migration to UUIDs runs at startup and rebuilds the table, because SQLite can't
alter a primary key's type in place.

Share tokens are separate values from diagram ids, so revoking a share link
doesn't change the diagram's own URL.
