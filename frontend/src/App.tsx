import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeCheck,
  ChartColumn,
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
  Upload,
  UserRoundPlus,
  WandSparkles,
} from 'lucide-react'
import { platformNames } from './constants/platforms'
import { useAsync } from './hooks/useAsync'
import { getAnalytics } from './services/analytics'
import {
  connectAutomation,
  createAutomationSession,
  getAutomationSessions,
  getPlatforms,
  launchAutomationSignup,
  launchPublishBatch,
  resumeAutomationSession,
  startAutomationSmokeBatch,
} from './services/automation'
import { createProjectAccount, getProjectAccounts, type AccountInput } from './services/accounts'
import { generateCampaign, getCampaign, getCampaigns, updateCampaign, type GenerateCampaignInput } from './services/campaigns'
import { uploadImage } from './services/media'
import { createProject, deleteProject, getProjects, updateProject, type ProjectInput } from './services/projects'
import { getUserSettings, updateUserSettings } from './services/settings'
import type {
  AutomationSession,
  Campaign,
  Platform,
  PlatformName,
  PlatformAccount,
  Project,
  ProjectStatus,
  UserSettings,
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

type ProjectFormValues = {
  project: ProjectInput
  launchPlatforms: PlatformName[]
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
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40'
const primaryButton = `${buttonBase} bg-emerald-400 text-slate-950 hover:bg-emerald-300`
const secondaryButton = `${buttonBase} border border-white/10 bg-white/5 text-slate-100 hover:border-white/20 hover:bg-white/10`
const ghostButton = `${buttonBase} border border-transparent bg-transparent text-slate-300 hover:bg-white/5 hover:text-white`
const cardClass = 'rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-[0_18px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl'

const automationGuidance: Partial<Record<PlatformName, string>> = {
  LinkedIn: 'LinkedIn account setup is guidance-only because identity and verification checks are strongly enforced.',
  Xiaohongshu: 'Xiaohongshu generally requires phone-based regional verification, so Virel keeps this as guided setup.',
}

const unsupportedSignupPlatforms: PlatformName[] = ['LinkedIn', 'Xiaohongshu']

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
  const settingsState = useAsync(getUserSettings)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'All'>('All')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const projects = projectsState.data ?? []
  const campaigns = campaignsState.data ?? []
  const automationSessions = automationSessionsState.data ?? []
  const settings = settingsState.data ?? null
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

  async function handleSave(input: ProjectFormValues) {
    setActionError(null)
    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, input.project)
        projectsState.setData(projects.map((project) => (project.id === updated.id ? updated : project)))
        setEditingProject(null)
      } else {
        const created = await createProject(input.project)
        projectsState.setData([created, ...projects])
        setIsCreating(false)
        if (input.launchPlatforms.length > 0) {
          const preparedLaunches = input.launchPlatforms.map((platform) => buildProjectLaunchContext(created, settings, platform))
          await Promise.all(
            preparedLaunches.map((launch) =>
              Promise.all([
                createProjectAccount(created.id, launch.accountInput),
                connectAutomation({
                  projectId: created.id,
                  platform: launch.platform,
                  payload: launch.automationPayload,
                }),
              ]),
            ),
          )

          setActionMessage(`Project created and ${input.launchPlatforms.length} platform account(s) prepared.`)

          try {
            await startAutomationSmokeBatch({
              runs: preparedLaunches.map((launch) => ({
                platform: launch.platform,
                signupMethod: launch.signupMethod,
                email: launch.email,
                username: launch.username,
                displayName: launch.displayName,
                bio: launch.bio,
                holdMs: 15_000,
              })),
            })
            setActionMessage(`Project created and browser setup launched for ${input.launchPlatforms.length} selected platform(s).`)
          } catch (browserError) {
            setActionError(browserError instanceof Error ? browserError.message : 'Browser launch failed.')
          }
        }
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
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Project delete failed.')
      return false
    }
  }

  if (projectsState.isLoading || campaignsState.isLoading || automationSessionsState.isLoading || settingsState.isLoading) return <LoadingGrid />
  const error = projectsState.error || campaignsState.error || automationSessionsState.error || settingsState.error
  if (error) {
    const retry = projectsState.error
      ? projectsState.retry
      : campaignsState.error
        ? campaignsState.retry
        : automationSessionsState.error
          ? automationSessionsState.retry
          : settingsState.retry
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
        {actionMessage && <p className="mt-4 text-sm font-medium text-[#1f1814]">{actionMessage}</p>}
        {actionError && <p className="mt-2 text-sm font-medium text-[#b97fd6]">{actionError}</p>}
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
          settings={settings}
          onCancel={() => {
            setIsCreating(false)
            setEditingProject(null)
          }}
          onDelete={
            editingProject
              ? async () => {
                  const deleted = await handleDelete(editingProject.id)
                  if (deleted) setEditingProject(null)
                  return deleted
                }
              : undefined
          }
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
  onDelete: (id: string) => Promise<boolean>
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

function calculateLaunchProgress(
  project: Project,
  campaigns: Campaign[],
  automationSessions: AutomationSession[],
) {
  if (project.status === 'Launched') return 100

  const projectCampaigns = campaigns.filter((campaign) => campaign.projectId === project.id)
  const projectSessions = automationSessions.filter((session) => session.projectId === project.id)
  const completedCampaigns = projectCampaigns.filter((campaign) => campaign.status !== 'Draft').length
  const averageSessionProgress =
    projectSessions.length > 0
      ? projectSessions.reduce((total, session) => total + session.progress, 0) / projectSessions.length
      : 0

  let score = 0
  if (project.description) score += 12
  if (project.targetAudience) score += 10
  if (project.goal) score += 10
  if (project.repoUrl) score += 8
  if (project.demoUrl) score += 10
  if (project.logoUrl) score += 8
  score += Math.min(projectCampaigns.length * 8, 24)
  score += Math.min(completedCampaigns * 6, 18)
  score += Math.min(Math.round(averageSessionProgress / 2), 20)

  return Math.max(0, Math.min(100, score))
}

function normalizeAutomationUsername(projectName: string, platform: PlatformName) {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'virel'

  if (platform === 'Reddit') return `u/${slug}`
  return `@${slug}`
}

function buildProjectLaunchContext(project: Project, settings: UserSettings | null, platform: PlatformName) {
  const username = normalizeAutomationUsername(project.name, platform)
  const displayName = project.name
  const bio = trimToLength(project.description || project.goal || project.targetAudience || project.tagline, 500)
  const accountUrl = resolvePlatformUrl(platform, null, project, settings)
  const email = settings?.supportEmail || settings?.backupEmail || settings?.googleAccountEmail || undefined
  const websiteUrl = settings?.websiteUrl || project.demoUrl || project.repoUrl || ''
  const signupMethod = settings?.googleLinkStatus === 'Linked' && settings.googleAccountEmail ? 'google' : 'email'

  return {
    platform,
    username,
    displayName,
    bio,
    email,
    signupMethod,
    accountInput: {
      platform,
      username,
      bio: bio || '',
      profileImageUrl: settings?.profileImageUrl || project.logoUrl || null,
      accountUrl,
      status: 'Pending' as const,
      notes: `Prepared for ${project.name} using saved settings and project details.`,
      phoneRequired: platform === 'Instagram' || platform === 'LinkedIn' || platform === 'X' || platform === 'TikTok',
    } satisfies AccountInput,
    automationPayload: {
      username,
      display_name: displayName,
      bio,
      profile_image_url: settings?.profileImageUrl || project.logoUrl || null,
      account_url: accountUrl,
      company_name: project.name,
      legal_entity_name: project.name,
      company_start_date: settings?.companyStartDate || '',
      website_url: websiteUrl,
      support_email: email,
      phone_number: settings?.phoneNumber || '',
      country: settings?.country || '',
      timezone: settings?.timezone || '',
      backup_email: settings?.backupEmail || '',
      google_account_email: settings?.googleAccountEmail || '',
      google_link_status: settings?.googleLinkStatus || 'Not linked',
      brand_handle: normalizeAutomationUsername(project.name, platform),
      brand_bio: bio,
      linkedin_url: settings?.linkedinUrl || '',
      project_name: project.name,
      project_description: project.description || '',
      project_goal: project.goal || '',
      project_target_audience: project.targetAudience || '',
      project_repo_url: project.repoUrl || '',
      project_demo_url: project.demoUrl || '',
      project_logo_url: project.logoUrl || null,
      signup_method: signupMethod,
    },
  }
}

function buildGuidedAutomationPayload(project: Project, settings: UserSettings | null, platform: PlatformName) {
  return buildProjectLaunchContext(project, settings, platform).automationPayload
}

function buildPlatformAccountInput(project: Project, settings: UserSettings | null, platform: PlatformName) {
  return buildProjectLaunchContext(project, settings, platform).accountInput
}

function trimToLength(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined
  return value.length <= maxLength ? value : value.slice(0, maxLength).trimEnd()
}

function createEmptyUserSettings(): UserSettings {
  return {
    companyName: '',
    legalEntityName: '',
    companyStartDate: '',
    websiteUrl: '',
    supportEmail: '',
    phoneNumber: '',
    country: '',
    timezone: '',
    profileImageUrl: '',
    backupEmail: '',
    googleAccountEmail: '',
    googleLinkStatus: 'Not linked',
    linkedinUrl: '',
    emailNotifications: true,
    defaultTone: 'Confident',
    themeMode: 'System',
  }
}

function CampaignsView() {
  const projectsState = useAsync(getProjects)
  const campaignsState = useAsync(getCampaigns)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [goal, setGoal] = useState('')
  const [tone, setTone] = useState('Confident')
  const [title, setTitle] = useState('')
  const [platforms, setPlatforms] = useState<PlatformName[]>([])
  const [generatedCampaign, setGeneratedCampaign] = useState<Campaign | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [publishStatus, setPublishStatus] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  const projects = projectsState.data ?? []
  const campaigns = campaignsState.data ?? []
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]

  const campaignPreview = generatedCampaign ?? campaigns[0]

  async function handleGenerate() {
    if (!selectedProject || platforms.length === 0) return
    setActionError(null)
    try {
      const campaignGoal = goal || selectedProject.goal
      if (!campaignGoal) {
        setActionError('Add a campaign goal before generating.')
        return
      }
      const payload: GenerateCampaignInput = {
        projectId: selectedProject.id,
        goal: campaignGoal,
        platforms,
        tone,
        title: title || `${selectedProject.name} launch campaign`,
      }
      const campaign = await generateCampaign(payload)
      setGeneratedCampaign(campaign)
      campaignsState.setData([campaign, ...campaigns])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Campaign generation failed.')
    }
  }

  async function handleUpdateCampaign(
    campaignId: string,
    patch: {
      title: string
      summary: string
      goal: string
      tone: string
      status: string
    },
  ) {
    setActionError(null)
    try {
      const updated = await updateCampaign(campaignId, patch)
      campaignsState.setData(campaigns.map((campaign) => (campaign.id === updated.id ? updated : campaign)))
      if (generatedCampaign?.id === updated.id) {
        setGeneratedCampaign(updated)
      }
      setEditingCampaign((current) => (current?.id === updated.id ? updated : current))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Campaign update failed.')
      throw error
    }
  }

  async function handlePublishAssistant() {
    if (!campaignPreview || !selectedProject || campaignPreview.posts.length === 0) return

    setActionError(null)
    setPublishStatus('Starting multi-platform publishing assistant...')
    setIsPublishing(true)

    try {
      const result = await launchPublishBatch({
        projectId: selectedProject.id,
        displayName: selectedProject.name,
        username: normalizeHandle(selectedProject.name),
        bio: selectedProject.description || selectedProject.tagline,
        websiteUrl: selectedProject.demoUrl ?? selectedProject.repoUrl ?? undefined,
        posts: campaignPreview.posts,
      })
      setPublishStatus(`${result.message} PID: ${result.pid}${result.logPath ? ` Log: ${result.logPath}` : ''}`)
    } catch (error) {
      setPublishStatus(null)
      setActionError(error instanceof Error ? error.message : 'Publishing assistant failed to start.')
    } finally {
      setIsPublishing(false)
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
          description="Pick a project, set the tone, and shape the three-phase campaign timeline."
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
                <input className={inputField} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedProject.name} launch campaign`} />
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

              <button className={primaryButton} onClick={() => void handleGenerate()} type="button">
                <Sparkles className="h-4 w-4" />
                Generate campaign
              </button>

              {actionError && <p className="text-sm font-medium text-[#b97fd6]">{actionError}</p>}
            </div>
          </div>

          <div className={`${paperCard} p-5`}>
            <SectionHeader
              eyebrow="Preview"
              title="Campaign reel"
              action={
                campaignPreview ? (
                  <DashboardAction onClick={() => setEditingCampaign(campaignPreview)} tone="coral">
                    <PencilLine className="h-4 w-4" />
                    Edit campaign
                  </DashboardAction>
                ) : undefined
              }
            />
            {campaignPreview ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-3xl font-black tracking-tight text-[#1f1814]">{campaignPreview.name}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#51463f]">
                      {campaignPreview.summary || campaignPreview.audience || campaignPreview.goal}
                    </p>
                  </div>
                  <StatusBadge status={campaignPreview.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Project" value={selectedProject.name} />
                  <MiniStat label="Platforms" value={campaignPreview.platforms.join(', ') || 'Not set'} />
                  <MiniStat label="Tone" value={campaignPreview.tone || tone} />
                </div>

                <div className="grid gap-3">
                  {campaignPreview.days.slice(0, 3).map((day) => (
                    <div key={day.id} className="rounded-[24px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">Phase {day.day}</p>
                        <span className="rounded-full border-[2px] border-[#2c211b] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em]">
                          {day.status}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-black text-[#1f1814]">{day.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5f554a]">{day.content}</p>
                    </div>
                  ))}
                </div>

                {campaignPreview.posts.length > 0 && (
                  <div className="rounded-[28px] border-[2px] border-dashed border-[#2c211b] bg-[#f7fff9] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7ea8ff]">Live first post</p>
                        <p className="mt-1 text-sm leading-6 text-[#5f554a]">The first generated post is published immediately. The rest stay available for review below.</p>
                      </div>
                      <StatusBadge status={campaignPreview.posts[0].status} />
                    </div>
                    <div className="mt-4">
                      <CampaignPostCard post={campaignPreview.posts[0]} />
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button className={secondaryButton} onClick={() => setGeneratedCampaign(campaignPreview)} type="button">
                    Keep preview
                  </button>
                  <button
                    className={secondaryButton}
                    disabled={isPublishing || campaignPreview.posts.length === 0}
                    onClick={() => void handlePublishAssistant()}
                    type="button"
                  >
                    {isPublishing ? 'Starting assistant...' : 'Publish assistant'}
                  </button>
                  <button className={ghostButton} onClick={() => setTitle('')} type="button">
                    Reset title
                  </button>
                </div>
                {publishStatus && <p className="text-sm font-medium text-[#1f1814]">{publishStatus}</p>}
              </div>
            ) : (
              <EmptyState title="No campaign yet." description="Generate one to see the plan expand." compact />
            )}
          </div>
        </div>
        {actionError && <p className="mt-4 text-sm text-rose-300">{actionError}</p>}
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className={secondaryLink} type="button" onClick={() => setEditingCampaign(campaign)}>
                    <PencilLine className="h-4 w-4" />
                    Edit campaign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editingCampaign && (
        <CampaignEditorModal
          campaign={editingCampaign}
          onCancel={() => setEditingCampaign(null)}
          onSave={(patch) => handleUpdateCampaign(editingCampaign.id, patch)}
        />
      )}
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

function CampaignEditorModal({
  campaign,
  onCancel,
  onSave,
}: {
  campaign: Campaign
  onCancel: () => void
  onSave: (patch: {
    title: string
    summary: string
    goal: string
    tone: string
    status: string
  }) => Promise<void>
}) {
  const [title, setTitle] = useState(campaign.name)
  const [summary, setSummary] = useState(campaign.summary ?? campaign.audience ?? '')
  const [goal, setGoal] = useState(campaign.goal)
  const [tone, setTone] = useState(campaign.tone ?? 'Confident')
  const [status, setStatus] = useState<Campaign['status']>(campaign.status)
  const [saving, setSaving] = useState(false)
  const campaignStatuses = ['Draft', 'Scheduled', 'Live', 'Complete'] as const

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave({ title, summary, goal, tone, status })
      onCancel()
    } catch {
      // The parent surfaces the error message; keep the modal open for fixes.
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit campaign" onClose={onCancel}>
      <form className="mt-6 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Field label="Campaign title" description="Update the public campaign name.">
          <input className={inputField} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Campaign summary" description="A short description for the campaign card and preview.">
          <textarea className={textareaField} value={summary} onChange={(event) => setSummary(event.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Campaign goal" description="The action you want the campaign to drive.">
            <input className={inputField} value={goal} onChange={(event) => setGoal(event.target.value)} />
          </Field>
          <Field label="Tone" description="The voice used when generating campaign content.">
            <select className={inputField} value={tone} onChange={(event) => setTone(event.target.value)}>
              {TONE_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Campaign status" description="Controls the badge shown in Campaigns and Automation.">
          <select className={inputField} value={status} onChange={(event) => setStatus(event.target.value as Campaign['status'])}>
            {campaignStatuses.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <p className="text-xs leading-5 text-[#6b625a]">
          The phase posts stay attached to this campaign, so editing here updates the wrapper without losing the generated content.
        </p>
        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <button className={secondaryLink} type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="rounded-full border-[2px] border-[#2c211b] bg-[#2c211b] px-5 py-3 text-sm font-black text-[#fffaf4] shadow-[6px_6px_16px_rgba(45,33,26,0.06)] disabled:opacity-60" disabled={saving} type="submit">
            {saving ? 'Saving…' : 'Save campaign'}
          </button>
        </div>
      </form>
    </Modal>
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
  if (!analytics) {
    return <EmptyState title="No analytics available yet." description="Publish a post and capture real metrics to populate this page." />
  }

  const hasRealAnalyticsData =
    analytics.timeline.length > 0 || analytics.platforms.length > 0 || analytics.topPosts.length > 0 || analytics.summary.engagement > 0

  if (!hasRealAnalyticsData) {
    return <EmptyState title="No real analytics yet." description="Analytics will appear after published posts generate tracked engagement." />
  }

  const recentPosts = analytics.topPosts.slice(0, 4)

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
          <MetricTile label="Engagement" value={formatNumber(analytics.summary.engagement)} icon={ChartColumn} tone="green" />
          <MetricTile label="Views" value={formatNumber(analytics.summary.views)} icon={LineChart} tone="purple" />
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
                  <p>{formatNumber(platform.views)} views</p>
                  <p>{formatNumber(platform.followers)} followers</p>
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

        <article className={cardClass}>
          <SectionHeader eyebrow="Recent posts" title="Generated content" />
          {recentPosts.length === 0 ? (
            <EmptyState title="No generated posts yet." description="Create a campaign to see posts here." compact />
          ) : (
            <div className="mt-5 grid gap-3">
              {recentPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{post.title}</span>
                    <StatusBadge status={post.platform} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {formatNumber(post.likes)} likes, {formatNumber(post.comments)} comments, {formatNumber(post.shares)} shares
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{post.platform}</span>
                    <span>•</span>
                    <span>{formatNumber(post.engagement)} engagement</span>
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
  const [notes, setNotes] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [sessions, setSessions] = useState<AutomationSession[]>([])
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [launchStatus, setLaunchStatus] = useState<string | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)

  const platforms = platformsState.data ?? []
  const projects = projectsState.data ?? []
  const selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId) ?? platforms[0]
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]
  const guidance = selectedPlatform ? automationGuidance[selectedPlatform.name] : null
  const signupUnsupported = selectedPlatform ? unsupportedSignupPlatforms.includes(selectedPlatform.name) : false
  const resolvedUsername = selectedProject ? username || normalizeHandle(selectedProject.name) : username
  const resolvedBio = selectedProject ? bio || selectedProject.description || selectedProject.tagline || selectedProject.goal : bio
  const resolvedWebsiteUrl = selectedProject?.demoUrl ?? selectedProject?.repoUrl ?? undefined

  async function handleRequestConnection() {
    if (!selectedProject || !selectedPlatform) return
    setSessionError(null)
    try {
      const session = await connectAutomation({
        projectId: selectedProject.id,
        platform: selectedPlatform.name,
        payload: {
          username: resolvedUsername,
          bio: resolvedBio,
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
          username: resolvedUsername,
          bio: resolvedBio,
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

  async function handleLaunchSignupPrefill() {
    if (!selectedProject || !selectedPlatform || signupUnsupported) {
      if (guidance) setLaunchStatus(guidance)
      return
    }

    setSessionError(null)
    setLaunchStatus('Starting signup prefill assistant...')
    setIsLaunching(true)

    try {
      const session = await createAutomationSession({
        projectId: selectedProject.id,
        platform: selectedPlatform.name,
        status: 'running',
        step: 'signup_prefill_browser_started',
        progress: 20,
        payload: {
          signup_method: 'email',
          email: signupEmail,
          username: resolvedUsername,
          display_name: selectedProject.name,
          bio: resolvedBio,
          profile_image_url: profileImageUrl,
          account_url: accountUrl,
          website_url: resolvedWebsiteUrl,
          notes,
        },
      })
      setSessions((current) => [session, ...current])

      const launch = await launchAutomationSignup({
        projectId: selectedProject.id,
        platform: selectedPlatform.name,
        email: signupEmail || undefined,
        password: signupPassword || undefined,
        username: resolvedUsername,
        displayName: selectedProject.name,
        bio: resolvedBio,
        websiteUrl: resolvedWebsiteUrl,
        profileImagePath: profileImageUrl || undefined,
        signupMethod: 'email',
        holdMs: 300000,
      })

      setLaunchStatus(`${launch.message} PID: ${launch.pid}${launch.logPath ? ` Log: ${launch.logPath}` : ''}`)
    } catch (error) {
      setLaunchStatus(null)
      setSessionError(error instanceof Error ? error.message : 'Signup prefill launch failed.')
    } finally {
      setIsLaunching(false)
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
          title="Guided setup, backed by the real API"
          description="These requests create automation sessions on the backend. The browser automation layer can pick them up later."
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
                    <p className="mt-2 text-sm text-slate-300">{platform.username}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm leading-6 text-current/70">{platform.notes || platform.automation}</p>
              </button>
            ))}
          </div>

          <div className={cardClass}>
            <SectionHeader
              eyebrow="Connection brief"
              title={`Setup ${selectedPlatform.name}`}
              description="Fill in the brand details, then either queue the session or request a connect run."
            />
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

              <Field label="Username">
                <input className={inputField} value={username} onChange={(event) => setUsername(event.target.value)} />
              </Field>

              <Field label="Account URL">
                <input className={inputField} value={accountUrl} onChange={(event) => setAccountUrl(event.target.value)} />
              </Field>

              <Field label="Signup email">
                <input className={inputField} value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} />
              </Field>

              <Field label="Signup password">
                <input
                  className={inputField}
                  type="password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                />
              </Field>

              <Field label="Bio" className="sm:col-span-2">
                <textarea className={textareaField} value={bio} onChange={(event) => setBio(event.target.value)} />
              </Field>

              <Field label="Profile image URL" className="sm:col-span-2">
                <input
                  className={inputField}
                  value={profileImageUrl}
                  onChange={(event) => setProfileImageUrl(event.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Setup notes" className="sm:col-span-2">
                <textarea className={textareaField} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className={primaryButton} onClick={() => void handleRequestConnection()} type="button">
                <UserRoundPlus className="h-4 w-4" />
                Request connect
              </button>
              <DashboardAction onClick={() => void handleQueueSession()} tone="coral">
                <CircleDashed className="h-4 w-4" />
                Queue session
              </DashboardAction>
              <DashboardAction onClick={() => void handleLaunchSignupPrefill()} tone="blue">
                <ExternalLink className="h-4 w-4" />
                {isLaunching ? 'Starting...' : 'Launch prefill'}
              </DashboardAction>
            </div>

            {sessionError && <p className="mt-4 text-sm text-rose-300">{sessionError}</p>}
            {launchStatus && <p className="mt-4 text-sm text-slate-200">{launchStatus}</p>}
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
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

function AutomationView() {
  const projectsState = useAsync(getProjects)
  const campaignsState = useAsync(getCampaigns)
  const sessionsState = useAsync(getAutomationSessions)
  const platformsState = useAsync(getPlatforms)
  const settingsState = useAsync(getUserSettings)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [activePlatform, setActivePlatform] = useState<PlatformName | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const projects = projectsState.data ?? []
  const campaigns = campaignsState.data ?? []
  const platforms = platformsState.data ?? []
  const settings = settingsState.data

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId(null)
      return
    }
    if (!selectedProjectId || !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  useEffect(() => {
    setActivePlatform(null)
  }, [selectedProjectId])

  const currentProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const currentProjectCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.projectId === currentProject?.id),
    [campaigns, currentProject?.id],
  )

  useEffect(() => {
    if (!currentProjectCampaigns.length) {
      setSelectedCampaignId(null)
      return
    }
    if (!selectedCampaignId || !currentProjectCampaigns.some((campaign) => campaign.id === selectedCampaignId)) {
      setSelectedCampaignId(currentProjectCampaigns[0].id)
    }
  }, [currentProjectCampaigns, selectedCampaignId])

  const accountsLoader = useMemo<() => Promise<PlatformAccount[]>>(() => {
    if (!selectedProjectId) return async () => [] as PlatformAccount[]
    return () => getProjectAccounts(selectedProjectId)
  }, [selectedProjectId])
  const accountsState = useAsync(accountsLoader)
  const accounts = accountsState.data ?? []
  const accountByPlatform = useMemo(() => new Map(accounts.map((account) => [account.platform, account])), [accounts])
  const activeAccount = activePlatform ? accountByPlatform.get(activePlatform) ?? null : null
  const campaignLoader = useMemo<() => Promise<Campaign | null>>(() => {
    if (!selectedCampaignId) return async () => null
    return () => getCampaign(selectedCampaignId)
  }, [selectedCampaignId])
  const campaignState = useAsync(campaignLoader)
  const currentCampaign = campaignState.data?.id === selectedCampaignId ? campaignState.data : null
  const connectedCount = accounts.filter((account) => account.status === 'Connected').length
  const needsReviewCount = accounts.filter((account) => account.status === 'Needs verification' || account.status === 'Pending').length

  async function handlePrepareAccount(platform: PlatformName) {
    if (!currentProject) return
    setActionError(null)
    setActionMessage(null)
    try {
      const created = await createProjectAccount(currentProject.id, buildPlatformAccountInput(currentProject, settings, platform))
      accountsState.setData([created, ...accounts.filter((account) => account.id !== created.id)])
      setActivePlatform(created.platform)
      setActionMessage(`${platform} account prepared.`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to prepare account.')
    }
  }

  async function handleResumeAccount(platform: PlatformName) {
    if (!currentProject) return
    setActionError(null)
    setActionMessage(null)
    try {
      const result = await resumeAutomationSession(currentProject.id, platform)
      setActionMessage(result.message)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to resume session.')
    }
  }

  const modalPlatform = activePlatform ? platforms.find((platform) => platform.name === activePlatform) ?? null : null

  if (projectsState.isLoading || campaignsState.isLoading || sessionsState.isLoading || platformsState.isLoading || settingsState.isLoading) {
    return <LoadingGrid />
  }
  const error = projectsState.error || campaignsState.error || sessionsState.error || platformsState.error || settingsState.error
  if (error) {
    const retry = projectsState.error
      ? projectsState.retry
      : campaignsState.error
        ? campaignsState.retry
        : sessionsState.error
          ? sessionsState.retry
          : platformsState.error
            ? platformsState.retry
            : settingsState.retry
    return <ErrorState title="Automation could not load." message={error} retry={retry} />
  }

  if (!projects.length) {
    return <EmptyState title="No projects to manage yet." description="Create a project first, then return here to manage its social accounts." />
  }

  return (
    <div className="space-y-6">
      <section className={`${paperCard} p-6 sm:p-7`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Automation"
            title="Account management"
            description="Click a platform card to open a live mobile preview in a modal. Setup stays assisted; verification stays manual."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[620px]">
            <StatPill label="Projects" value={projects.length.toString()} color="bg-[#d2e5ff]" />
            <StatPill label="Accounts" value={accounts.length.toString()} color="bg-[#fde2cf]" />
            <StatPill label="Connected" value={connectedCount.toString()} color="bg-[#d9f1e5]" />
            <StatPill label="Needs review" value={needsReviewCount.toString()} color="bg-[#e4dbff]" />
          </div>
        </div>
      </section>

      <section className={`${paperCard} p-6 sm:p-7`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b97fd6]">Active project</p>
            <label className="mt-2 block">
              <span className="sr-only">Select project</span>
              <select
                className="w-full rounded-[24px] border-[2px] border-[#2c211b] bg-white px-4 py-4 text-lg font-black text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.05)] outline-none"
                value={currentProject?.id ?? ''}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-[26px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#7ea8ff]">Current status</p>
            <p className="mt-2 text-sm leading-6 text-[#5f554a]">
              {currentProject?.description || currentProject?.tagline || 'No project description available.'}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#6b625a]">
              {currentProjectCampaigns.length} campaigns · {accounts.length} accounts
            </p>
          </div>
        </div>
        {actionMessage && <p className="mt-4 text-sm font-medium text-[#1f1814]">{actionMessage}</p>}
        {actionError && <p className="mt-2 text-sm font-medium text-[#b97fd6]">{actionError}</p>}
      </section>

      <section className={`${paperCard} p-6 sm:p-7`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeader
            eyebrow="Campaign posts"
            title="Phases and posts"
            description="Choose a campaign to inspect the full phase breakdown. Each phase contains multiple post ideas so automation has real content to work with."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px]">
            <MiniStat label="Campaigns" value={currentProjectCampaigns.length.toString()} />
            <MiniStat label="Posts" value={currentCampaign?.posts.length.toString() ?? '0'} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className={`${insetCard} p-5`}>
            <div className="grid gap-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.28em] text-[#b97fd6]">Campaign</span>
                <select
                  className="mt-2 w-full rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-3 text-sm font-black text-[#1f1814] shadow-[6px_6px_16px_rgba(45,33,26,0.04)] outline-none"
                  value={selectedCampaignId ?? ''}
                  onChange={(event) => setSelectedCampaignId(event.target.value)}
                >
                  {currentProjectCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="Status" value={currentCampaign?.status ?? 'Draft'} />
                <MiniStat label="Phases" value={currentCampaign?.days.length.toString() ?? '0'} />
                <MiniStat label="Posts" value={currentCampaign?.posts.length.toString() ?? '0'} />
              </div>

              {campaignState.error && <p className="text-sm font-medium text-[#b97fd6]">{campaignState.error}</p>}
              {campaignState.isLoading && !currentCampaign && (
                <p className="text-sm leading-6 text-[#5f554a]">Loading campaign posts...</p>
              )}
              {!campaignState.isLoading && !currentCampaign && !campaignState.error && (
                <EmptyState
                  compact
                  title="No campaign selected."
                  description="Generate a campaign in the Campaigns tab and come back here to review the phase posts."
                />
              )}
            </div>
          </div>

          <div className="rounded-[26px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#7ea8ff]">Sequence view</p>
            <p className="mt-2 text-sm leading-6 text-[#5f554a]">
              The automation dock now mirrors the campaign timeline, so every phase can expand into several posts before setup begins.
            </p>
          </div>
        </div>

        {currentCampaign && (
          <div className="mt-6 grid gap-4">
            {currentCampaign.days.map((day) => (
              <CampaignPhaseCard key={day.id} day={day} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {platforms.map((platform) => {
          const account = accountByPlatform.get(platform.name)
          const isActive = activePlatform === platform.name
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => setActivePlatform(platform.name)}
              className={`rounded-[28px] border-[2px] border-[#2c211b] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[10px_10px_24px_rgba(45,33,26,0.08)] ${
                isActive ? 'bg-[#f7d9ea]' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#b97fd6]">{platform.name.toLowerCase().replaceAll(' ', '_')}</p>
                  <h3 className="mt-2 font-display text-3xl font-black tracking-tight text-[#1f1814]">{platform.name}</h3>
                </div>
                <StatusBadge status={account?.status ?? (platform.phoneRequired ? 'Needs verification' : 'Pending')} />
              </div>
              <p className="mt-4 text-sm leading-6 text-[#5f554a] line-clamp-3">{platform.notes}</p>
              <div className="mt-4 rounded-[22px] border-[2px] border-[#2c211b] bg-[#fffaf4] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#6b625a]">
                {account?.username ?? 'No account yet'}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border-[2px] border-[#2c211b] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${account ? 'bg-[#d9f1e5]' : 'bg-[#fde2cf]'}`}>
                  {account?.sessionPath ? 'Session saved' : account ? 'Open login' : 'Prepare'}
                </span>
                <span className="rounded-full border-[2px] border-[#2c211b] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#6b625a]">
                  {platform.phoneRequired ? 'Phone likely required' : 'Email-first'}
                </span>
              </div>
            </button>
          )
        })}
      </section>

      {activePlatform && modalPlatform && (
        <Modal
          title={`${modalPlatform.name} account`}
          onClose={() => setActivePlatform(null)}
          className="max-w-6xl"
        >
          <PhoneSimulator
            account={activeAccount}
            platform={modalPlatform}
            project={currentProject}
            settings={settings}
            onPrepareAccount={() => void handlePrepareAccount(modalPlatform.name)}
            onResumeSession={() => void handleResumeAccount(modalPlatform.name)}
          />
        </Modal>
      )}
    </div>
  )
}

