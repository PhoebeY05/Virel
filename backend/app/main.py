from __future__ import annotations

from collections.abc import Generator

from fastapi import Depends, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.auth import CurrentUser, auth_middleware, get_current_user
from app.config import Settings, get_settings
from app.database import get_db as db_generator, init_db, make_engine, make_session_factory
from app.errors import AppError, error_payload
from app.schemas import (
    AnalyticsDetail,
    AutomationSessionCreate,
    AutomationSessionRead,
    AutomationSessionUpdate,
    CampaignDetail,
    CampaignGenerateRequest,
    CampaignRead,
    CampaignUpdate,
    CommentRead,
    GeneratedPostRead,
    HealthRead,
    PlatformAccountCreate,
    PlatformAccountRead,
    PlatformAccountUpdate,
    PostUpdate,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    ReplySendRequest,
    ReplySuggestionRead,
    ReplySuggestionRequest,
    SupportedPlatformRead,
)
from app.services import (
    create_automation_session,
    create_campaign_from_request,
    create_platform_account,
    create_project,
    campaign_to_detail,
    delete_campaign,
    delete_platform_account,
    delete_project,
    ensure_user,
    ensure_campaign,
    ensure_owned_project,
    get_automation_session,
    list_campaigns,
    list_comments_for_post,
    list_platform_accounts,
    list_posts_for_campaign,
    list_projects,
    list_supported_platforms,
    regenerate_post,
    send_reply,
    suggest_reply,
    summarize_all,
    summarize_campaign,
    summarize_project,
    update_automation_session,
    update_campaign,
    update_platform_account,
    update_post,
    update_project,
)


def get_request_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_request_db(request: Request) -> Generator[Session, None, None]:
    session_factory = request.app.state.SessionLocal
    yield from db_generator(session_factory)


