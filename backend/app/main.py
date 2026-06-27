from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes.analytics import router as analytics_router
from app.api.routes.automation import router as automation_router
from app.api.routes.campaigns import router as campaigns_router
from app.api.routes.comments import router as comments_router
from app.api.routes.health import router as health_router
from app.api.routes.media import router as media_router
from app.api.routes.platforms import router as platforms_router
from app.api.routes.projects import router as projects_router
from app.auth import auth_middleware
from app.config import Settings, get_settings
from app.database import init_db, make_engine, make_session_factory
from app.errors import AppError, error_payload


def build_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = engine or make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    init_db(engine)

    app = FastAPI(title=settings.app_name)
    app.state.settings = settings
    app.state.engine = engine
    app.state.SessionLocal = session_factory

    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=media_dir), name="media")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(settings.frontend_url),
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.middleware("http")(auth_middleware(settings))

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(exc.detail, exc.code, **exc.payload),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_payload("Validation failed", "VALIDATION_ERROR", errors=exc.errors()),
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_db_error(_: Request, exc: SQLAlchemyError) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_payload("Database error", "DATABASE_ERROR", reason=str(exc)),
        )

    @app.exception_handler(Exception)
    async def handle_generic_error(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_payload("Internal server error", "INTERNAL_SERVER_ERROR", reason=str(exc)),
        )

    app.include_router(health_router)
    app.include_router(platforms_router)
    app.include_router(projects_router)
    app.include_router(campaigns_router)
    app.include_router(comments_router)
    app.include_router(analytics_router)
    app.include_router(automation_router)
    app.include_router(media_router)

    return app


app = build_app()
