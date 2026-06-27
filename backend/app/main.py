from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


PlatformName = Literal[
    "Instagram",
    "Reddit",
    "LinkedIn",
    "TikTok",
    "X",
    "Facebook",
    "Discord",
    "Product Hunt",
    "Hacker News",
]
ProjectStatus = Literal["Planning", "Active", "Paused", "Launched"]
PlatformStatus = Literal["Connected", "Pending", "Needs verification", "Error"]
CampaignStatus = Literal["Draft", "Scheduled", "Live", "Complete"]
PostStatus = Literal["Draft", "Scheduled", "Published"]


class ProjectIn(BaseModel):
    name: str
    tagline: str
    status: ProjectStatus
    platforms: list[PlatformName]


class Project(ProjectIn):
    id: str
    progress: int
    lastUpdated: str


class CampaignDay(BaseModel):
    id: str
    day: int
    title: str
    platforms: list[PlatformName]
    content: str
    scheduledTime: str
    status: PostStatus


class GeneratedPost(BaseModel):
    id: str
    platform: PlatformName
    projectId: str
    title: str
    content: str
    status: PostStatus
    engagementEstimate: int


class Campaign(BaseModel):
    id: str
    projectId: str
    name: str
    audience: str
    goal: str
    platforms: list[PlatformName]
    status: CampaignStatus
    days: list[CampaignDay]
    posts: list[GeneratedPost]


class CampaignGenerateIn(BaseModel):
    projectId: str
    projectName: str
    audience: str
    goal: str
    platforms: list[PlatformName]


class AnalyticsPoint(BaseModel):
    label: str
    engagement: int
    likes: int
    comments: int
    shares: int
    ctr: float


class PlatformAnalytics(BaseModel):
    platform: PlatformName
    engagement: int
    growth: int


class TopPost(BaseModel):
    id: str
    title: str
    platform: PlatformName
    engagement: int
    ctr: float


class AnalyticsSummary(BaseModel):
    activeCampaigns: int
    totalProjects: int
    engagement: int
    ctr: float


class Analytics(BaseModel):
    summary: AnalyticsSummary
    timeline: list[AnalyticsPoint]
    platforms: list[PlatformAnalytics]
    topPosts: list[TopPost]


class Platform(BaseModel):
    id: str
    name: PlatformName
    status: PlatformStatus
    username: str
    phoneRequired: bool
    automation: Literal["Assisted setup", "Guidance only", "Ready"]


class PlatformActionIn(BaseModel):
    platformId: str


platform_names: list[PlatformName] = [
    "Instagram",
    "Reddit",
    "LinkedIn",
    "TikTok",
    "X",
    "Facebook",
    "Discord",
    "Product Hunt",
    "Hacker News",
]

projects: list[Project] = [
    Project(
        id="proj-1",
        name="StudySnap AI",
        tagline="Turn messy lecture notes into revision cards in seconds.",
        status="Active",
        platforms=["Instagram", "Reddit", "TikTok", "Product Hunt"],
        progress=72,
        lastUpdated="2026-06-24",
    ),
    Project(
        id="proj-2",
        name="CampusSwap",
        tagline="A trusted marketplace for dorm essentials and textbooks.",
        status="Planning",
        platforms=["Facebook", "Discord", "Reddit"],
        progress=38,
        lastUpdated="2026-06-22",
    ),
    Project(
        id="proj-3",
        name="PitchPilot",
        tagline="AI feedback for hackathon demo scripts and slides.",
        status="Launched",
        platforms=["LinkedIn", "X", "Hacker News", "Product Hunt"],
        progress=94,
        lastUpdated="2026-06-20",
    ),
    Project(
        id="proj-4",
        name="MindfulMiles",
        tagline="A gentle habit tracker for student runners.",
        status="Paused",
        platforms=["Instagram", "TikTok", "Discord"],
        progress=51,
        lastUpdated="2026-06-18",
    ),
]