def build_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = engine or make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    init_db(engine)

    app = FastAPI(title=settings.app_name)
    app.state.settings = settings
    app.state.engine = engine
    app.state.SessionLocal = session_factory

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(settings.frontend_url), "http://localhost:3000", "http://127.0.0.1:3000"],
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

    @app.get("/health", response_model=HealthRead)
    def health(request: Request) -> HealthRead:
        settings = request.app.state.settings
        return HealthRead(
            status="ok",
            service=settings.app_name,
            auth_enabled=settings.auth_enabled,
            database_url=settings.database_url,
        )

    @app.get("/platforms", response_model=list[SupportedPlatformRead])
    def get_platforms() -> list[SupportedPlatformRead]:
        return [SupportedPlatformRead.model_validate(platform) for platform in list_supported_platforms()]

    @app.get("/projects", response_model=list[ProjectRead])
    def get_projects(
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> list[ProjectRead]:
        user = ensure_user(db, current_user)
        return list_projects(db, user.id)

    @app.post("/projects", response_model=ProjectRead, status_code=201)
    def post_project(
        payload: ProjectCreate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ProjectRead:
        user = ensure_user(db, current_user)
        return create_project(db, user, payload)

    @app.get("/projects/{project_id}", response_model=ProjectRead)
    def get_project(
        project_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ProjectRead:
        user = ensure_user(db, current_user)
        return ensure_owned_project(db, project_id, user.id)

    @app.patch("/projects/{project_id}", response_model=ProjectRead)
    def patch_project(
        project_id: str,
        payload: ProjectUpdate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ProjectRead:
        user = ensure_user(db, current_user)
        return update_project(db, project_id, user.id, payload)

    @app.delete("/projects/{project_id}", status_code=204)
    def remove_project(
        project_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> Response:
        user = ensure_user(db, current_user)
        delete_project(db, project_id, user.id)
        return Response(status_code=204)

    @app.get("/campaigns", response_model=list[CampaignRead])
    def get_campaigns(
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> list[CampaignRead]:
        user = ensure_user(db, current_user)
        return list_campaigns(db, user.id)

    @app.post("/campaigns/generate", response_model=CampaignDetail, status_code=201)
    def generate_campaign(
        payload: CampaignGenerateRequest,
        db: Session = Depends(get_request_db),
        settings: Settings = Depends(get_request_settings),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CampaignDetail:
        user = ensure_user(db, current_user)
        return create_campaign_from_request(db, settings, user, payload)

    @app.get("/campaigns/{campaign_id}", response_model=CampaignDetail)
    def get_campaign(
        campaign_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CampaignDetail:
        user = ensure_user(db, current_user)
        campaign = ensure_campaign(db, campaign_id, user.id)
        return campaign_to_detail(campaign)

    @app.patch("/campaigns/{campaign_id}", response_model=CampaignDetail)
    def patch_campaign(
        campaign_id: str,
        payload: CampaignUpdate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CampaignDetail:
        user = ensure_user(db, current_user)
        return update_campaign(db, campaign_id, user.id, payload)

    @app.delete("/campaigns/{campaign_id}", status_code=204)
    def remove_campaign(
        campaign_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> Response:
        user = ensure_user(db, current_user)
        delete_campaign(db, campaign_id, user.id)
        return Response(status_code=204)

    @app.get("/campaigns/{campaign_id}/posts", response_model=list[GeneratedPostRead])
    def get_campaign_posts(
        campaign_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> list[GeneratedPostRead]:
        user = ensure_user(db, current_user)
        return list_posts_for_campaign(db, campaign_id, user.id)

    @app.patch("/posts/{post_id}", response_model=GeneratedPostRead)
    def patch_post(
        post_id: str,
        payload: PostUpdate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> GeneratedPostRead:
        user = ensure_user(db, current_user)
        return update_post(db, post_id, user.id, payload)

    @app.post("/posts/{post_id}/regenerate", response_model=GeneratedPostRead)
    def regenerate_generated_post(
        post_id: str,
        db: Session = Depends(get_request_db),
        settings: Settings = Depends(get_request_settings),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> GeneratedPostRead:
        user = ensure_user(db, current_user)
        return regenerate_post(db, settings, post_id, user.id)

    @app.get("/posts/{post_id}/comments", response_model=list[CommentRead])
    def get_post_comments(
        post_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> list[CommentRead]:
        user = ensure_user(db, current_user)
        return list_comments_for_post(db, post_id, user.id)

    @app.post("/comments/{comment_id}/suggest-reply", response_model=ReplySuggestionRead, status_code=201)
    def suggest_comment_reply(
        comment_id: str,
        payload: ReplySuggestionRequest,
        db: Session = Depends(get_request_db),
        settings: Settings = Depends(get_request_settings),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ReplySuggestionRead:
        user = ensure_user(db, current_user)
        return suggest_reply(db, settings, comment_id, user.id, payload.tone)

    @app.post("/comments/{comment_id}/reply", response_model=ReplySuggestionRead, status_code=201)
    def send_comment_reply(
        comment_id: str,
        payload: ReplySendRequest,
        db: Session = Depends(get_request_db),
        settings: Settings = Depends(get_request_settings),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ReplySuggestionRead:
        user = ensure_user(db, current_user)
        return send_reply(db, settings, comment_id, user.id, payload.tone)

    @app.get("/analytics/summary", response_model=AnalyticsDetail)
    def get_analytics_summary(
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> AnalyticsDetail:
        user = ensure_user(db, current_user)
        return summarize_all(db, user.id)

    @app.get("/analytics/projects/{project_id}", response_model=AnalyticsDetail)
    def get_project_analytics(
        project_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> AnalyticsDetail:
        user = ensure_user(db, current_user)
        return summarize_project(db, project_id, user.id)

    @app.get("/analytics/campaigns/{campaign_id}", response_model=AnalyticsDetail)
    def get_campaign_analytics(
        campaign_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> AnalyticsDetail:
        user = ensure_user(db, current_user)
        return summarize_campaign(db, campaign_id, user.id)

    @app.get("/projects/{project_id}/accounts", response_model=list[PlatformAccountRead])
    def get_accounts(
        project_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> list[PlatformAccountRead]:
        user = ensure_user(db, current_user)
        return list_platform_accounts(db, project_id, user.id)

    @app.post("/projects/{project_id}/accounts", response_model=PlatformAccountRead, status_code=201)
    def post_account(
        project_id: str,
        payload: PlatformAccountCreate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> PlatformAccountRead:
        user = ensure_user(db, current_user)
        return create_platform_account(db, project_id, user.id, payload)

    @app.patch("/accounts/{account_id}", response_model=PlatformAccountRead)
    def patch_account(
        account_id: str,
        payload: PlatformAccountUpdate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> PlatformAccountRead:
        user = ensure_user(db, current_user)
        return update_platform_account(db, account_id, user.id, payload)

    @app.delete("/accounts/{account_id}", status_code=204)
    def remove_account(
        account_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> Response:
        user = ensure_user(db, current_user)
        delete_platform_account(db, account_id, user.id)
        return Response(status_code=204)

    @app.post("/automation/sessions", response_model=AutomationSessionRead, status_code=201)
    def post_automation_session(
        payload: AutomationSessionCreate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> AutomationSessionRead:
        user = ensure_user(db, current_user)
        return create_automation_session(db, user.id, payload)

    @app.get("/automation/sessions/{session_id}", response_model=AutomationSessionRead)
    def get_automation(
        session_id: str,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> AutomationSessionRead:
        user = ensure_user(db, current_user)
        return get_automation_session(db, session_id, user.id)

    @app.patch("/automation/sessions/{session_id}", response_model=AutomationSessionRead)
    def patch_automation(
        session_id: str,
        payload: AutomationSessionUpdate,
        db: Session = Depends(get_request_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> AutomationSessionRead:
        user = ensure_user(db, current_user)
        return update_automation_session(db, session_id, user.id, payload)

    return app


app = build_app()
