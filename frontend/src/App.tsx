import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  CircleDashed,
  ExternalLink,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LineChart,
  Network,
  PencilLine,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Upload,
  WandSparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { platformNames } from './constants/platforms'
import { useAsync } from './hooks/useAsync'
import { getAnalytics } from './services/analytics'
import { connectAutomation, createAutomationSession, getAutomationSessions, getPlatforms } from './services/automation'
import { generateCampaign, getCampaigns, type GenerateCampaignInput } from './services/campaigns'
import { uploadImage } from './services/media'
import { createProject, deleteProject, getProjects, updateProject, type ProjectInput } from './services/projects'
import type {
  AutomationSession,
  Campaign,
  PlatformName,
  Project,
  ProjectStatus,
} from './types'

type View = 'Dashboard' | 'Projects' | 'Campaigns' | 'Analytics' | 'Automation' | 'Settings'

type NavItem = {
  view: View
  number: string
  title: string
  description: string
  color: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  {
    view: 'Dashboard',
    number: '01',
    title: 'Reef Overview',
    description: 'Current',
    color: 'bg-[#d2e5ff]',
    icon: LayoutDashboard,
  },
  {
    view: 'Projects',
    number: '02',
    title: 'Project Reef',
    description: 'Nest',
    color: 'bg-[#fde2cf]',
    icon: FolderKanban,
  },
  {
    view: 'Campaigns',
    number: '03',
    title: 'Campaign Tide',
    description: 'Flow',
    color: 'bg-[#f7d9ea]',
    icon: WandSparkles,
  },
  {
    view: 'Analytics',
    number: '04',
    title: 'Analytics Current',
    description: 'Signals',
    color: 'bg-[#d9f1e5]',
    icon: LineChart,
  },
  {
    view: 'Automation',
    number: '05',
    title: 'Automation Dock',
    description: 'Links',
    color: 'bg-[#e4dbff]',
    icon: Network,
  },
  {
    view: 'Settings',
    number: '06',
    title: 'Harbor Settings',
    description: 'Identity',
    color: 'bg-[#efe5d7]',
    icon: Settings2,
  },
]

const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['Planning', 'Active', 'Paused', 'Launched']
const TONE_OPTIONS = ['Confident', 'Warm', 'Strategic', 'Bold']

const paperCard =
  'rounded-[32px] border-[2px] border-[#2c211b] bg-[var(--paper-2)] shadow-[10px_10px_24px_rgba(45,33,26,0.08)]'
const insetCard =
  'rounded-[26px] border-[2px] border-[#2c211b] bg-[rgba(255,252,248,0.9)] shadow-[8px_8px_18px_rgba(45,33,26,0.06)]'
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:translate-y-[1px]'