campaigns: list[Campaign] = [
    Campaign(
        id="camp-1",
        projectId="proj-1",
        name="StudySnap launch week",
        audience="College students preparing for finals",
        goal="Drive beta signups",
        platforms=["Instagram", "Reddit", "TikTok", "Product Hunt"],
        status="Live",
        days=[
            CampaignDay(id="day-1", day=1, title="Problem reveal", platforms=["Instagram", "TikTok"], content="Show the pain of scattered notes and tease a faster study workflow.", scheduledTime="09:00", status="Published"),
            CampaignDay(id="day-2", day=2, title="Founder story", platforms=["Reddit", "LinkedIn"], content="Share why the team built StudySnap after a chaotic exam week.", scheduledTime="12:30", status="Scheduled"),
            CampaignDay(id="day-3", day=3, title="Demo clip", platforms=["TikTok", "Instagram"], content="Convert a real lecture screenshot into flashcards in under 20 seconds.", scheduledTime="16:00", status="Draft"),
            CampaignDay(id="day-4", day=4, title="Community ask", platforms=["Reddit", "Discord"], content="Ask students which classes create the worst note overload.", scheduledTime="18:00", status="Draft"),
            CampaignDay(id="day-5", day=5, title="Beta invite", platforms=["Product Hunt", "X"], content="Invite early users to test the beta and give feedback.", scheduledTime="10:15", status="Draft"),
            CampaignDay(id="day-6", day=6, title="Proof point", platforms=["Instagram", "LinkedIn"], content="Highlight mock results: 400 cards generated across 25 testers.", scheduledTime="14:45", status="Draft"),
            CampaignDay(id="day-7", day=7, title="Launch recap", platforms=["X", "Facebook", "Discord"], content="Share learnings, thank testers, and point followers to the waitlist.", scheduledTime="17:30", status="Draft"),
        ],
        posts=[
            GeneratedPost(id=f"post-{index + 1}", platform=platform, projectId="proj-1", title=f"{platform} launch post", content="StudySnap AI helps students turn lecture chaos into focused revision. Join the beta and help shape the study workflow students actually want.", status="Scheduled" if index < 2 else "Draft", engagementEstimate=52 + index * 5)
            for index, platform in enumerate(platform_names)
        ],
    )
]

analytics = Analytics(
    summary=AnalyticsSummary(activeCampaigns=6, totalProjects=4, engagement=18420, ctr=7.8),
    timeline=[
        AnalyticsPoint(label="Mon", engagement=1800, likes=780, comments=120, shares=90, ctr=4.7),
        AnalyticsPoint(label="Tue", engagement=2400, likes=940, comments=170, shares=130, ctr=5.5),
        AnalyticsPoint(label="Wed", engagement=3100, likes=1300, comments=220, shares=180, ctr=6.8),
        AnalyticsPoint(label="Thu", engagement=2900, likes=1210, comments=205, shares=160, ctr=6.2),
        AnalyticsPoint(label="Fri", engagement=4200, likes=1900, comments=310, shares=260, ctr=8.4),
        AnalyticsPoint(label="Sat", engagement=3950, likes=1650, comments=285, shares=240, ctr=8.1),
        AnalyticsPoint(label="Sun", engagement=5070, likes=2300, comments=380, shares=310, ctr=9.7),
    ],
    platforms=[
        PlatformAnalytics(platform="TikTok", engagement=5200, growth=19),
        PlatformAnalytics(platform="Instagram", engagement=4600, growth=15),
        PlatformAnalytics(platform="Reddit", engagement=3700, growth=11),
        PlatformAnalytics(platform="Product Hunt", engagement=2800, growth=8),
        PlatformAnalytics(platform="LinkedIn", engagement=2120, growth=6),
    ],
    topPosts=[
        TopPost(id="top-1", title="From lecture notes to flashcards", platform="TikTok", engagement=4200, ctr=9.8),
        TopPost(id="top-2", title="We built this after finals week", platform="Reddit", engagement=3100, ctr=8.9),
        TopPost(id="top-3", title="StudySnap beta is open", platform="Product Hunt", engagement=2800, ctr=8.1),
    ],
)

platforms: list[Platform] = [
    Platform(id="plat-1", name="Instagram", status="Connected", username="@studysnapai", phoneRequired=False, automation="Assisted setup"),
    Platform(id="plat-2", name="Reddit", status="Connected", username="u/StudySnapAI", phoneRequired=False, automation="Assisted setup"),
    Platform(id="plat-3", name="LinkedIn", status="Needs verification", username="StudySnap AI", phoneRequired=True, automation="Guidance only"),
    Platform(id="plat-4", name="TikTok", status="Pending", username="@studysnapai", phoneRequired=True, automation="Assisted setup"),
    Platform(id="plat-5", name="X", status="Error", username="@StudySnapAI", phoneRequired=True, automation="Assisted setup"),
    Platform(id="plat-6", name="Discord", status="Connected", username="StudySnap Community", phoneRequired=False, automation="Ready"),
]