function CampaignPhaseCard({ day }: { day: Campaign['days'][number] }) {
  return (
    <article className={`${paperCard} p-5 sm:p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b97fd6]">Phase {day.day}</p>
          <h3 className="font-display mt-2 text-3xl font-black tracking-tight text-[#1f1814]">{day.title}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f554a]">{day.content}</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <StatusBadge status={day.status} />
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b625a]">Starts {day.scheduledTime}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {day.platforms.length > 0 ? (
          day.platforms.map((platform) => (
            <span
              key={`${day.id}-${platform}`}
              className="rounded-full border-[2px] border-[#2c211b] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#1f1814]"
            >
              {platform}
            </span>
          ))
        ) : (
          <span className="rounded-full border-[2px] border-[#2c211b] bg-[#fde2cf] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#1f1814]">
            No platforms yet
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {day.posts?.length ? (
          day.posts.map((post) => <CampaignPostCard key={post.id} post={post} />)
        ) : (
          <EmptyState
            compact
            title="No posts attached yet."
            description="This phase will fill in once the campaign detail is loaded with generated posts."
          />
        )}
      </div>
    </article>
  )
}

function CampaignPostCard({ post }: { post: Campaign['posts'][number] }) {
  return (
    <div className="rounded-[24px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#7ea8ff]">{post.platform}</p>
          <h4 className="mt-2 break-words font-black text-[#1f1814]">{post.title}</h4>
        </div>
        <StatusBadge status={post.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {post.scheduledTime && (
          <span className="rounded-full border-[2px] border-[#2c211b] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#6b625a]">
            {post.scheduledTime}
          </span>
        )}
        {post.hashtags?.slice(0, 3).map((tag) => (
          <span
            key={`${post.id}-${tag}`}
            className="rounded-full border-[2px] border-[#2c211b] bg-[#d9f1e5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#1f1814]"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm leading-6 text-[#5f554a]">{post.content}</p>
      {post.callToAction && <p className="mt-3 text-sm font-bold text-[#1f1814]">CTA: {post.callToAction}</p>}
    </div>
  )
}

function PhoneSimulator({
  account,
  platform,
  project,
  settings,
  onPrepareAccount,
  onResumeSession,
}: {
  account: PlatformAccount | null
  platform: Platform
  project: Project | null
  settings: UserSettings | null
  onPrepareAccount: () => void
  onResumeSession: () => void
}) {
  const profileUrl = resolvePlatformUrl(platform.name, account, project, settings)
  const username = account?.username || normalizeAutomationUsername(project?.name ?? 'Virel', platform.name)
  const status = account?.status ?? (platform.phoneRequired ? 'Needs verification' : 'Pending')

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="mx-auto w-full max-w-[430px] rounded-[36px] border-[2px] border-[#2c211b] bg-white shadow-[0_12px_30px_rgba(45,33,26,0.12)]">
        <div className="flex items-center gap-2 border-b border-[#2c211b]/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#fde2cf]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fff0bc]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d9f1e5]" />
          <div className="ml-2 min-w-0 flex-1 rounded-full border border-[#2c211b]/10 bg-[#f8f4ee] px-3 py-2 text-[11px] font-medium text-[#6b625a]">
            {profileUrl}
          </div>
        </div>
        <div className="h-[72vh] min-h-[620px] overflow-hidden bg-white">
          <iframe className="h-full w-full border-0 bg-white" src={profileUrl} title={`${platform.name} live preview`} />
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[28px] border-[2px] border-[#2c211b] bg-white p-5 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#b97fd6]">Account</p>
          <h3 className="font-display mt-2 text-3xl font-black tracking-tight text-[#1f1814]">{platform.name}</h3>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-[#5f554a]">
            <p>
              Username: <span className="font-black text-[#1f1814]">{username}</span>
            </p>
            <p>
              Status: <span className="font-black text-[#1f1814]">{status}</span>
            </p>
            <p>
              Mode: <span className="font-black text-[#1f1814]">{account?.sessionPath ? 'Saved session' : 'Preview'}</span>
            </p>
            {account?.sessionPath && (
              <p>
                Session: <span className="font-black text-[#1f1814]">Saved</span>
              </p>
            )}
            <p>{platform.notes}</p>
          </div>
        </div>

        <div className="rounded-[28px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-5 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#7ea8ff]">Website</p>
          <p className="mt-2 break-all text-sm leading-6 text-[#5f554a]">{profileUrl}</p>
          <p className="mt-3 text-sm leading-6 text-[#5f554a]">
            If the platform blocks embedding, the live site is still available in the browser tab.
          </p>
        </div>

        {!account ? (
          <button
            className="w-full rounded-full border-[2px] border-[#2c211b] bg-[#d2e5ff] px-5 py-3 text-sm font-black text-[#1f1814]"
            type="button"
            onClick={onPrepareAccount}
          >
            Prepare account
          </button>
        ) : (
          <button
            className="w-full rounded-full border-[2px] border-[#2c211b] bg-[#d9f1e5] px-5 py-3 text-sm font-black text-[#1f1814]"
            type="button"
            onClick={onResumeSession}
          >
            {account.sessionPath ? 'Resume saved session' : 'Open login flow'}
          </button>
        )}
      </aside>
    </div>
  )
}

function resolvePlatformUrl(platform: PlatformName, account: PlatformAccount | null, project: Project | null, settings: UserSettings | null) {
  const accountUrl = account?.accountUrl
  if (accountUrl && isSocialAccountUrl(platform, accountUrl)) {
    return accountUrl
  }

  const slug = normalizeAutomationUsername(
    project?.name ?? 'Virel',
    platform,
  )
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/^u\//, '')

  if (platform === 'Instagram') {
    const handle = normalizeHandle(account?.username || slug)
    return `https://www.instagram.com/${handle}/`
  }
  if (platform === 'Facebook') {
    const handle = normalizeHandle(account?.username || slug)
    return `https://www.facebook.com/${handle}`
  }
  if (platform === 'X') {
    const handle = normalizeHandle(account?.username || slug)
    return `https://x.com/${handle}`
  }
  if (platform === 'Reddit') {
    const handle = normalizeHandle(account?.username || slug, 'u/')
    return `https://www.reddit.com/user/${handle.replace(/^u\//, '')}/`
  }
  if (platform === 'LinkedIn') return account?.accountUrl || 'https://www.linkedin.com/feed/'
  if (platform === 'TikTok') {
    const handle = normalizeHandle(account?.username || slug)
    return `https://www.tiktok.com/@${handle}`
  }
  if (platform === 'Telegram') {
    const handle = normalizeHandle(account?.username || slug)
    return `https://t.me/${handle}`
  }
  return 'https://www.linkedin.com/feed/'
}

function normalizeHandle(value: string, prefix = '@') {
  const cleaned = value.trim().replace(/^@+/, '').replace(/^u\//, '')
  return prefix === 'u/' ? `${prefix}${cleaned}` : cleaned
}

function isSocialAccountUrl(platform: PlatformName, url: string) {
  const normalized = url.toLowerCase()
  if (platform === 'Instagram') return normalized.includes('instagram.com')
  if (platform === 'Facebook') return normalized.includes('facebook.com')
  if (platform === 'X') return normalized.includes('x.com') || normalized.includes('twitter.com')
  if (platform === 'Reddit') return normalized.includes('reddit.com')
  if (platform === 'LinkedIn') return normalized.includes('linkedin.com')
  if (platform === 'TikTok') return normalized.includes('tiktok.com')
  if (platform === 'Telegram') return normalized.includes('t.me') || normalized.includes('telegram.me')
  return false
}

function SettingsView() {
  const settingsState = useAsync(getUserSettings)
  const [draft, setDraft] = useState<UserSettings>(createEmptyUserSettings())
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (settingsState.data) {
      setDraft(settingsState.data)
    }
  }, [settingsState.data])

  const requiredCount = [
    draft.companyStartDate,
    draft.websiteUrl,
    draft.supportEmail,
    draft.phoneNumber,
    draft.country,
    draft.timezone,
    draft.backupEmail,
    draft.googleAccountEmail,
  ].filter(Boolean).length

  function updateField<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    setSaveError(null)
    setSaveMessage(null)
    try {
      const updated = await updateUserSettings(draft)
      setDraft(updated)
      settingsState.setData(updated)
      setSaveMessage('Settings saved.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings.')
    }
  }

  function startGoogleLink() {
    updateField('googleLinkStatus', 'Pending')
    window.open('https://accounts.google.com/', '_blank', 'noopener,noreferrer')
  }

  if (settingsState.isLoading) return <LoadingGrid />
  if (settingsState.error) return <ErrorState title="Settings could not load." message={settingsState.error} retry={settingsState.retry} />

  return (
    <div className="space-y-6">
      <section className={`${paperCard} p-6 sm:p-7`}>
        <SectionHeader
          eyebrow="Settings"
          title="Identity studio"
          description="Store the user-level contact and verification details used across account setup. Project branding now lives in the Projects tab."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <SettingsCard title="Operations">
            <Field label="Company start date" description="The date the business or project officially started.">
              <input className={inputField} type="date" value={draft.companyStartDate} onChange={(event) => updateField('companyStartDate', event.target.value)} />
            </Field>
            <Field label="Website" description="Your main public website or landing page URL.">
              <input className={inputField} value={draft.websiteUrl} onChange={(event) => updateField('websiteUrl', event.target.value)} />
            </Field>
            <Field label="Support email" description="Use the inbox you want platform teams to contact.">
              <input className={inputField} value={draft.supportEmail} onChange={(event) => updateField('supportEmail', event.target.value)} />
            </Field>
            <Field label="Backup email" description="A recovery inbox if the primary account is locked.">
              <input className={inputField} value={draft.backupEmail} onChange={(event) => updateField('backupEmail', event.target.value)} />
            </Field>
            <Field label="Phone number" description="The number used for verification or recovery.">
              <input className={inputField} value={draft.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" description="Where the business is based.">
                <input className={inputField} value={draft.country} onChange={(event) => updateField('country', event.target.value)} />
              </Field>
              <Field label="Timezone" description="Use the timezone where the team operates.">
                <input className={inputField} value={draft.timezone} onChange={(event) => updateField('timezone', event.target.value)} />
              </Field>
            </div>
            <Field label="Default campaign tone" description="The default voice used for generated content.">
              <input className={inputField} value={draft.defaultTone} onChange={(event) => updateField('defaultTone', event.target.value)} />
            </Field>
            <label className="flex items-center gap-3 rounded-[24px] border-[2px] border-[#2c211b] bg-white px-4 py-3 shadow-[6px_6px_16px_rgba(45,33,26,0.04)]">
              <input checked={draft.emailNotifications} onChange={(event) => updateField('emailNotifications', event.target.checked)} type="checkbox" />
              <span className="text-sm font-medium text-[#5f554a]">Email campaign and verification alerts</span>
            </label>
          </SettingsCard>

          <SettingsCard title="Google connection">
            <Field label="Google account email" description="The Google account used to link and sign in.">
              <input className={inputField} value={draft.googleAccountEmail} onChange={(event) => updateField('googleAccountEmail', event.target.value)} />
            </Field>
            <div className="rounded-[26px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">Status</p>
              <select className={`${inputField} mt-3`} value={draft.googleLinkStatus} onChange={(event) => updateField('googleLinkStatus', event.target.value as UserSettings['googleLinkStatus'])}>
                <option>Not linked</option>
                <option>Pending</option>
                <option>Linked</option>
              </select>
              <p className="mt-2 text-sm leading-6 text-[#5f554a]">
                Opens Google sign-in in a new tab so the user stays in control of the linking step.
              </p>
            </div>
            <DashboardAction onClick={startGoogleLink} tone="blue">
              <ExternalLink className="h-4 w-4" />
              Link Google account
            </DashboardAction>
            <button className={secondaryLink} type="button" onClick={() => updateField('googleLinkStatus', 'Not linked')}>
              Reset Google status
            </button>
          </SettingsCard>

          <SettingsCard title="Readiness">
            <div className="rounded-[26px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">Required fields</p>
              <p className="font-display mt-3 text-5xl font-black text-[#1f1814]">{requiredCount}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f554a]">Core identity fields filled for account setup.</p>
            </div>
            <InfoBanner icon={ShieldCheck} title="Compliance first" description="Keep verification, CAPTCHA, and account approval with the user." />
            <InfoBanner icon={BadgeCheck} title="Project owned branding" description="Keep brand name, bio, and avatar in the project record." />
          </SettingsCard>

          <SettingsCard title="Theme">
            <div className="grid grid-cols-3 gap-2">
              {(['System', 'Light', 'Dark'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-[22px] border-[2px] border-[#2c211b] px-3 py-3 text-sm font-black uppercase tracking-[0.18em] shadow-[4px_4px_12px_rgba(45,33,26,0.04)] ${
                    draft.themeMode === mode ? 'bg-[#d9f1e5] text-[#1f1814]' : 'bg-white text-[#1f1814]'
                  }`}
                  onClick={() => updateField('themeMode', mode)}
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {saveMessage && <p className="text-sm font-medium text-[#1f1814]">{saveMessage}</p>}
            {saveError && <p className="text-sm font-medium text-[#b97fd6]">{saveError}</p>}
          </div>
          <DashboardAction onClick={() => void handleSave()} tone="dark">
            Save settings
          </DashboardAction>
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

function ImageUploadField({
  label,
  description,
  value,
  onChange,
  className = '',
  shape = 'square',
}: {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  className?: string
  shape?: 'square' | 'circle'
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const uploaded = await uploadImage(file)
      onChange(uploaded.url)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <Field label={label} description={description} className={className}>
      <div className="rounded-[24px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
        <div className="flex items-start gap-4">
          <div
            className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden border-[2px] border-[#2c211b] bg-[#fffaf4] ${
              shape === 'circle' ? 'rounded-full' : 'rounded-[22px]'
            }`}
          >
            {value ? (
              <img alt="" className="h-full w-full object-cover" src={value} />
            ) : (
              <Upload className="h-6 w-6 text-[#b97fd6]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#1f1814]">{value ? 'Uploaded image' : 'No image uploaded yet'}</p>
            <p className="mt-1 text-xs leading-5 text-[#6b625a]">
              {isUploading ? 'Uploading image...' : 'Choose a PNG, JPG, or WebP file.'}
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-full border-[2px] border-[#2c211b] bg-[#d2e5ff] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#1f1814] shadow-[4px_4px_12px_rgba(45,33,26,0.04)]">
              <input className="sr-only" accept="image/*" onChange={handleFileChange} type="file" />
              {isUploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
            </label>
            {value && (
              <button
                className="ml-3 mt-3 inline-flex items-center justify-center rounded-full border-[2px] border-[#2c211b] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#1f1814] shadow-[4px_4px_12px_rgba(45,33,26,0.04)]"
                onClick={() => onChange('')}
                type="button"
              >
                Remove
              </button>
            )}
            {error && <p className="mt-3 text-xs font-medium text-[#b97fd6]">{error}</p>}
          </div>
        </div>
      </div>
    </Field>
  )
}

function ProjectModal({
  initial,
  settings,
  onCancel,
  onDelete,
  onSave,
}: {
  initial?: Project
  settings?: UserSettings | null
  onCancel: () => void
  onDelete?: () => Promise<boolean>
  onSave: (values: ProjectFormValues) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? initial?.tagline ?? '')
  const [targetAudience, setTargetAudience] = useState(initial?.targetAudience ?? '')
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'Planning')
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? '')
  const [demoUrl, setDemoUrl] = useState(initial?.demoUrl ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '')
  const [launchPlatforms, setLaunchPlatforms] = useState<PlatformName[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function toggleLaunchPlatform(platform: PlatformName) {
    setLaunchPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave({
        project: {
          name,
          description,
          targetAudience,
          goal,
          status,
          repoUrl: repoUrl || null,
          demoUrl: demoUrl || null,
          logoUrl: logoUrl || null,
        },
        launchPlatforms,
      })
      onCancel()
    } catch {
      // The parent surfaces the error message; keep the modal open for fixes.
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProject() {
    if (!onDelete) return
    setDeleting(true)
    try {
      const deleted = await onDelete()
      if (deleted) onCancel()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal title={initial ? 'Edit project' : 'Create project'} onClose={onCancel}>
      <form className="mt-6 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
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
          <ImageUploadField
            className="md:col-span-2"
            description="Upload the project logo or brand asset."
            label="Logo image"
            onChange={setLogoUrl}
            value={logoUrl}
          />
          {!initial && (
            <div className="md:col-span-2 rounded-[28px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-5 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#7ea8ff]">Launch accounts</p>
              <p className="mt-2 text-sm leading-6 text-[#5f554a]">
                Choose the social accounts to prepare now. Username defaults from the project name, and the rest comes from your saved settings and project details.
              </p>
              <div className="mt-4">
                <PlatformChooser selected={launchPlatforms} onToggle={toggleLaunchPlatform} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#6b625a]">
                {settings
                  ? `Saved settings: ${settings.supportEmail || settings.websiteUrl || 'ready'}`
                  : 'Load settings to reuse contact defaults during account creation.'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {initial && onDelete && (
              <button
                className={dangerLink}
                disabled={saving || deleting}
                type="button"
                onClick={() => void handleDeleteProject()}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting…' : 'Delete project'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button className={secondaryLink} type="button" onClick={onCancel} disabled={saving || deleting}>
              Cancel
            </button>
            <button
              className="rounded-full border-[2px] border-[#2c211b] bg-[#2c211b] px-5 py-3 text-sm font-black text-[#fffaf4] shadow-[6px_6px_16px_rgba(45,33,26,0.06)] disabled:opacity-60"
              disabled={saving || deleting}
              type="submit"
            >
              {saving ? 'Saving…' : 'Save project'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function Modal({
  title,
  onClose,
  children,
  className = 'max-w-4xl',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c211b]/45 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-[34px] border-[2px] border-[#2c211b] bg-[#fffaf4] p-6 shadow-[14px_14px_24px_rgba(45,33,26,0.08)] ${className}`}>
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
      className={`inline-flex max-w-[10rem] items-center justify-center rounded-full border-[2px] border-[#2c211b] px-2.5 py-1 text-center text-[10px] font-black uppercase tracking-[0.16em] leading-tight break-words sm:px-3 sm:text-[11px] sm:tracking-[0.2em] ${statusTone(status)}`}
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

function SessionCard({ session }: { session: AutomationSession }) {
  return (
    <div className="rounded-[24px] border-[2px] border-[#2c211b] bg-white p-4 shadow-[6px_6px_16px_rgba(45,33,26,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b97fd6]">{session.platform}</p>
          <p className="mt-2 font-black text-[#1f1814]">{session.step}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <div className="mt-4">
        <ProgressBar value={session.progress} />
      </div>
      <div className="mt-3 grid gap-2 text-sm text-[#5f554a] sm:grid-cols-2">
        <p>Project: {session.projectId}</p>
        <p>Updated: {formatDate(session.updatedAt)}</p>
      </div>
    </div>
  )
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
const dangerLink =
  'inline-flex items-center justify-center gap-2 rounded-full border-[2px] border-[#b83d3d] bg-[#fff1f1] px-4 py-3 text-sm font-black text-[#8a1d1d] shadow-[6px_6px_16px_rgba(45,33,26,0.04)] transition hover:bg-[#ffe5e5] disabled:cursor-not-allowed disabled:opacity-60'

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function normalizeHandle(value: string) {
  const handle = value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)
  return handle ? `@${handle}` : ''
}

function calculateLaunchProgress(project: Project, campaigns: Campaign[], automationSessions: AutomationSession[]) {
  const hasCampaign = campaigns.some((campaign) => campaign.projectId === project.id)
  const hasAutomation = automationSessions.some((session) => session.projectId === project.id)
  const baseProgress = Number.isFinite(project.progress) ? project.progress : 0
  const statusProgress = project.status === 'Launched' ? 100 : project.status === 'Active' ? 45 : project.status === 'Paused' ? 35 : 15
  const milestoneProgress = (hasCampaign ? 25 : 0) + (hasAutomation ? 25 : 0)

  return Math.min(100, Math.max(baseProgress, statusProgress + milestoneProgress))
}

function formatDate(value?: string) {
  if (!value) return 'Today'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

export default App