function App() {
  const [view, setView] = useState<View>('Dashboard')

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-[1680px] lg:grid-cols-[270px_minmax(0,1fr)]">
        <Sidebar view={view} onChange={setView} />
        <main className="relative isolate overflow-hidden">
          <BackgroundBlobs />
          <div className="relative z-10 px-4 pb-12 pt-5 sm:px-6 lg:px-10">
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
    <aside className="sticky top-0 flex h-screen flex-col gap-5 border-b-[2px] border-[#2c211b] bg-[#f6efe6] px-4 py-4 lg:border-b-0 lg:border-r-[2px] lg:px-4 lg:py-5">
      <div className="rounded-[28px] border-[2px] border-[#2c211b] bg-[rgba(255,252,248,0.96)] px-4 py-4 shadow-[8px_8px_18px_rgba(45,33,26,0.06)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#b97fd6]">virel</p>
            <h1 className="font-display mt-2 text-3xl font-black tracking-tight text-[#1f1814]">Studio</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.28em] text-[#6b625a]">creative workspace</p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full border-[2px] border-[#2c211b] bg-[#d2e5ff] text-xl font-black text-[#1f1814] shadow-[4px_4px_0_rgba(45,33,26,0.06)]">
            V
          </div>
        </div>
      </div>

      <nav className="grid gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.view === view
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onChange(item.view)}
              className={`group relative overflow-hidden rounded-[24px] border-[2px] border-[#2c211b] px-4 py-4 text-left transition hover:-translate-y-0.5 ${
                active ? 'shadow-[8px_8px_18px_rgba(45,33,26,0.08)]' : 'shadow-[4px_4px_12px_rgba(45,33,26,0.04)]'
              } ${item.color} text-[#1f1814]`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-black uppercase tracking-[0.28em] opacity-90">{item.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]">
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </span>
                  <span className="mt-2 block text-xs font-medium text-[#4e4239]">{item.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </div>
              <span
                className={`absolute inset-x-4 bottom-3 h-[2px] rounded-full bg-[#1f1814]/20 transition ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
              />
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[#f5c8d8]/45 blur-3xl" />
      <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-[#bcd7ff]/40 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#d9f2e4]/45 blur-3xl" />
    </div>
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

  if (loading) return <LoadingGrid />

  if (error) {
    const retry = projectsState.error ? projectsState.retry : campaignsState.error ? campaignsState.retry : analyticsState.error ? analyticsState.retry : platformsState.retry
    return <ErrorState title="The launch board could not load." message={error} retry={retry} />
  }

  if (!analytics) {
    return <EmptyState title="No content yet." description="Create a project and generate a campaign to see the workspace come alive." />
  }

  const latestProject = projects[0]
  const latestCampaign = campaigns[0]
  const topPlatform = analytics.platforms[0]

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
      <section className={`${paperCard} relative overflow-hidden p-6 sm:p-8`}>
        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[32px] border-l-[2px] border-b-[2px] border-[#2c211b] bg-[#fde2cf]" />
        <p className="inline-flex rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.28em] shadow-[6px_6px_18px_rgba(45,33,26,0.06)]">
          Workspace overview
        </p>
        <h2 className="font-display mt-6 max-w-2xl text-4xl font-black tracking-tight text-[#1f1814] sm:text-5xl">
          Main features in one workspace.
        </h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {['Projects', 'Campaigns', 'Analytics', 'Automation', 'Settings'].map((item) => (
            <span
              key={item}
              className="rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#1f1814] shadow-[4px_4px_12px_rgba(45,33,26,0.04)]"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className={`${buttonBase} bg-[#d2e5ff] text-[#1f1814] shadow-[6px_6px_18px_rgba(45,33,26,0.08)] hover:brightness-95`} onClick={() => onNavigate('Projects')} type="button">
            Start project
            <ArrowRight className="h-4 w-4" />
          </button>
          <button className={`${buttonBase} border-[2px] border-[#2c211b] bg-[#f7d9ea] text-[#1f1814] shadow-[6px_6px_18px_rgba(45,33,26,0.06)] hover:brightness-95`} onClick={() => onNavigate('Automation')} type="button">
            Open setup
          </button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <StatPill label="Projects" value={projects.length.toString()} color="bg-[#d2e5ff]" />
          <StatPill label="Campaigns" value={campaigns.length.toString()} color="bg-[#fde2cf]" />
        </div>
      </section>

      <MascotPlaceholder />

      <section className="xl:col-span-2 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <article className={`${paperCard} max-h-[430px] overflow-hidden p-6 sm:p-7`}>
          <SectionHeader
            eyebrow="Launch ribbon"
            title="What the studio sees right now"
            action={
              <DashboardAction onClick={() => onNavigate('Analytics')} tone="blue">
                See more
                <ArrowRight className="h-4 w-4" />
              </DashboardAction>
            }
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <DataCard
              label="Best platform"
              value={topPlatform?.platform ?? 'N/A'}
              detail={
                topPlatform
                  ? `${formatNumber(topPlatform.likes)} likes · ${formatNumber(topPlatform.comments)} comments`
                  : 'No analytics yet'
              }
            />
            <DataCard
              label="Latest project"
              value={latestProject?.name ?? 'None'}
              detail={latestProject?.description || latestProject?.tagline || 'Create one to begin.'}
            />
            <DataCard
              label="Latest campaign"
              value={latestCampaign?.name ?? 'None'}
              detail={latestCampaign?.summary || latestCampaign?.goal || 'Generate one to begin.'}
            />
          </div>
        </article>

        <article className={`${paperCard} p-6 sm:p-7`}>
          <SectionHeader eyebrow="Platform cloud" title="Supported platforms" />
          <div className="mt-6 flex flex-wrap gap-2">
            {platforms.length > 0 ? (
              platforms.map((platform) => (
                <span
                  key={platform.id}
                  className="rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-2 text-xs font-black shadow-[4px_4px_12px_rgba(45,33,26,0.04)]"
                >
                  {platform.name}
                </span>
              ))
            ) : (
              <EmptyState compact title="No supported platforms yet." description="Connected platforms will appear here when available." />
            )}
          </div>
        </article>
      </section>
    </div>
    </div>
  )
}

function MascotPlaceholder() {
  return (
    <section className={`${paperCard} relative min-h-[620px] overflow-hidden p-5 sm:p-6`}>
      <div className="absolute left-5 right-5 top-5 h-3 rounded-full bg-[#b9d6ff] shadow-[0_0_0_2px_rgba(44,33,27,0.08)]" />
      <div className="absolute left-5 right-5 top-12 h-[2px] rounded-full bg-[#2c211b]/12" />

      <div className="absolute left-6 top-6 rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.28em] shadow-[6px_6px_18px_rgba(45,33,26,0.06)]">
        Mascot video
      </div>

      <div className="absolute inset-x-10 top-[88px] bottom-[72px] rounded-[38px] border-[2px] border-dashed border-[#2c211b]/35 bg-white/55 shadow-[0_0_0_1px_rgba(255,255,255,0.6),inset_0_0_80px_rgba(255,255,255,0.35)] backdrop-blur-[2px]">
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border-[2px] border-[#2c211b] bg-white text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
            ▶
          </div>
          <p className="font-display mt-5 text-2xl font-black tracking-tight text-[#1f1814]">
            Mascot video placeholder
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#5f554a]">
            Drop your mascot video here later.
          </p>
        </div>
      </div>
    </section>
  )
}

function DashboardAction({
  children,
  onClick,
  tone = 'dark',
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'dark' | 'coral' | 'blue'
}) {
  const classes =
    tone === 'dark'
      ? 'bg-[#2c211b] text-[#fffaf4] hover:bg-[#3a2d24]'
      : tone === 'coral'
        ? 'bg-[#f7d9ea] text-[#1f1814] hover:brightness-95'
        : 'bg-[#d2e5ff] text-[#1f1814] hover:brightness-95'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${buttonBase} border-[2px] border-[#2c211b] shadow-[6px_6px_16px_rgba(45,33,26,0.06)] ${classes}`}
    >
      {children}
    </button>
  )
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className={`rounded-[28px] border-[2px] border-[#2c211b] p-5 text-[#1f1814] shadow-[8px_8px_18px_rgba(45,33,26,0.06)] ${color}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#5f554a]">{label}</p>
      <p className="font-display mt-4 text-4xl font-black tracking-tight">{value}</p>
    </div>
  )
}

function SectionHeader({
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#7ea8ff]">{eyebrow}</p>
        <h2 className="font-display mt-2 text-3xl font-black tracking-tight text-[#1f1814]">{title}</h2>
        {description && <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f554a]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function DataCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[28px] border-[2px] border-[#2c211b] bg-white p-5 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b97fd6]">{label}</p>
      <p className="font-display mt-3 text-2xl font-black tracking-tight text-[#1f1814]">{value}</p>
      <p
        className="mt-3 text-sm leading-6 text-[#5f554a]"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 4,
          overflow: 'hidden',
        }}
      >
        {detail}
      </p>
    </div>
  )
}

function ProjectsView() {
  const projectsState = useAsync(getProjects)
  const campaignsState = useAsync(getCampaigns)
  const automationSessionsState = useAsync(getAutomationSessions)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'All'>('All')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const projects = projectsState.data ?? []
  const campaigns = campaignsState.data ?? []
  const automationSessions = automationSessionsState.data ?? []
  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const haystack = [project.name, project.description, project.tagline, project.targetAudience, project.goal]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query.toLowerCase()) && (status === 'All' || project.status === status)
      }),
    [projects, query, status],
  )
  const projectProgress = (project: Project) => calculateLaunchProgress(project, campaigns, automationSessions)

  async function handleSave(input: ProjectInput) {
    setActionError(null)
    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, input)
        projectsState.setData(projects.map((project) => (project.id === updated.id ? updated : project)))
        setEditingProject(null)
      } else {
        const created = await createProject(input)
        projectsState.setData([created, ...projects])
        setIsCreating(false)
      }
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

  if (projectsState.isLoading || campaignsState.isLoading || automationSessionsState.isLoading) return <LoadingGrid />
  const error = projectsState.error || campaignsState.error || automationSessionsState.error
  if (error) {
    const retry = projectsState.error ? projectsState.retry : campaignsState.error ? campaignsState.retry : automationSessionsState.retry
    return <ErrorState title="Projects could not load." message={error} retry={retry} />
  }

  return (
    <div className="space-y-6">
      <section className={`${paperCard} p-6 sm:p-7`}>
        <SectionHeader
          eyebrow="Projects"
          title="Project hub"
          description="Each project gets its own branded identity card with the details you need at a glance."
          action={<DashboardAction onClick={() => setIsCreating(true)} tone="coral"> <Plus className="h-4 w-4" /> New project</DashboardAction>}
        />
        <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.6fr]">
          <label className="block">
            <span className="sr-only">Search projects</span>
            <div className="flex items-center gap-3 rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-3 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
              <Search className="h-4 w-4 text-[#b97fd6]" />
              <input
                className="w-full bg-transparent text-sm font-medium text-[#1f1814] outline-none placeholder:text-[#8b8177]"
                placeholder="Search by name, goal, or audience"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>
          <select
            className="rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-3 text-sm font-black text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.04)] outline-none"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectStatus | 'All')}
          >
            <option>All</option>
            {PROJECT_STATUS_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        {actionError && <p className="mt-4 text-sm font-medium text-[#b97fd6]">{actionError}</p>}
      </section>

      {filtered.length === 0 ? (
        <EmptyState title="No projects match the filters." description="Create a project or clear the search to continue." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filtered.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              accent={NAV_ITEMS[index % NAV_ITEMS.length].color}
              progress={projectProgress(project)}
              onDelete={handleDelete}
              onEdit={setEditingProject}
            />
          ))}
        </div>
      )}

      {(isCreating || editingProject) && (
        <ProjectModal
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

function ProjectCard({
  project,
  accent,
  progress,
  onDelete,
  onEdit,
}: {
  project: Project
  accent: string
  progress: number
  onDelete: (id: string) => Promise<void>
  onEdit: (project: Project) => void
}) {
  return (
    <article className={`${paperCard} overflow-hidden`}>
      <div className={`h-4 ${accent}`} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b97fd6]">Project</p>
            <h3 className="font-display mt-2 text-3xl font-black tracking-tight text-[#1f1814]">{project.name}</h3>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5f554a]">{project.description || project.tagline}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <MiniStat label="Audience" value={project.targetAudience || 'Not set'} />
          <MiniStat label="Goal" value={project.goal || 'Not set'} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <ProgressBar value={progress} />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6b625a]">
            Updated {formatDate(project.updatedAt || project.lastUpdated)}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {project.repoUrl && (
            <a className={secondaryLink} href={project.repoUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Repo
            </a>
          )}
          {project.demoUrl && (
            <a className={secondaryLink} href={project.demoUrl} target="_blank" rel="noreferrer">
              <Globe2 className="h-4 w-4" />
              Demo
            </a>
          )}
          <button className={secondaryLink} type="button" onClick={() => onEdit(project)}>
            <PencilLine className="h-4 w-4" />
            Edit
          </button>
          <button className={secondaryLink} type="button" onClick={() => void onDelete(project.id)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </article>
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
  const previewCampaign = generatedCampaign ?? campaigns[0]

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

  if (projectsState.isLoading || campaignsState.isLoading) return <LoadingGrid />
  if (projectsState.error) return <ErrorState title="Projects are required before campaigns." message={projectsState.error} retry={projectsState.retry} />
  if (campaignsState.error) return <ErrorState title="Campaigns could not load." message={campaignsState.error} retry={campaignsState.retry} />
  if (!selectedProject) {
    return <EmptyState title="Create a project first" description="Campaign generation needs a project record to anchor to." />
  }

  return (
    <div className="space-y-6">
      <section className={`${paperCard} p-6 sm:p-7`}>
        <SectionHeader
          eyebrow="Campaigns"
          title="Campaigns"
          description="Pick a project, set the tone, and shape the 7-day plan."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className={`${insetCard} p-5`}>
            <div className="grid gap-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.28em] text-[#b97fd6]">Project</span>
                <select
                  className="mt-2 w-full rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-3 text-sm font-black text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.04)] outline-none"
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
                <span className="text-xs font-black uppercase tracking-[0.28em] text-[#b97fd6]">Title</span>
                <input className={inputField} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedProject.name} launch sprint`} />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.28em] text-[#b97fd6]">Goal</span>
                <input className={inputField} value={goal} onChange={(event) => setGoal(event.target.value)} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.28em] text-[#b97fd6]">Tone</span>
                  <select className={inputField} value={tone} onChange={(event) => setTone(event.target.value)}>
                    {TONE_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <div className="rounded-[26px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b97fd6]">Platforms</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f554a]">Choose the channels you want to include in the plan.</p>
                </div>
              </div>

              <PlatformChooser selected={platforms} onToggle={togglePlatform} />

                <button className={`${buttonBase} border-[2px] border-[#2c211b] bg-[#2c211b] text-[#fffaf4] shadow-[6px_6px_16px_rgba(45,33,26,0.06)] hover:bg-[#3a2d24]`} onClick={() => void handleGenerate()} type="button">
                <Sparkles className="h-4 w-4" />
                Generate campaign
              </button>

              {actionError && <p className="text-sm font-medium text-[#b97fd6]">{actionError}</p>}
            </div>
          </div>

          <div className={`${paperCard} p-5`}>
            <SectionHeader eyebrow="Preview" title="Campaign reel" />
            {previewCampaign ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-3xl font-black tracking-tight text-[#1f1814]">{previewCampaign.name}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#51463f]">
                      {previewCampaign.summary || previewCampaign.audience || previewCampaign.goal}
                    </p>
                  </div>
                  <StatusBadge status={previewCampaign.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Project" value={selectedProject.name} />
                  <MiniStat label="Platforms" value={previewCampaign.platforms.join(', ') || 'Not set'} />
                  <MiniStat label="Tone" value={previewCampaign.tone || tone} />
                </div>

                <div className="grid gap-3">
                  {previewCampaign.days.slice(0, 4).map((day) => (
                    <div key={day.id} className="rounded-[24px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">Day {day.day}</p>
                        <span className="rounded-full border-[2px] border-[#2c211b] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em]">
                          {day.status}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-black text-[#1f1814]">{day.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5f554a]">{day.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No campaign yet." description="Generate one to see the plan expand." compact />
            )}
          </div>
        </div>
      </section>

      <section className={`${paperCard} p-6 sm:p-7`}>
        <SectionHeader eyebrow="Campaign history" title="Recent launch routes" />
        {campaigns.length === 0 ? (
          <EmptyState title="No campaigns yet." description="Generate the first campaign to populate this shelf." compact />
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-[28px] border-[2px] border-[#2c211b] bg-white p-5 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">Campaign</p>
                    <h3 className="font-display mt-2 text-2xl font-black tracking-tight text-[#1f1814]">{campaign.name}</h3>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5f554a]">{campaign.summary || campaign.audience || campaign.goal}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Goal" value={campaign.goal} />
                  <MiniStat label="Tone" value={campaign.tone || 'Confident'} />
                  <MiniStat label="Platforms" value={campaign.platforms.join(', ')} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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
            type="button"
            onClick={() => onToggle(platform)}
            className={`rounded-[22px] border-[2px] border-[#2c211b] px-4 py-3 text-left text-sm font-black uppercase tracking-[0.12em] shadow-[4px_4px_12px_rgba(45,33,26,0.04)] transition hover:-translate-y-0.5 ${
              active ? 'bg-[#d9f1e5] text-[#1f1814]' : 'bg-white text-[#1f1814]'
            }`}
          >
            {platform}
          </button>
        )
      })}
    </div>
  )
}

function AnalyticsView() {
  const analyticsState = useAsync(getAnalytics)
  const analytics = analyticsState.data
  const loading = analyticsState.isLoading
  const error = analyticsState.error

  if (loading) return <LoadingGrid />
  if (error) {
    return <ErrorState title="Analytics could not load." message={error} retry={analyticsState.retry} />
  }
  if (!analytics) return <EmptyState title="No analytics available yet." description="Generate a campaign and the report cards will fill in." />

  const topPosts = analytics.topPosts.slice(0, 4)

  return (
    <div className="space-y-6">
      <section className={`${paperCard} p-6 sm:p-7`}>
        <SectionHeader
          eyebrow="Analytics"
          title="Analytics"
          description="Live platform stats, timeline performance, and the strongest posts in one place."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Projects" value={analytics.summary.totalProjects.toString()} icon={FolderKanban} tone="blue" />
          <MetricTile label="Campaigns" value={analytics.summary.activeCampaigns.toString()} icon={Sparkles} tone="yellow" />
          <MetricTile label="Engagement" value={formatNumber(analytics.summary.engagement)} icon={BarChart3} tone="green" />
          <MetricTile label="CTR" value={`${analytics.summary.ctr}%`} icon={LineChart} tone="purple" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <article className={`${paperCard} p-6 sm:p-7`}>
          <SectionHeader eyebrow="Timeline" title="Engagement over time" />
          <div className="mt-5 space-y-4">
            {analytics.timeline.map((point) => (
              <div key={point.label} className="grid grid-cols-[56px_minmax(0,1fr)_72px] items-center gap-3">
                <span className="text-xs font-black uppercase tracking-[0.28em] text-[#6b625a]">{point.label}</span>
                <div className="h-4 rounded-full border-[2px] border-[#2c211b] bg-white">
                  <div className="h-full rounded-full bg-[#f7d9ea]" style={{ width: `${Math.min((point.engagement / Math.max(analytics.summary.engagement, 1)) * 100, 100)}%` }} />
                </div>
                <span className="text-right text-sm font-black text-[#1f1814]">{formatNumber(point.engagement)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={`${paperCard} p-6 sm:p-7`}>
          <SectionHeader eyebrow="Platform mix" title="Best platform" />
          <div className="mt-5 space-y-4">
            {analytics.platforms.map((platform) => (
              <div key={platform.platform} className="rounded-[26px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-black text-[#1f1814]">{platform.platform}</span>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-[#6b625a]">{platform.posts} posts</p>
                  </div>
                  <span className="rounded-full border-[2px] border-[#2c211b] bg-[#d9f1e5] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#1f1814]">
                    {formatNumber(platform.engagement)} engagement
                  </span>
                </div>
                <div className="mt-3 grid gap-3 text-sm text-[#5f554a] sm:grid-cols-2">
                  <p>{formatNumber(platform.likes)} likes</p>
                  <p>{formatNumber(platform.comments)} comments</p>
                  <p>{formatNumber(platform.shares)} shares</p>
                  <p>{formatNumber(platform.clicks)} clicks</p>
                </div>
              </div>
            ))}
            {analytics.platforms.length === 0 && <EmptyState title="No platform breakdown yet." description="More detail will appear as campaigns accumulate." compact />}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className={`${paperCard} p-6 sm:p-7`}>
          <SectionHeader eyebrow="Summary" title="Quick stats" />
          <div className="mt-5 grid gap-3">
            <MiniStat label="Best channel" value={analytics.platforms[0]?.platform ?? 'N/A'} />
            <MiniStat label="Projects tracked" value={analytics.summary.totalProjects.toString()} />
            <MiniStat label="Campaigns tracked" value={analytics.summary.activeCampaigns.toString()} />
          </div>
        </article>

        <article className={`${paperCard} p-6 sm:p-7`}>
          <SectionHeader eyebrow="Recent posts" title="Generated content" />
            {topPosts.length === 0 ? (
              <EmptyState title="No posts yet." description="Create a campaign to see posts fill this area." compact />
            ) : (
              <div className="mt-5 grid gap-3">
                {topPosts.map((post) => (
                  <div key={post.id} className="rounded-[26px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-[#1f1814]">{post.title}</span>
                      <span className="rounded-full border-[2px] border-[#2c211b] bg-[#fff0bc] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                        {post.platform}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5f554a]">
                      {formatNumber(post.likes)} likes · {formatNumber(post.comments)} comments · {formatNumber(post.clicks)} clicks
                    </p>
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
  const [username, setUsername] = useState('@virel')
  const [bio, setBio] = useState('Build and launch student projects faster.')
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

  if (platformsState.isLoading || projectsState.isLoading) return <LoadingGrid />
  if (platformsState.error) return <ErrorState title="Automation catalog could not load." message={platformsState.error} retry={platformsState.retry} />
  if (projectsState.error) return <ErrorState title="Projects are required for automation." message={projectsState.error} retry={projectsState.retry} />
  if (!selectedPlatform || !selectedProject) return <EmptyState title="Create a project first" description="Automation sessions need a project and a supported platform." />

  return (
    <div className="space-y-6">
      <section className={`${paperCard} p-6 sm:p-7`}>
        <SectionHeader
          eyebrow="Automation"
          title="Automation"
          description="Create connection sessions for branded account setup. The user still approves every verification step."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3">
            {platforms.map((platform, index) => (
              <button
                key={platform.id}
                type="button"
                onClick={() => setSelectedPlatformId(platform.id)}
                className={`rounded-[26px] border-[2px] border-[#2c211b] px-4 py-4 text-left shadow-[6px_6px_16px_rgba(45,33,26,0.05)] transition hover:-translate-y-0.5 ${
                  selectedPlatform.id === platform.id ? NAV_ITEMS[index % NAV_ITEMS.length].color + ' text-[#1f1814]' : 'bg-white text-[#1f1814]'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words font-black leading-tight">{platform.name}</span>
                      <StatusBadge status={platform.status} />
                    </div>
                    <p className="mt-2 text-sm text-current/80">{platform.username}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm leading-6 text-current/70">{platform.notes || platform.automation}</p>
              </button>
            ))}
          </div>

          <div className={`${insetCard} p-5`}>
            <SectionHeader eyebrow="Connection brief" title={`Setup ${selectedPlatform.name}`} description="Enter the brand details once, then queue or request the live connect flow." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Project to connect" description="Choose the project this account setup belongs to." className="sm:col-span-2">
                <select className={inputField} value={selectedProject.id} onChange={(event) => setSelectedProjectId(event.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Account username" description="Example: @studysnapai">
                <input className={inputField} value={username} onChange={(event) => setUsername(event.target.value)} />
              </Field>
              <Field label="Account URL" description="Paste the profile URL if the account already exists.">
                <input className={inputField} value={accountUrl} onChange={(event) => setAccountUrl(event.target.value)} />
              </Field>
              <Field label="Profile bio" description="Short account bio shown on the profile page." className="sm:col-span-2">
                <textarea className={textareaField} value={bio} onChange={(event) => setBio(event.target.value)} />
              </Field>
              <Field label="Profile image URL" description="Paste a hosted image URL for the profile photo." className="sm:col-span-2">
                <input className={inputField} value={profileImageUrl} onChange={(event) => setProfileImageUrl(event.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Verification notes" description="Add anything the user should confirm manually during setup." className="sm:col-span-2">
                <textarea className={textareaField} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <DashboardAction onClick={() => void handleRequestConnection()} tone="blue">
                <UserRoundPlus className="h-4 w-4" />
                Request connect
              </DashboardAction>
              <DashboardAction onClick={() => void handleQueueSession()} tone="coral">
                <CircleDashed className="h-4 w-4" />
                Queue session
              </DashboardAction>
            </div>
            {sessionError && <p className="mt-4 text-sm font-medium text-[#b97fd6]">{sessionError}</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.03fr_0.97fr]">
        <article className={`${paperCard} p-6 sm:p-7`}>
          <SectionHeader eyebrow="Supported platforms" title="Supported platforms" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {platforms.map((platform) => (
              <div key={platform.id} className="rounded-[24px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-black leading-tight text-[#1f1814]">{platform.name}</span>
                  <StatusBadge status={platform.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5f554a]">{platform.notes || platform.automation}</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.26em] text-[#6b625a]">
                  {platform.phoneRequired ? 'Phone may be required' : 'Email-friendly'}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className={`${paperCard} p-6 sm:p-7`}>
          <SectionHeader eyebrow="Session log" title="Recent requests" />
          {sessions.length === 0 ? (
            <EmptyState title="No sessions yet." description="Request or queue a setup to see the session response here." compact />
          ) : (
            <div className="mt-5 space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-[24px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">{session.platform}</p>
                    <p className="mt-2 font-black text-[#1f1814]">{session.step}</p>
                  </div>
                    <StatusBadge status={session.status} />
                  </div>
                  <div className="mt-3 h-3 rounded-full border-[2px] border-[#2c211b] bg-white">
                    <div className="h-full rounded-full bg-[#d9f1e5]" style={{ width: `${Math.min(Math.max(session.progress, 0), 100)}%` }} />
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

function SettingsView() {
  const [companyName, setCompanyName] = useState('Virel')
  const [legalEntityName, setLegalEntityName] = useState('Virel Labs Pte. Ltd.')
  const [companyStartDate, setCompanyStartDate] = useState('2026-06-01')
  const [websiteUrl, setWebsiteUrl] = useState('https://virel.example.com')
  const [supportEmail, setSupportEmail] = useState('support@virel.example.com')
  const [phoneNumber, setPhoneNumber] = useState('+65 9123 4567')
  const [country, setCountry] = useState('Singapore')
  const [timezone, setTimezone] = useState('Asia/Singapore')
  const [displayName, setDisplayName] = useState('Virel')
  const [brandHandle, setBrandHandle] = useState('@virel')
  const [brandBio, setBrandBio] = useState('Launch student projects with polished branding and guided setup.')
  const [profileImageUrl, setProfileImageUrl] = useState('https://cdn.example.com/virel-avatar.png')
  const [backupEmail, setBackupEmail] = useState('ops@virel.example.com')
  const [googleAccountEmail, setGoogleAccountEmail] = useState('founders@virel.example.com')
  const [googleLinkStatus, setGoogleLinkStatus] = useState<'Not linked' | 'Pending' | 'Linked'>('Not linked')
  const [linkedinUrl, setLinkedinUrl] = useState('https://www.linkedin.com/company/virel')
  const [instagramHandle, setInstagramHandle] = useState('@virel')
  const [xHandle, setXHandle] = useState('@virel')
  const [tiktokHandle, setTiktokHandle] = useState('@virel')
  const [redditUsername, setRedditUsername] = useState('u/VirelHQ')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [defaultTone, setDefaultTone] = useState('Confident')
  const [themeMode, setThemeMode] = useState<'System' | 'Light' | 'Dark'>('System')

  const requiredCount = [
    companyName,
    legalEntityName,
    companyStartDate,
    websiteUrl,
    supportEmail,
    phoneNumber,
    country,
    timezone,
    displayName,
    brandHandle,
    brandBio,
    profileImageUrl,
    backupEmail,
    googleAccountEmail,
    linkedinUrl,
    instagramHandle,
    xHandle,
    tiktokHandle,
    redditUsername,
  ].filter(Boolean).length

  function startGoogleLink() {
    setGoogleLinkStatus('Pending')
    window.open('https://accounts.google.com/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <section className={`${paperCard} p-6 sm:p-7`}>
        <SectionHeader
          eyebrow="Settings"
          title="Identity studio"
          description="Store the business and identity details needed to create and verify official social accounts."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <SettingsCard title="Business profile">
            <Field label="Company name" description="The public brand name shown on profiles and pages.">
              <input className={inputField} value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </Field>
            <Field label="Legal entity name" description="The registered company name used for verification.">
              <input className={inputField} value={legalEntityName} onChange={(event) => setLegalEntityName(event.target.value)} />
            </Field>
            <Field label="Company start date" description="The date the business or project officially started.">
              <input className={inputField} type="date" value={companyStartDate} onChange={(event) => setCompanyStartDate(event.target.value)} />
            </Field>
            <Field label="Website" description="Your main public website or landing page URL.">
              <input className={inputField} value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} />
            </Field>
            <Field label="Support email" description="Use the inbox you want platform teams to contact.">
              <input className={inputField} value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} />
            </Field>
            <Field label="Phone number" description="The number used for verification or recovery.">
              <input className={inputField} value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" description="Where the business is based.">
                <input className={inputField} value={country} onChange={(event) => setCountry(event.target.value)} />
              </Field>
              <Field label="Timezone" description="Use the timezone where the team operates.">
                <input className={inputField} value={timezone} onChange={(event) => setTimezone(event.target.value)} />
              </Field>
            </div>
          </SettingsCard>

          <SettingsCard title="Brand identity">
            <Field label="Display name" description="How the account name appears publicly.">
              <input className={inputField} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Field>
            <Field label="Primary handle" description="The default username you want to secure.">
              <input className={inputField} value={brandHandle} onChange={(event) => setBrandHandle(event.target.value)} />
            </Field>
            <Field label="Brand bio" description="A short summary of the project or company.">
              <textarea className={textareaField} value={brandBio} onChange={(event) => setBrandBio(event.target.value)} />
            </Field>
            <Field label="Profile image URL" description="Hosted image link for the account avatar.">
              <input className={inputField} value={profileImageUrl} onChange={(event) => setProfileImageUrl(event.target.value)} />
            </Field>
            <Field label="Backup email" description="A recovery inbox if the primary account is locked.">
              <input className={inputField} value={backupEmail} onChange={(event) => setBackupEmail(event.target.value)} />
            </Field>
            <Field label="Default campaign tone" description="The default voice used for generated content.">
              <input className={inputField} value={defaultTone} onChange={(event) => setDefaultTone(event.target.value)} />
            </Field>
            <label className="flex items-center gap-3 rounded-[24px] border-[2px] border-[#2c211b] bg-white px-4 py-3 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
              <input checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} type="checkbox" />
              <span className="text-sm font-medium text-[#5f554a]">Email campaign and verification alerts</span>
            </label>
          </SettingsCard>

          <SettingsCard title="Google connection">
            <Field label="Google account email" description="The Google account used to link and sign in.">
              <input className={inputField} value={googleAccountEmail} onChange={(event) => setGoogleAccountEmail(event.target.value)} />
            </Field>
            <div className="rounded-[26px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">Status</p>
              <p className="mt-2 text-sm font-black text-[#1f1814]">{googleLinkStatus}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f554a]">
                Opens Google sign-in in a new tab so the user stays in control of the linking step.
              </p>
            </div>
            <DashboardAction onClick={startGoogleLink} tone="blue">
              <ExternalLink className="h-4 w-4" />
              Link Google account
            </DashboardAction>
            <button className={secondaryLink} type="button" onClick={() => setGoogleLinkStatus('Not linked')}>
              Reset Google status
            </button>
          </SettingsCard>

          <SettingsCard title="Platform handles">
            <Field label="Instagram handle" description="Example: @virel">
              <input className={inputField} value={instagramHandle} onChange={(event) => setInstagramHandle(event.target.value)} />
            </Field>
            <Field label="X handle" description="Example: @virel">
              <input className={inputField} value={xHandle} onChange={(event) => setXHandle(event.target.value)} />
            </Field>
            <Field label="TikTok handle" description="Example: @virel">
              <input className={inputField} value={tiktokHandle} onChange={(event) => setTiktokHandle(event.target.value)} />
            </Field>
            <Field label="LinkedIn URL" description="The company page link used for verification or references.">
              <input className={inputField} value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} />
            </Field>
            <Field label="Reddit username" description="Example: u/VirelHQ">
              <input className={inputField} value={redditUsername} onChange={(event) => setRedditUsername(event.target.value)} />
            </Field>
          </SettingsCard>

          <SettingsCard title="Readiness">
            <div className="rounded-[26px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">Required fields</p>
              <p className="font-display mt-3 text-5xl font-black text-[#1f1814]">{requiredCount}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f554a]">Core identity fields filled for account setup.</p>
            </div>
            <InfoBanner icon={ShieldCheck} title="Compliance first" description="Keep verification, CAPTCHA, and account approval with the user." />
            <InfoBanner icon={BadgeCheck} title="One official identity" description="Use these fields to keep the brand consistent across platforms." />
          </SettingsCard>

          <SettingsCard title="Theme">
            <div className="grid grid-cols-3 gap-2">
              {(['System', 'Light', 'Dark'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-[22px] border-[2px] border-[#2c211b] px-3 py-3 text-sm font-black uppercase tracking-[0.18em] shadow-[4px_4px_12px_rgba(45,33,26,0.04)] ${
                    themeMode === mode ? 'bg-[#d9f1e5] text-[#1f1814]' : 'bg-white text-[#1f1814]'
                  }`}
                  onClick={() => setThemeMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard title="Danger zone">
            <button className="rounded-full border-[2px] border-[#2c211b] bg-[#fde2cf] px-5 py-3 text-sm font-black text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
              Archive workspace
            </button>
          </SettingsCard>
        </div>
      </section>
    </div>
  )
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${insetCard} p-5`}>
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b97fd6]">{title}</p>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  children,
  className = '',
  description,
}: {
  label: string
  children: ReactNode
  className?: string
  description?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">{label}</span>
      {description && <span className="mt-1 block text-xs leading-5 text-[#6b625a]">{description}</span>}
      <div className="mt-2">{children}</div>
    </label>
  )
}

function ProjectModal({
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
          <Field label="Project name" description="The public name of the project." className="md:col-span-2">
            <input className={inputField} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Project description" description="What the project is and why people should care." className="md:col-span-2">
            <textarea className={textareaField} value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field label="Target audience" description="Who this is for. Example: students, founders, creators.">
            <input className={inputField} value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} />
          </Field>
          <Field label="Project goal" description="The main outcome you want this project to achieve.">
            <input className={inputField} value={goal} onChange={(event) => setGoal(event.target.value)} />
          </Field>
          <Field label="Project status" description="Current stage of the project, not the campaign.">
            <select className={inputField} value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Repo URL" description="Optional source code or workspace link." className="md:col-span-2">
            <input className={inputField} value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          </Field>
          <Field label="Demo URL" description="Optional live demo or preview link." className="md:col-span-2">
            <input className={inputField} value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} />
          </Field>
          <Field label="Logo URL" description="Optional project logo or brand asset URL." className="md:col-span-2">
            <input className={inputField} value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
          </Field>
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <button className={secondaryLink} type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="rounded-full border-[2px] border-[#2c211b] bg-[#2c211b] px-5 py-3 text-sm font-black text-[#fffaf4] shadow-[6px_6px_16px_rgba(45,33,26,0.06)]" type="submit">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c211b]/45 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[34px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-6 shadow-[14px_14px_24px_rgba(45,33,26,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b97fd6]">Modal</p>
            <h3 className="font-display mt-2 text-3xl font-black tracking-tight text-[#1f1814]">{title}</h3>
          </div>
          <button className={secondaryLink} type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center rounded-full border-[2px] border-[#2c211b] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] leading-tight text-center sm:px-3 sm:text-[11px] sm:tracking-[0.2em] ${statusTone(status)}`}
    >
      {status}
    </span>
  )
}

function statusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('connected') || normalized.includes('live') || normalized.includes('launched')) {
    return 'bg-[#d9f1e5] text-[#1f1814]'
  }
  if (normalized.includes('paused') || normalized.includes('pending') || normalized.includes('scheduled')) {
    return 'bg-[#fff0bc] text-[#1f1814]'
  }
  if (normalized.includes('verification') || normalized.includes('error')) {
    return 'bg-[#fde2cf] text-[#1f1814]'
  }
  return 'bg-white text-[#1f1814]'
}

function LoadingGrid() {
  return (
    <div className="grid gap-5">
      {[1, 2].map((row) => (
        <div key={row} className="grid gap-5 xl:grid-cols-2">
          <div className="h-[320px] rounded-[34px] border-[2px] border-[#2c211b] bg-white/70 shadow-[10px_10px_20px_rgba(45,33,26,0.04)] animate-pulse" />
          <div className="h-[320px] rounded-[34px] border-[2px] border-[#2c211b] bg-white/70 shadow-[10px_10px_20px_rgba(45,33,26,0.04)] animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ title, description, compact = false }: { title: string; description?: string; compact?: boolean }) {
  return (
    <div className={`rounded-[28px] border-[2px] border-dashed border-[#2c211b] bg-white/70 ${compact ? 'p-4' : 'p-6'} shadow-[6px_6px_16px_rgba(45,33,26,0.04)]`}>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full border-[2px] border-[#2c211b] bg-[#d2e5ff] text-sm font-black text-[#1f1814] shadow-[4px_4px_12px_rgba(45,33,26,0.04)]">
          V
        </div>
        <div>
          <h4 className="font-display text-2xl font-black tracking-tight text-[#1f1814]">{title}</h4>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f554a]">{description}</p>}
        </div>
      </div>
    </div>
  )
}

function ErrorState({ title, message, retry }: { title: string; message: string; retry: () => void }) {
  return (
    <div className="rounded-[34px] border-[2px] border-[#2c211b] bg-[#fde2cf] p-6 text-[#1f1814] shadow-[10px_10px_20px_rgba(45,33,26,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#1f1814]/70">Error</p>
      <h4 className="font-display mt-2 text-3xl font-black tracking-tight">{title}</h4>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f554a]">{message}</p>
      <button className="mt-5 rounded-full border-[2px] border-[#2c211b] bg-white px-5 py-3 text-sm font-black text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.05)]" onClick={retry} type="button">
        Retry
      </button>
    </div>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone: 'blue' | 'yellow' | 'green' | 'purple'
}) {
  const palette = {
    blue: 'bg-[#d2e5ff]',
    yellow: 'bg-[#fff0bc]',
    green: 'bg-[#d9f1e5]',
    purple: 'bg-[#e4dbff]',
  }[tone]

  return (
    <div className={`rounded-[24px] border-[2px] border-[#2c211b] p-4 text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.05)] ${palette}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#61564e]">{label}</p>
          <p className="font-display mt-3 text-3xl font-black tracking-tight">{value}</p>
        </div>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border-[2px] border-[#2c211b] bg-white px-4 py-4 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b97fd6]">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#1f1814]">{value}</p>
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.28em] text-[#6b625a]">
        <span>Launch progress</span>
        <span>{value}%</span>
      </div>
      <div className="h-4 rounded-full border-[2px] border-[#2c211b] bg-[#fffaf4]">
        <div className="h-full rounded-full bg-[#f7d9ea]" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
    </div>
  )
}

function InfoBanner({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-[24px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full border-[2px] border-[#2c211b] bg-[#d2e5ff]">
          <Icon className="h-4 w-4 text-[#1f1814]" />
        </span>
        <div>
          <p className="font-black text-[#1f1814]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#5f554a]">{description}</p>
        </div>
      </div>
    </div>
  )
}

function inputFieldClass() {
  return 'w-full rounded-[22px] border-[2px] border-[#2c211b] bg-white px-4 py-3 text-sm font-medium text-[#1f1814] outline-none shadow-[6px_6px_16px_rgba(45,33,26,0.04)] placeholder:text-[#8c8278] focus:border-[#b97fd6]'
}

const inputField = inputFieldClass()
const textareaField = `${inputField} min-h-[120px] resize-y`
const secondaryLink =
  'inline-flex items-center justify-center gap-2 rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-3 text-sm font-black text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.04)] transition hover:bg-[#fffaf4]'

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatDate(value?: string) {
  if (!value) return 'Today'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export default App
