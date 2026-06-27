"""Route modules for the Virel API."""

from app.api.routes.analytics import router as analytics_router
from app.api.routes.automation import router as automation_router
from app.api.routes.campaigns import router as campaigns_router
from app.api.routes.comments import router as comments_router
from app.api.routes.health import router as health_router
from app.api.routes.platforms import router as platforms_router
from app.api.routes.projects import router as projects_router

__all__ = [
    "analytics_router",
    "automation_router",
    "campaigns_router",
    "comments_router",
    "health_router",
    "platforms_router",
    "projects_router",
]