app = FastAPI(title="Virel API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def today() -> str:
    return date.today().isoformat()


def find_project(project_id: str) -> Project:
    for project in projects:
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail="Project not found")


def find_platform(platform_id: str) -> Platform:
    for platform in platforms:
        if platform.id == platform_id:
            return platform
    raise HTTPException(status_code=404, detail="Platform not found")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/projects", response_model=list[Project])
def get_projects() -> list[Project]:
    return projects


@app.post("/projects", response_model=Project, status_code=201)
def create_project(project_in: ProjectIn) -> Project:
    project = Project(
        **project_in.model_dump(),
        id=f"proj-{len(projects) + 1}",
        progress=12,
        lastUpdated=today(),
    )
    projects.insert(0, project)
    return project


@app.put("/projects/{project_id}", response_model=Project)
def update_project(project_id: str, patch: ProjectIn) -> Project:
    project = find_project(project_id)
    updated = project.model_copy(update={**patch.model_dump(), "lastUpdated": today()})
    projects[projects.index(project)] = updated
    return updated


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str) -> None:
    project = find_project(project_id)
    projects.remove(project)


@app.get("/campaigns", response_model=list[Campaign])
def get_campaigns() -> list[Campaign]:
    return campaigns


@app.post("/campaigns/generate", response_model=Campaign, status_code=201)
def generate_campaign(input_data: CampaignGenerateIn) -> Campaign:
    selected_platforms = input_data.platforms or platform_names[:4]
    titles = ["Hook", "Story", "Demo", "Community", "Proof", "Invite", "Recap"]
    campaign_id = f"camp-{len(campaigns) + 1}"
    days = [
        CampaignDay(
            id=f"{campaign_id}-day-{index + 1}",
            day=index + 1,
            title=titles[index],
            platforms=selected_platforms[: min(len(selected_platforms), index % 3 + 1)],
            content=f"{input_data.projectName} campaign day {index + 1}: speak to {input_data.audience.lower()} and move them toward {input_data.goal.lower()}.",
            scheduledTime=f"{9 + index:02d}:00",
            status="Draft",
        )
        for index in range(7)
    ]
    posts = [
        GeneratedPost(
            id=f"{campaign_id}-post-{index + 1}",
            platform=platform,
            projectId=input_data.projectId,
            title=f"{input_data.projectName} on {platform}",
            content=f"Launch note for {platform}: {input_data.projectName} is built for {input_data.audience.lower()}. {input_data.goal}.",
            status="Draft",
            engagementEstimate=58 + index * 7,
        )
        for index, platform in enumerate(selected_platforms)
    ]
    campaign = Campaign(
        id=campaign_id,
        projectId=input_data.projectId,
        name=f"{input_data.projectName} generated launch",
        audience=input_data.audience,
        goal=input_data.goal,
        platforms=selected_platforms,
        status="Draft",
        days=days,
        posts=posts,
    )
    campaigns.insert(0, campaign)
    return campaign


@app.get("/analytics", response_model=Analytics)
def get_analytics() -> Analytics:
    return analytics.model_copy(
        update={
            "summary": analytics.summary.model_copy(
                update={
                    "activeCampaigns": len(campaigns),
                    "totalProjects": len(projects),
                }
            )
        }
    )


@app.get("/platforms", response_model=list[Platform])
def get_platforms() -> list[Platform]:
    return platforms


@app.post("/automation/connect", response_model=Platform)
def connect_platform(input_data: PlatformActionIn) -> Platform:
    platform = find_platform(input_data.platformId)
    updated = platform.model_copy(update={"status": "Pending"})
    platforms[platforms.index(platform)] = updated
    return updated


@app.post("/automation/disconnect", response_model=Platform)
def disconnect_platform(input_data: PlatformActionIn) -> Platform:
    platform = find_platform(input_data.platformId)
    updated = platform.model_copy(update={"status": "Needs verification"})
    platforms[platforms.index(platform)] = updated
    return updated
