import re
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from ..auth import create_access_token, hash_password
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


def _sanitize_username_base(raw: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_.-]", ".", raw).strip(".")
    return base[:50] if len(base) >= 2 else ""


def _unique_username(db: Session, base: str, fallback: str) -> str:
    candidate = _sanitize_username_base(base) or _sanitize_username_base(fallback) or "user"
    original = candidate
    suffix = 2
    while db.query(models.User).filter(models.User.username == candidate).first():
        candidate = f"{original}{suffix}"[:50]
        suffix += 1
    return candidate


def _get_or_create_oauth_user(db: Session, email: str, name_hint: str) -> models.User:
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return user

    username = _unique_username(db, name_hint, email.split("@")[0])
    # OAuth accounts never set a password — a random, never-shared hash keeps
    # the column NOT NULL without letting anyone log in with it.
    user = models.User(email=email, username=username, hashed_password=hash_password(secrets.token_urlsafe(32)))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _finish_login(user: models.User, return_to: str) -> RedirectResponse:
    token = create_access_token(subject=user.email)
    query = urlencode({"token": token, "returnTo": return_to})
    return RedirectResponse(f"{settings.frontend_base_url}/oauth/callback?{query}")


def _error_redirect(message: str) -> RedirectResponse:
    query = urlencode({"oauth_error": message})
    return RedirectResponse(f"{settings.frontend_base_url}/login?{query}")


@router.get("/google/login")
def google_login(returnTo: str = "/"):
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": f"{settings.backend_base_url}/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
        "state": returnTo,
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: str = "", state: str = "/", error: str = "", db: Session = Depends(get_db)):
    if error or not code:
        return _error_redirect("google_denied")

    redirect_uri = f"{settings.backend_base_url}/auth/google/callback"
    async with httpx.AsyncClient(timeout=10) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        if token_res.status_code != 200:
            return _error_redirect("google_token_exchange_failed")
        access_token = token_res.json().get("access_token")

        userinfo_res = await client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if userinfo_res.status_code != 200:
            return _error_redirect("google_userinfo_failed")
        info = userinfo_res.json()

    email = info.get("email")
    if not email or not info.get("email_verified", True):
        return _error_redirect("google_email_unverified")

    user = _get_or_create_oauth_user(db, email, info.get("name", ""))
    return _finish_login(user, state)


@router.get("/github/login")
def github_login(returnTo: str = "/"):
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": f"{settings.backend_base_url}/auth/github/callback",
        "scope": "read:user user:email",
        "state": returnTo,
    }
    return RedirectResponse(f"{GITHUB_AUTH_URL}?{urlencode(params)}")


@router.get("/github/callback")
async def github_callback(code: str = "", state: str = "/", error: str = "", db: Session = Depends(get_db)):
    if error or not code:
        return _error_redirect("github_denied")

    async with httpx.AsyncClient(timeout=10) as client:
        token_res = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": f"{settings.backend_base_url}/auth/github/callback",
            },
        )
        if token_res.status_code != 200:
            return _error_redirect("github_token_exchange_failed")
        access_token = token_res.json().get("access_token")
        if not access_token:
            return _error_redirect("github_token_exchange_failed")

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
        user_res = await client.get(GITHUB_USER_URL, headers=headers)
        emails_res = await client.get(GITHUB_EMAILS_URL, headers=headers)
        if user_res.status_code != 200:
            return _error_redirect("github_userinfo_failed")
        profile = user_res.json()

    email = None
    if emails_res.status_code == 200:
        for entry in emails_res.json():
            if entry.get("primary") and entry.get("verified"):
                email = entry["email"]
                break
    if not email:
        email = profile.get("email")
    if not email:
        return _error_redirect("github_email_unavailable")

    user = _get_or_create_oauth_user(db, email, profile.get("login", ""))
    return _finish_login(user, state)
