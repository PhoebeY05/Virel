from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from urllib.request import urlopen

from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import Settings
from app.errors import error_payload


@dataclass
class CurrentUser:
    id: str
    email: str
    name: str
    auth_provider: str


def local_dev_user(settings: Settings) -> CurrentUser:
    return CurrentUser(
        id=settings.local_user_id,
        email=settings.local_user_email,
        name=settings.local_user_name,
        auth_provider="local",
    )


@lru_cache(maxsize=1)
def _import_jose() -> Any:
    try:
        from jose import jwt  # type: ignore
    except Exception as exc:  # pragma: no cover - optional dependency path
        raise RuntimeError("JWT verification requires python-jose") from exc
    return jwt


def verify_clerk_jwt(token: str, settings: Settings) -> CurrentUser:
    if not settings.clerk_jwks_url:
        raise RuntimeError("CLERK_JWKS_URL is not configured")
    jwt = _import_jose()
    with urlopen(str(settings.clerk_jwks_url), timeout=5) as response:
        jwks = json.loads(response.read().decode("utf-8"))
    header = jwt.get_unverified_header(token)
    key = next((candidate for candidate in jwks.get("keys", []) if candidate.get("kid") == header.get("kid")), None)
    if key is None:
        raise RuntimeError("JWT key not found in JWKS")
    claims = jwt.decode(token, key, algorithms=[header.get("alg", "RS256")], options={"verify_aud": False})
    return CurrentUser(
        id=str(claims.get("sub", "")),
        email=str(claims.get("email", "")),
        name=str(claims.get("name", claims.get("email", "Authenticated User"))),
        auth_provider="clerk",
    )


def auth_middleware(settings: Settings):
    public_paths = {"/health", "/platforms", "/openapi.json", "/docs", "/redoc"}

    async def middleware(request: Request, call_next):
        if not settings.auth_enabled:
            request.state.current_user = local_dev_user(settings)
            return await call_next(request)

        if request.url.path in public_paths or request.url.path.startswith("/static"):
            request.state.current_user = local_dev_user(settings)
            return await call_next(request)

        authorization = request.headers.get("authorization", "")
        if not authorization.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content=error_payload("Authentication required", "AUTH_REQUIRED"),
            )

        token = authorization.removeprefix("Bearer ").strip()
        try:
            request.state.current_user = verify_clerk_jwt(token, settings)
        except Exception as exc:
            return JSONResponse(
                status_code=401,
                content=error_payload("Invalid authentication token", "AUTH_INVALID", reason=str(exc)),
            )

        return await call_next(request)

    return middleware


def get_current_user(request: Request) -> CurrentUser:
    user = getattr(request.state, "current_user", None)
    if user is None:
        raise RuntimeError("Current user unavailable")
    return user
