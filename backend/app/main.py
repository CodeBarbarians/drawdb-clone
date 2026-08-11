from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .config import settings
from .database import Base, engine
from .routers import auth, diagrams

Base.metadata.create_all(bind=engine)

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


@app.get("/health")
def health():
    return {"status": "ok"}
