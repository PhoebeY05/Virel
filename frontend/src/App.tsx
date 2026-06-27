import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ChartColumn,
  ChevronRight,
  CircleDashed,
  Clock3,
  ExternalLink,
  FolderKanban,
  Ghost,
  Globe,
  LayoutDashboard,
  LineChart,
  Network,
  PencilLine,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Settings2,
  Trash2,
  UserRoundPlus,
  WandSparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { platformNames } from './mocks/data'
import { useAsync } from './hooks/useAsync'
import { getAnalytics } from './services/analytics'
import { connectAutomation, createAutomationSession, getPlatforms } from './services/automation'
import { generateCampaign, getCampaigns, type GenerateCampaignInput } from './services/campaigns'
import { createProject, deleteProject, getProjects, updateProject, type ProjectInput } from './services/projects'
import type {
  Analytics,
  Campaign,
  Platform,
  PlatformName,
  Project,
  ProjectStatus,
  AutomationSession,
} from './types'

type View = 'Dashboard' | 'Projects' | 'Campaigns' | 'Analytics' | 'Automation' | 'Settings'

const NAV_ITEMS: Array<{
  view: View
  label: string
  icon: LucideIcon
  description: string
}> = [
  { view: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Performance snapshot' },
  { view: 'Projects', label: 'Projects', icon: BriefcaseBusiness, description: 'Project workspace' },
  { view: 'Campaigns', label: 'Campaigns', icon: WandSparkles, description: 'Generate launch plans' },
  { view: 'Analytics', label: 'Analytics', icon: LineChart, description: 'Campaign performance' },
  { view: 'Automation', label: 'Automation', icon: Network, description: 'Guided setup assistant' },
  { view: 'Settings', label: 'Settings', icon: Settings2, description: 'Workspace preferences' },
]

const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['Planning', 'Active', 'Paused', 'Launched']
const TONE_OPTIONS = ['Confident', 'Warm', 'Strategic', 'Bold']
const inputClass =
  'mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'
const selectClass = `${inputClass} pr-10`
const textareaClass = `${inputClass} min-h-[120px] resize-y`
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40'
const primaryButton = `${buttonBase} bg-emerald-400 text-slate-950 hover:bg-emerald-300`
const secondaryButton = `${buttonBase} border border-white/10 bg-white/5 text-slate-100 hover:border-white/20 hover:bg-white/10`
const ghostButton = `${buttonBase} border border-transparent bg-transparent text-slate-300 hover:bg-white/5 hover:text-white`
const cardClass = 'rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-[0_18px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl'
const softCardClass = 'rounded-[24px] border border-white/10 bg-white/5 p-5'
const panelClass = 'rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl'

function App() {
  const [view, setView] = useState<View>('Dashboard')

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar view={view} onChange={setView} />
        <main className="relative overflow-hidden">
          <TopBar view={view} onChange={setView} />
          <div className="relative z-10 px-5 pb-10 pt-2 lg:px-8">
            {view === 'Dashboard' && <DashboardView onNavigate={setView} />}
            {view === 'Projects' && <ProjectsView />}
            {view === 'Campaigns' && <CampaignsView />}
            {view === 'Analytics' && <AnalyticsView />}
            {view === 'Automation' && <AutomationView />}
            {view === 'Settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <aside className="border-b border-white/10 bg-slate-950/90 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex items-center gap-3 rounded-2xl px-2 py-1 text-left transition hover:bg-white/5"
          onClick={() => onChange('Dashboard')}
          type="button"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-lg font-black text-slate-950 shadow-lg shadow-emerald-500/20">
            V
          </span>
          <span className="leading-tight">
            <strong className="block font-display text-lg tracking-tight">Virel</strong>
            <span className="block text-xs uppercase tracking-[0.28em] text-slate-400">Launch studio</span>
          </span>
        </button>
        <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300 lg:inline-flex">
          Live backend
        </span>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Workspace note</p>
        <h2 className="mt-2 font-display text-xl tracking-tight text-white">Human-in-the-loop by design</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Virel keeps signup approval, CAPTCHA, and verification with the user while the backend
          handles setup coordination and campaign generation.
        </p>
      </div>

      <nav className="mt-6 grid gap-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.view === view
          return (
            <button
              className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-white shadow-lg shadow-emerald-500/10'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
              }`}
              key={item.view}
              onClick={() => onChange(item.view)}
              type="button"
            >
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm ${
                  active
                    ? 'border-emerald-400/30 bg-emerald-400 text-slate-950'
                    : 'border-white/10 bg-white/5 text-slate-300 group-hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-medium">{item.label}</span>
                <span className="mt-1 block text-xs text-slate-400">{item.description}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-6 rounded-[28px] border border-sky-400/15 bg-sky-400/8 p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Product lens</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          The live frontend uses the backend directly. There are no local mock fallbacks in the
          production surfaces.
        </p>
      </div>
    </aside>
  )
}

function TopBar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 px-5 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Virel workspace</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-display text-3xl tracking-tight text-white lg:text-4xl">{view}</h1>
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300 sm:inline-flex">
              Corporate UI
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={secondaryButton} onClick={() => onChange('Projects')} type="button">
            <FolderKanban className="h-4 w-4" />
            Projects
          </button>
          <button className={primaryButton} onClick={() => onChange('Campaigns')} type="button">
            <Sparkles className="h-4 w-4" />
            Generate
          </button>
        </div>
      </div>
    </header>
  )
}

function DashboardView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const projectsState = useAsync(getProjects)
  const campaignsState = useAsync(getCampaigns)
  const analyticsState = useAsync(getAnalytics)
  const platformsState = useAsync(getPlatforms)

  const loading = projectsState.isLoading || campaignsState.isLoading || analyticsState.isLoading || platformsState.isLoading
  const error = projectsState.error || campaignsState.error || analyticsState.error || platformsState.error

  const projects = projectsState.data ?? []
  const campaigns = campaignsState.data ?? []
  const analytics = analyticsState.data
  const platforms = platformsState.data ?? []

  if (loading) {
    return <LoadingGrid />
  }

  if (error) {
    const retry = projectsState.error ? projectsState.retry : campaignsState.error ? campaignsState.retry : analyticsState.error ? analyticsState.retry : platformsState.retry
    return <ErrorState title="The dashboard could not load." message={error} retry={retry} />
  }

  if (!analytics) {
    return <EmptyState title="No backend data yet." description="Create a project and generate a campaign to populate the workspace." />
  }

  const latestProject = projects[0]
  const latestCampaign = campaigns[0]
  const featuredPlatform = analytics.platforms[0]

  return (
    <div className="space-y-6">
      <section className={`${panelClass} overflow-hidden relative`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-emerald-300/80">AI marketing infrastructure</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl tracking-tight text-white sm:text-5xl">
              Launch student projects with a real backend, a polished surface, and zero fake data.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Projects, campaigns, analytics, and guided automation all come from the backend now.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className={primaryButton} onClick={() => onNavigate('Projects')} type="button">
                Create project
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className={secondaryButton} onClick={() => onNavigate('Campaigns')} type="button">
                Generate campaign
              </button>
              <button className={ghostButton} onClick={() => onNavigate('Automation')} type="button">
                Setup assistant
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile label="Projects" value={analytics.summary.totalProjects.toString()} icon={BriefcaseBusiness} />
              <MetricTile label="Active campaigns" value={analytics.summary.activeCampaigns.toString()} icon={Sparkles} />
              <MetricTile label="Engagement" value={formatNumber(analytics.summary.engagement)} icon={ChartColumn} />
              <MetricTile label="CTR" value={`${analytics.summary.ctr}%`} icon={LineChart} />
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Best platform</p>
                  <h3 className="mt-1 font-display text-2xl tracking-tight text-white">
                    {featuredPlatform?.platform ?? 'N/A'}
                  </h3>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {featuredPlatform ? `${featuredPlatform.growth}% growth` : 'Live'}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {featuredPlatform
                  ? `The backend currently reports ${featuredPlatform.platform} as the strongest channel for this workspace.`
                  : 'The analytics service will fill this in once the backend has campaign data.'}
              </p>
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-300">
                <Clock3 className="h-4 w-4 text-emerald-300" />
                Updated moments ago from the live API
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className={cardClass}>
          <SectionHeading
            eyebrow="Project spotlight"
            title="Most recent project"
            action={<button className={ghostButton} onClick={() => onNavigate('Projects')} type="button">Manage projects</button>}
          />
          {latestProject ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl tracking-tight text-white">{latestProject.name}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {latestProject.description || latestProject.tagline}
                  </p>
                </div>
                <StatusPill status={latestProject.status} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MiniFact label="Audience" value={latestProject.targetAudience || 'Not set'} />
                <MiniFact label="Goal" value={latestProject.goal || 'Not set'} />
                <MiniFact label="Updated" value={formatDateString(latestProject.updatedAt || latestProject.lastUpdated)} />
              </div>
              <ProgressMeter value={latestProject.progress} />
            </div>
          ) : (
            <EmptyState
              title="No project yet"
              description="Start with a project record so campaign generation has something real to anchor to."
              compact
            />
          )}
        </article>

        <article className={cardClass}>
          <SectionHeading
            eyebrow="Campaign snapshot"
            title="Latest launch plan"
            action={<button className={ghostButton} onClick={() => onNavigate('Campaigns')} type="button">Open builder</button>}
          />
          {latestCampaign ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl tracking-tight text-white">{latestCampaign.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {latestCampaign.summary || latestCampaign.audience || latestCampaign.goal}
                  </p>
                </div>
                <StatusPill status={latestCampaign.status} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MiniFact label="Platforms" value={latestCampaign.platforms.join(', ') || 'Not set'} />
                <MiniFact label="Tone" value={latestCampaign.tone || 'Confident'} />
                <MiniFact label="Goal" value={latestCampaign.goal} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {latestCampaign.days.slice(0, 3).map((day) => (
                  <div key={day.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Day {day.day}</p>
                    <p className="mt-2 font-medium text-white">{day.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{day.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No campaign yet"
              description="Generate a campaign from a project to unlock the campaign snapshot."
              compact
            />
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className={cardClass}>
          <SectionHeading eyebrow="Backend coverage" title="Live surfaces" />
          <div className="mt-5 grid gap-3">
            {[
              ['Projects', projects.length],
              ['Campaigns', campaigns.length],
              ['Platforms', platforms.length],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-slate-300">{label}</span>
                <span className="text-lg font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={cardClass}>
          <SectionHeading eyebrow="Activity" title="Engagement timeline" />
          <div className="mt-5">
            <TimelineChart points={analytics.timeline} />
          </div>
        </article>
      </section>
    </div>
  )
}

function ProjectsView() {
  const projectsState = useAsync(getProjects)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const projects = projectsState.data ?? []

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const haystack = [
        project.name,
        project.description,
        project.tagline,
        project.targetAudience,
        project.goal,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = haystack.includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || project.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [projects, search, statusFilter])

  async function handleSave(input: ProjectInput) {
    setActionError(null)
    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, input)
        projectsState.setData(projects.map((project) => (project.id === updated.id ? updated : project)))
        setEditingProject(null)
        return
      }

      const created = await createProject(input)
      projectsState.setData([created, ...projects])
      setIsCreating(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Project save failed.')
    }
  }

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await deleteProject(id)
      projectsState.setData(projects.filter((project) => project.id !== id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Project delete failed.')
    }
  }

  if (projectsState.isLoading) {
    return <LoadingGrid />
  }

  if (projectsState.error) {
    return <ErrorState title="Projects could not load." message={projectsState.error} retry={projectsState.retry} />
  }

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <SectionHeading
          eyebrow="Projects"
          title="Manage project records from the backend"
          description="Create the official project profile first. Campaign generation and automation can hang off this record."
          action={
            <button className={primaryButton} onClick={() => setIsCreating(true)} type="button">
              <Plus className="h-4 w-4" />
              New project
            </button>
          }
        />
        <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_0.5fr]">
          <input
            aria-label="Search projects"
            className={inputClass}
            placeholder="Search by name, goal, or audience"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Filter by status"
            className={selectClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProjectStatus | 'All')}
          >
            <option>All</option>
            {PROJECT_STATUS_OPTIONS.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        {actionError && <p className="mt-4 text-sm text-rose-300">{actionError}</p>}
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="No projects match the filters."
          description="Create a project or clear the search field to continue."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
              onEdit={setEditingProject}
            />
          ))}
        </div>
      )}

      {(isCreating || editingProject) && (
        <ProjectEditorModal
          initial={editingProject ?? undefined}
          onCancel={() => {
            setIsCreating(false)
            setEditingProject(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function CampaignsView() {
  const projectsState = useAsync(getProjects)
  const campaignsState = useAsync(getCampaigns)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [goal, setGoal] = useState('Drive signups and demo requests')
  const [tone, setTone] = useState('Confident')
  const [title, setTitle] = useState('')
  const [platforms, setPlatforms] = useState<PlatformName[]>(platformNames.slice(0, 3))
  const [generatedCampaign, setGeneratedCampaign] = useState<Campaign | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const projects = projectsState.data ?? []
  const campaigns = campaignsState.data ?? []
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]

  const campaignPreview = generatedCampaign ?? campaigns[0]

  async function handleGenerate() {
    if (!selectedProject || platforms.length === 0) return
    setActionError(null)

    try {
      const payload: GenerateCampaignInput = {
        projectId: selectedProject.id,
        goal,
        platforms,
        tone,
        title: title || `${selectedProject.name} launch sprint`,
      }

      const campaign = await generateCampaign(payload)
      setGeneratedCampaign(campaign)
      campaignsState.setData([campaign, ...campaigns])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Campaign generation failed.')
    }
  }

  function togglePlatform(platform: PlatformName) {
    setPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    )
  }

  if (projectsState.isLoading || campaignsState.isLoading) {
    return <LoadingGrid />
  }

  if (projectsState.error) {
    return <ErrorState title="Projects are required before campaign generation." message={projectsState.error} retry={projectsState.retry} />
  }

  if (campaignsState.error) {
    return <ErrorState title="Campaigns could not load." message={campaignsState.error} retry={campaignsState.retry} />
  }

  if (!selectedProject) {
    return (
      <EmptyState
        title="Create a project first"
        description="Campaigns are generated from a project record. Add one in the Projects section to continue."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <SectionHeading
          eyebrow="Campaign builder"
          title="Generate a launch plan from the backend"
          description="The backend assembles the campaign days and posts. This view simply directs the brief."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className={cardClass}>
            <div className="grid gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-200">Project</span>
                <select
                  className={selectClass}
                  value={selectedProject.id}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-200">Title</span>
                <input
                  className={inputClass}
                  placeholder={`${selectedProject.name} launch sprint`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-200">Goal</span>
                <input className={inputClass} value={goal} onChange={(event) => setGoal(event.target.value)} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-200">Tone</span>
                  <select className={selectClass} value={tone} onChange={(event) => setTone(event.target.value)}>
                    {TONE_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-slate-200">Platforms</p>
                  <p className="mt-1 text-xs text-slate-400">Choose the channels the backend should plan for.</p>
                </div>
              </div>

              <PlatformChooser selected={platforms} onToggle={togglePlatform} />

              <button className={primaryButton} onClick={() => void handleGenerate()} type="button">
                <Sparkles className="h-4 w-4" />
                Generate campaign
              </button>
            </div>
          </div>

          <div className={cardClass}>
            <SectionHeading eyebrow="Generated output" title="Campaign preview" />
            {campaignPreview ? (
              <div className="mt-5 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl tracking-tight text-white">{campaignPreview.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {campaignPreview.summary || campaignPreview.audience || campaignPreview.goal}
                    </p>
                  </div>
                  <StatusPill status={campaignPreview.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniFact label="Project" value={selectedProject.name} />
                  <MiniFact label="Platforms" value={campaignPreview.platforms.join(', ') || 'Not set'} />
                  <MiniFact label="Tone" value={campaignPreview.tone || tone} />
                </div>

                <div className="space-y-3">
                  {campaignPreview.days.slice(0, 4).map((day) => (
                    <div key={day.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Day {day.day}</p>
                        <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">
                          {day.status}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-white">{day.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{day.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className={secondaryButton} onClick={() => setGeneratedCampaign(campaignPreview)} type="button">
                    Keep preview
                  </button>
                  <button className={ghostButton} onClick={() => setTitle('')} type="button">
                    Reset title
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Your campaign preview appears here."
                description="Generate once to render the backend-created days and posts."
                compact
              />
            )}
          </div>
        </div>
        {actionError && <p className="mt-4 text-sm text-rose-300">{actionError}</p>}
      </section>

      <section className={cardClass}>
        <SectionHeading eyebrow="Existing campaigns" title="Launch history" />
        {campaigns.length === 0 ? (
          <EmptyState title="No campaigns yet." description="Generate the first campaign to populate this list." compact />
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AnalyticsView() {
  const analyticsState = useAsync(getAnalytics)
  const campaignsState = useAsync(getCampaigns)
  const projectsState = useAsync(getProjects)

  const analytics = analyticsState.data
  const campaigns = campaignsState.data ?? []
  const projects = projectsState.data ?? []

  const loading = analyticsState.isLoading || campaignsState.isLoading || projectsState.isLoading
  const error = analyticsState.error || campaignsState.error || projectsState.error

  if (loading) {
    return <LoadingGrid />
  }

  if (error) {
    const retry = analyticsState.error ? analyticsState.retry : campaignsState.error ? campaignsState.retry : projectsState.retry
    return <ErrorState title="Analytics could not load." message={error} retry={retry} />
  }

  if (!analytics) {
    return (
      <EmptyState
        title="No analytics available yet."
        description="Generate a campaign and the backend will begin returning performance data."
      />
    )
  }

  const recentPosts = campaigns[0]?.posts.slice(0, 4) ?? []

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <SectionHeading
          eyebrow="Analytics"
          title="Measure what the backend sees"
          description="The summary and timeline are live API responses. Post-level performance will fill in as more backend data is added."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Projects" value={projects.length.toString()} icon={BriefcaseBusiness} />
          <MetricTile label="Active campaigns" value={analytics.summary.activeCampaigns.toString()} icon={Sparkles} />
          <MetricTile label="Engagement" value={formatNumber(analytics.summary.engagement)} icon={ChartColumn} />
          <MetricTile label="CTR" value={`${analytics.summary.ctr}%`} icon={LineChart} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className={cardClass}>
          <SectionHeading eyebrow="Timeline" title="Engagement over time" />
          <div className="mt-5">
            <TimelineChart points={analytics.timeline} />
          </div>
        </article>

        <article className={cardClass}>
          <SectionHeading eyebrow="Platform mix" title="Best performing platform" />
          <div className="mt-5 space-y-4">
            {analytics.platforms.map((platform) => (
              <div key={platform.platform} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">{platform.platform}</span>
                  <span className="text-sm text-emerald-300">{platform.growth}% growth</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                    style={{ width: `${Math.min(platform.engagement / Math.max(analytics.summary.engagement, 1), 1) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analytics.platforms.length === 0 && (
              <EmptyState title="No platform breakdown yet." description="The backend will expose more detail as campaigns accumulate." compact />
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className={cardClass}>
          <SectionHeading eyebrow="Summary" title="Key metrics" />
          <div className="mt-5 space-y-3">
            <DataRow label="Best channel" value={analytics.platforms[0]?.platform ?? 'N/A'} />
            <DataRow label="Projects tracked" value={projects.length.toString()} />
            <DataRow label="Campaigns tracked" value={campaigns.length.toString()} />
            <DataRow label="CTR" value={`${analytics.summary.ctr}%`} />
          </div>
        </article>

        <article className={cardClass}>
          <SectionHeading eyebrow="Recent posts" title="Generated content" />
          {recentPosts.length === 0 ? (
            <EmptyState title="No generated posts yet." description="Create a campaign to see posts here." compact />
          ) : (
            <div className="mt-5 grid gap-3">
              {recentPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{post.title}</span>
                    <StatusPill status={post.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{post.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{post.platform}</span>
                    <span>•</span>
                    <span>{post.engagementEstimate}% fit</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

function AutomationView() {
  const platformsState = useAsync(getPlatforms)
  const projectsState = useAsync(getProjects)
  const [selectedPlatformId, setSelectedPlatformId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [username, setUsername] = useState('@studysnapai')
  const [bio, setBio] = useState('Study smarter, not harder.')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [accountUrl, setAccountUrl] = useState('')
  const [notes, setNotes] = useState('Prepare the brand assets, then walk the user through verification.')
  const [sessions, setSessions] = useState<AutomationSession[]>([])
  const [sessionError, setSessionError] = useState<string | null>(null)

  const platforms = platformsState.data ?? []
  const projects = projectsState.data ?? []
  const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId) ?? platforms[0]
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]

  async function handleRequestConnection() {
    if (!selectedProject || !selectedPlatform) return
    setSessionError(null)
    try {
      const session = await connectAutomation({
        projectId: selectedProject.id,
        platform: selectedPlatform.name,
        payload: {
          username,
          bio,
          profile_image_url: profileImageUrl,
          account_url: accountUrl,
          notes,
        },
      })

      setSessions((current) => [session, ...current])
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Automation connect failed.')
    }
  }

  async function handleQueueSession() {
    if (!selectedProject || !selectedPlatform) return
    setSessionError(null)
    try {
      const session = await createAutomationSession({
        projectId: selectedProject.id,
        platform: selectedPlatform.name,
        status: 'queued',
        step: 'draft_created',
        progress: 12,
        payload: {
          username,
          bio,
          profile_image_url: profileImageUrl,
          account_url: accountUrl,
          notes,
        },
      })

      setSessions((current) => [session, ...current])
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Automation session creation failed.')
    }
  }

  if (platformsState.isLoading || projectsState.isLoading) {
    return <LoadingGrid />
  }

  if (platformsState.error) {
    return <ErrorState title="Automation catalog could not load." message={platformsState.error} retry={platformsState.retry} />
  }

  if (projectsState.error) {
    return <ErrorState title="Projects are required for automation." message={projectsState.error} retry={projectsState.retry} />
  }

  if (!selectedPlatform || !selectedProject) {
    return (
      <EmptyState
        title="Create a project first"
        description="Automation sessions need a project and a supported platform."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <SectionHeading
          eyebrow="Automation"
          title="Guided setup, backed by the real API"
          description="These requests create automation sessions on the backend. The browser automation layer can pick them up later."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-3">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                className={`text-left ${softCardClass} transition hover:border-white/20 hover:bg-white/10 ${
                  selectedPlatform.id === platform.id ? 'border-emerald-400/30 bg-emerald-400/10' : ''
                }`}
                onClick={() => setSelectedPlatformId(platform.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{platform.name}</span>
                      <StatusPill status={platform.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{platform.username}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{platform.notes || platform.automation}</p>
              </button>
            ))}
          </div>

          <div className={cardClass}>
            <SectionHeading
              eyebrow="Connection brief"
              title={`Setup ${selectedPlatform.name}`}
              description="Fill in the brand details, then either queue the session or request a connect run."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-200">Project</span>
                <select
                  className={selectClass}
                  value={selectedProject.id}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-200">Username</span>
                <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-200">Account URL</span>
                <input className={inputClass} value={accountUrl} onChange={(event) => setAccountUrl(event.target.value)} />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-200">Bio</span>
                <textarea className={textareaClass} value={bio} onChange={(event) => setBio(event.target.value)} />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-200">Profile image URL</span>
                <input
                  className={inputClass}
                  value={profileImageUrl}
                  onChange={(event) => setProfileImageUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-200">Setup notes</span>
                <textarea className={textareaClass} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className={primaryButton} onClick={() => void handleRequestConnection()} type="button">
                <UserRoundPlus className="h-4 w-4" />
                Request connect
              </button>
              <button className={secondaryButton} onClick={() => void handleQueueSession()} type="button">
                <CircleDashed className="h-4 w-4" />
                Queue session
              </button>
            </div>

            {sessionError && <p className="mt-4 text-sm text-rose-300">{sessionError}</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className={cardClass}>
          <SectionHeading eyebrow="Platform catalog" title="Backend-supported platforms" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {platforms.map((platform) => (
              <PlatformCard key={platform.id} platform={platform} selected={selectedPlatform.id === platform.id} />
            ))}
          </div>
        </article>

        <article className={cardClass}>
          <SectionHeading eyebrow="Session log" title="Recent automation requests" />
          {sessions.length === 0 ? (
            <EmptyState title="No sessions yet." description="Request or queue a setup to see the real backend response here." compact />
          ) : (
            <div className="mt-5 space-y-3">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

function TutorialView() {
  const demoProject = tutorialProjects[0]
  const demoCampaign = tutorialCampaigns[0]
  const demoAnalytics = tutorialAnalytics

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <SectionHeading
          eyebrow="Tutorial"
          title="Static demo dataset for onboarding"
          description="This is the only place the seeded sample data appears. Everything else is fed by the backend."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className={cardClass}>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Sample project</p>
            <h3 className="mt-3 font-display text-3xl tracking-tight text-white">{demoProject.name}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{demoProject.tagline}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniFact label="Status" value={demoProject.status} />
              <MiniFact label="Platforms" value={demoProject.platforms.join(', ')} />
              <MiniFact label="Updated" value={demoProject.lastUpdated} />
            </div>
          </div>

          <div className={cardClass}>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200/80">Sample analytics</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricTile label="Engagement" value={formatNumber(demoAnalytics.summary.engagement)} icon={ChartColumn} />
              <MetricTile label="CTR" value={`${demoAnalytics.summary.ctr}%`} icon={LineChart} />
            </div>
            <div className="mt-5">
              <TimelineChart points={demoAnalytics.timeline} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className={cardClass}>
          <SectionHeading eyebrow="Demo campaign" title={demoCampaign.name} />
          <div className="mt-5 space-y-3">
            <MiniFact label="Goal" value={demoCampaign.goal} />
            <MiniFact label="Audience" value={demoCampaign.audience} />
            <MiniFact label="Platforms" value={demoCampaign.platforms.join(', ')} />
          </div>
          <div className="mt-5 space-y-3">
            {demoCampaign.days.map((day) => (
              <div key={day.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Day {day.day}</span>
                  <span className="text-xs text-slate-300">{day.scheduledTime}</span>
                </div>
                <p className="mt-2 font-medium text-white">{day.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{day.content}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={cardClass}>
          <SectionHeading eyebrow="What this demonstrates" title="Tutorial purpose" />
          <div className="mt-5 grid gap-3">
            <InfoBanner
              icon={BadgeCheck}
              title="Clear separation"
              description="The demo dataset is isolated here so the production views stay tied to the backend."
            />
            <InfoBanner
              icon={Globe}
              title="Backend contract"
              description="Projects, campaigns, analytics, platform catalogs, and automation requests now come from live endpoints."
            />
            <InfoBanner
              icon={Rocket}
              title="Human approval"
              description="Automation assistance still keeps verification and CAPTCHA with the user, exactly as intended."
            />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sample platforms</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tutorialPlatforms.map((platform) => (
                <span
                  key={platform.id}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                >
                  {platform.name}
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

function SettingsView() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [themeMode, setThemeMode] = useState<'System' | 'Light' | 'Dark'>('System')
  const [defaultTone, setDefaultTone] = useState('Confident')

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <SectionHeading
          eyebrow="Settings"
          title="Workspace preferences"
          description="A few controls to round out the corporate shell. These can later wire into user-specific settings."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <SettingsCard title="Profile">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Name</span>
              <input className={inputClass} defaultValue="Avery Chen" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Email</span>
              <input className={inputClass} defaultValue="avery@virel.local" />
            </label>
          </SettingsCard>

          <SettingsCard title="Theme">
            <div className="grid grid-cols-3 gap-2">
              {(['System', 'Light', 'Dark'] as const).map((mode) => (
                <button
                  key={mode}
                  className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                    themeMode === mode
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                  onClick={() => setThemeMode(mode)}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard title="Notifications">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <input checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} type="checkbox" />
              <span className="text-sm text-slate-200">Email summaries and campaign alerts</span>
            </label>
          </SettingsCard>

          <SettingsCard title="AI tone">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Default campaign tone</span>
              <input className={inputClass} value={defaultTone} onChange={(event) => setDefaultTone(event.target.value)} />
            </label>
          </SettingsCard>

          <SettingsCard title="Status">
            <InfoBanner
              icon={ShieldCheck}
              title="Compliance first"
              description="Virel keeps launch assistance user-controlled and avoids bypassing verification flows."
            />
          </SettingsCard>

          <SettingsCard title="Danger zone">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15">
              <Trash2 className="h-4 w-4" />
              Archive workspace
            </button>
          </SettingsCard>
        </div>
      </section>
    </div>
  )
}

function ProjectEditorModal({
  initial,
  onCancel,
  onSave,
}: {
  initial?: Project
  onCancel: () => void
  onSave: (values: ProjectInput) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? initial?.tagline ?? '')
  const [targetAudience, setTargetAudience] = useState(initial?.targetAudience ?? '')
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'Planning')
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? '')
  const [demoUrl, setDemoUrl] = useState(initial?.demoUrl ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '')

  return (
    <Modal title={initial ? 'Edit project' : 'Create project'} onClose={onCancel}>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave({
            name,
            description,
            targetAudience,
            goal,
            status,
            repoUrl: repoUrl || null,
            demoUrl: demoUrl || null,
            logoUrl: logoUrl || null,
          })
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-200">Project name</span>
            <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-200">Description</span>
            <textarea className={textareaClass} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Target audience</span>
            <input className={inputClass} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Goal</span>
            <input className={inputClass} value={goal} onChange={(event) => setGoal(event.target.value)} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Status</span>
            <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-200">Repo URL</span>
            <input className={inputClass} value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-200">Demo URL</span>
            <input className={inputClass} value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-200">Logo URL</span>
            <input className={inputClass} value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
          </label>
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <button className={secondaryButton} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className={primaryButton} type="submit">
            Save project
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
      role="presentation"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_30px_100px_rgba(2,6,23,0.7)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Modal</p>
            <h3 className="mt-2 font-display text-2xl tracking-tight text-white">{title}</h3>
          </div>
          <button className={ghostButton} onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  onDelete,
  onEdit,
}: {
  project: Project
  onDelete: (id: string) => Promise<void>
  onEdit: (project: Project) => void
}) {
  return (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Project</p>
          <h3 className="mt-2 font-display text-2xl tracking-tight text-white">{project.name}</h3>
        </div>
        <StatusPill status={project.status} />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{project.description || project.tagline}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MiniFact label="Audience" value={project.targetAudience || 'Not set'} />
        <MiniFact label="Goal" value={project.goal || 'Not set'} />
      </div>

      <div className="mt-5 space-y-3">
        <ProgressMeter value={project.progress} />
        <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
          <span>Updated {formatDateString(project.updatedAt || project.lastUpdated)}</span>
          <span>{project.platforms.length ? project.platforms.join(', ') : 'Backend first'}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.repoUrl && (
          <a className={secondaryButton} href={project.repoUrl} rel="noreferrer" target="_blank">
            <ExternalLink className="h-4 w-4" />
            Repo
          </a>
        )}
        {project.demoUrl && (
          <a className={secondaryButton} href={project.demoUrl} rel="noreferrer" target="_blank">
            <Globe className="h-4 w-4" />
            Demo
          </a>
        )}
        <button className={ghostButton} onClick={() => onEdit(project)} type="button">
          <PencilLine className="h-4 w-4" />
          Edit
        </button>
        <button className={ghostButton} onClick={() => void onDelete(project.id)} type="button">
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  )
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Campaign</p>
          <h3 className="mt-2 font-display text-2xl tracking-tight text-white">{campaign.name}</h3>
        </div>
        <StatusPill status={campaign.status} />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{campaign.summary || campaign.audience || campaign.goal}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniFact label="Goal" value={campaign.goal} />
        <MiniFact label="Tone" value={campaign.tone || 'Confident'} />
        <MiniFact label="Platforms" value={campaign.platforms.join(', ')} />
      </div>
    </article>
  )
}

function PlatformCard({ platform, selected }: { platform: Platform; selected?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        selected ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-white">{platform.name}</span>
        <StatusPill status={platform.status} />
      </div>
      <p className="mt-2 text-sm text-slate-300">{platform.username}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{platform.notes || platform.automation}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4 text-emerald-300" />
        {platform.phoneRequired ? 'Phone may be required' : 'Email-friendly'}
      </div>
    </div>
  )
}

function SessionCard({ session }: { session: AutomationSession }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{session.platform}</p>
          <p className="mt-2 font-medium text-white">{session.step}</p>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
          {session.status}
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          style={{ width: `${Math.min(Math.max(session.progress, 0), 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-400">Project {session.projectId}</p>
    </div>
  )
}

function PlatformChooser({
  selected,
  onToggle,
}: {
  selected: PlatformName[]
  onToggle: (platform: PlatformName) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {platformNames.map((platform) => {
        const active = selected.includes(platform)
        return (
          <button
            key={platform}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
              active
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            onClick={() => onToggle(platform)}
            type="button"
          >
            {platform}
          </button>
        )
      })}
    </div>
  )
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={softCardClass}>
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{title}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function InfoBanner({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-white">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
          <p className="mt-3 font-display text-3xl tracking-tight text-white">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  )
}

function ProgressMeter({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
        <span>Launch progress</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(status)}`}>{status}</span>
}

function TimelineChart({ points }: { points: Analytics['timeline'] }) {
  const max = Math.max(...points.map((point) => point.engagement), 1)

  return (
    <div className="space-y-4">
      {points.map((point) => (
        <div key={point.label} className="grid grid-cols-[48px_minmax(0,1fr)_64px] items-center gap-3">
          <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{point.label}</span>
          <div className="h-3 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              style={{ width: `${(point.engagement / max) * 100}%` }}
            />
          </div>
          <span className="text-right text-sm font-medium text-white">{formatNumber(point.engagement)}</span>
        </div>
      ))}
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-5">
      {[1, 2, 3].map((index) => (
        <div key={index} className="animate-pulse rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="h-4 w-28 rounded-full bg-white/10" />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string
  description?: string
  compact?: boolean
}) {
  return (
    <div className={`rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] ${compact ? 'p-5' : 'p-8'}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <Ghost className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-display text-2xl tracking-tight text-white">{title}</h3>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
        </div>
      </div>
    </div>
  )
}

function ErrorState({
  title,
  message,
  retry,
}: {
  title: string
  message: string
  retry: () => void
}) {
  return (
    <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-rose-200/80">Error</p>
      <h3 className="mt-3 font-display text-2xl tracking-tight text-white">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-100/80">{message}</p>
      <button className={`${primaryButton} mt-5 bg-white text-slate-950 hover:bg-slate-100`} onClick={retry} type="button">
        Retry
      </button>
    </div>
  )
}

function statusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('connected') || normalized.includes('live') || normalized.includes('launched')) {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  }
  if (normalized.includes('paused') || normalized.includes('pending') || normalized.includes('scheduled')) {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  }
  if (normalized.includes('verification') || normalized.includes('error')) {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-200'
  }
  return 'border-white/10 bg-white/5 text-slate-200'
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatDateString(value?: string) {
  if (!value) return 'Today'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export default App
