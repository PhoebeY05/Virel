import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getAnalytics } from './services/analytics'
import { connectPlatform, disconnectPlatform, getPlatforms } from './services/automation'
import { generateCampaign, getCampaigns } from './services/campaigns'
import { createProject, deleteProject, getProjects, updateProject } from './services/projects'
import { platformNames } from './mocks/data'
import { useAsync } from './hooks/useAsync'
import type {
  Analytics,
  Campaign,
  CampaignDay,
  GeneratedPost,
  Platform,
  PlatformName,
  Project,
  ProjectStatus,
} from './types'
import './App.css'

type View =
  | 'Landing'
  | 'Dashboard'
  | 'Projects'
  | 'Builder'
  | 'Calendar'
  | 'Posts'
  | 'Analytics'
  | 'Automation'
  | 'Settings'

const navItems: View[] = [
  'Landing',
  'Dashboard',
  'Projects',
  'Builder',
  'Calendar',
  'Posts',
  'Analytics',
  'Automation',
  'Settings',
]

const statusOptions: ProjectStatus[] = ['Planning', 'Active', 'Paused', 'Launched']

function App() {
  const [view, setView] = useState<View>('Landing')

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} />
      <main className="main-area">
        <Navbar view={view} setView={setView} />
        {view === 'Landing' && <LandingPage setView={setView} />}
        {view === 'Dashboard' && <DashboardPage setView={setView} />}
        {view === 'Projects' && <ProjectsPage />}
        {view === 'Builder' && <CampaignBuilderPage setView={setView} />}
        {view === 'Calendar' && <CampaignCalendarPage />}
        {view === 'Posts' && <GeneratedPostsPage />}
        {view === 'Analytics' && <AnalyticsPage />}
        {view === 'Automation' && <AutomationPage />}
        {view === 'Settings' && <SettingsPage />}
      </main>
    </div>
  )
}

function Sidebar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('Landing')} type="button">
        <span className="brand-mark">V</span>
        <span>
          <strong>Virel</strong>
          <small>Launch studio</small>
        </span>
      </button>
      <nav className="nav-list" aria-label="Primary">
        {navItems.map((item) => (
          <button
            className={view === item ? 'nav-item active' : 'nav-item'}
            key={item}
            onClick={() => setView(item)}
            type="button"
          >
            <span className="nav-icon">{item.slice(0, 1)}</span>
            {item}
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <strong>Human-in-the-loop</strong>
        <p>Setup assistance keeps verification and signup approval with the user.</p>
      </div>
    </aside>
  )
}

function Navbar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Virel workspace</p>
        <h1>{view}</h1>
      </div>
      <div className="topbar-actions">
        <button className="ghost-button" onClick={() => setView('Automation')} type="button">
          Setup
        </button>
        <button className="primary-button" onClick={() => setView('Builder')} type="button">
          Generate
        </button>
      </div>
    </header>
  )
}

function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <div className="skeleton-grid">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  )
}

function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="state-card">
      <h3>{title}</h3>
      {action}
    </div>
  )
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="state-card error">
      <h3>{message}</h3>
      <button className="primary-button" onClick={retry} type="button">
        Retry
      </button>
    </div>
  )
}

function LandingPage({ setView }: { setView: (view: View) => void }) {
  const showcases = [
    ['Campaign brief', 'Student audience, launch goal, and selected channels align before generation.'],
    ['Generated calendar', 'Seven days of scheduled copy stay editable and reusable across channels.'],
    ['Setup assistant', 'Official branded accounts are created with guided, user-confirmed steps.'],
  ]

  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">AI marketing infrastructure for student projects</p>
          <h2>Launch every project with a campaign, not a scramble.</h2>
          <p>
            Virel helps hackathon teams and student founders create consistent branding, generated posts,
            setup guidance, and campaign analytics from one polished workspace.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setView('Dashboard')} type="button">
              Start workspace
            </button>
            <button className="ghost-button" onClick={() => setView('Automation')} type="button">
              View setup flow
            </button>
          </div>
        </div>
        <div className="product-panel">
          <div className="panel-header">
            <span>StudySnap AI</span>
            <span className="pill success">Live</span>
          </div>
          <div className="metric-row">
            <MetricCard label="Channels" value="8" />
            <MetricCard label="Posts" value="21" />
            <MetricCard label="CTR" value="7.8%" />
          </div>
          <div className="mini-calendar">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <div className="calendar-cell" key={day}>
                <strong>{day}</strong>
                <span>{index + 2} posts</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid three">
        {showcases.map(([title, body]) => (
          <article className="card" key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="wide-section">
        <PageHeader eyebrow="How it works" title="Brief, generate, schedule, measure." />
        <div className="steps">
          {['Add project', 'Choose audience', 'Generate posts', 'Assist setup'].map((step, index) => (
            <div className="step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="wide-section">
        <PageHeader eyebrow="Supported platforms" title="Built for the channels student launches use." />
        <div className="platform-cloud">
          {platformNames.map((platform) => (
            <span className="platform-chip" key={platform}>
              {platform}
            </span>
          ))}
        </div>
      </section>

      <section className="content-grid two">
        <article className="quote-card">
          "Virel made our launch feel like a real campaign before our backend was finished."
          <span>Hackathon team lead</span>
        </article>
        <article className="quote-card">
          "The setup assistant kept our project identity consistent without touching personal accounts."
          <span>Student founder</span>
        </article>
      </section>
      <footer className="footer">Virel keeps account creation assisted, compliant, and user controlled.</footer>
    </div>
  )
}

function DashboardPage({ setView }: { setView: (view: View) => void }) {
  const projectsState = useAsync(getProjects)
  const analyticsState = useAsync(getAnalytics)
  const projects = projectsState.data ?? []
  const analytics = analyticsState.data

  if (projectsState.isLoading || analyticsState.isLoading) return <LoadingSkeleton />
  if (projectsState.error) return <ErrorState message={projectsState.error} retry={projectsState.retry} />
  if (analyticsState.error) return <ErrorState message={analyticsState.error} retry={analyticsState.retry} />
  if (!analytics) return <EmptyState title="No dashboard data yet." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Overview" title="Campaign health at a glance.">
        <button className="primary-button" onClick={() => setView('Projects')} type="button">
          Manage projects
        </button>
      </PageHeader>
      <div className="metric-row">
        <MetricCard label="Active campaigns" value={analytics.summary.activeCampaigns.toString()} />
        <MetricCard label="Total projects" value={analytics.summary.totalProjects.toString()} />
        <MetricCard label="Engagement" value={formatNumber(analytics.summary.engagement)} />
        <MetricCard label="CTR" value={`${analytics.summary.ctr}%`} />
      </div>
      <div className="content-grid two">
        <section className="card">
          <h3>Recent campaigns</h3>
          <div className="list-stack">
            {projects.slice(0, 4).map((project) => (
              <ProjectRow project={project} key={project.id} />
            ))}
          </div>
        </section>
        <section className="card">
          <h3>Analytics preview</h3>
          <BarChart points={analytics.timeline.map((point) => ({ label: point.label, value: point.engagement }))} />
        </section>
      </div>
      <section className="quick-actions">
        {['Create project', 'Generate campaign', 'Review calendar', 'Run setup assistant'].map((action) => (
          <button className="action-tile" key={action} onClick={() => setView(action.includes('setup') ? 'Automation' : 'Builder')} type="button">
            {action}
          </button>
        ))}
      </section>
    </div>
  )
}

function ProjectsPage() {
  const { data, setData, isLoading, error, retry } = useAsync(getProjects)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'All'>('All')
  const [editing, setEditing] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const projects = data ?? []
  const filtered = projects.filter((project) => {
    const matchesQuery = `${project.name} ${project.tagline}`.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = status === 'All' || project.status === status
    return matchesQuery && matchesStatus
  })

  async function saveProject(input: ProjectFormValues) {
    if (editing) {
      const updated = await updateProject(editing.id, input)
      setData(projects.map((project) => (project.id === updated.id ? updated : project)))
      setEditing(null)
      return
    }
    const created = await createProject(input)
    setData([created, ...projects])
    setIsCreating(false)
  }

  async function removeProject(id: string) {
    await deleteProject(id)
    setData(projects.filter((project) => project.id !== id))
  }

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} retry={retry} />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Projects" title="Manage branded student launches.">
        <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
          New project
        </button>
      </PageHeader>
      <div className="toolbar">
        <input aria-label="Search projects" placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | 'All')}>
          <option>All</option>
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No projects match the current filters." />
      ) : (
        <div className="project-grid">
          {filtered.map((project) => (
            <ProjectCard project={project} key={project.id} onDelete={removeProject} onEdit={setEditing} />
          ))}
        </div>
      )}
      {(isCreating || editing) && (
        <ProjectForm
          initial={editing ?? undefined}
          onCancel={() => {
            setEditing(null)
            setIsCreating(false)
          }}
          onSave={saveProject}
        />
      )}
    </div>
  )
}

interface ProjectFormValues {
  name: string
  tagline: string
  status: ProjectStatus
  platforms: PlatformName[]
}

function ProjectForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: Project
  onCancel: () => void
  onSave: (values: ProjectFormValues) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'Planning')
  const [platforms, setPlatforms] = useState<PlatformName[]>(initial?.platforms ?? ['Instagram', 'Reddit'])

  function togglePlatform(platform: PlatformName) {
    setPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    )
  }

  return (
    <div className="dialog-backdrop">
      <form
        className="dialog"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave({ name, tagline, status, platforms })
        }}
      >
        <h3>{initial ? 'Edit project' : 'Create project'}</h3>
        <label>
          Name
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Tagline
          <textarea required rows={3} value={tagline} onChange={(event) => setTagline(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
            {statusOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <PlatformSelector selected={platforms} togglePlatform={togglePlatform} />
        <div className="dialog-actions">
          <button className="ghost-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function CampaignBuilderPage({ setView }: { setView: (view: View) => void }) {
  const { data, isLoading, error, retry } = useAsync(getProjects)
  const [selectedProject, setSelectedProject] = useState('proj-1')
  const [audience, setAudience] = useState('College students launching side projects')
  const [goal, setGoal] = useState('Drive waitlist signups')
  const [platforms, setPlatforms] = useState<PlatformName[]>(['Instagram', 'Reddit', 'Product Hunt'])
  const [generated, setGenerated] = useState<Campaign | null>(null)
  const projects = data ?? []
  const project = projects.find((item) => item.id === selectedProject) ?? projects[0]

  async function submitCampaign() {
    if (!project) return
    const campaign = await generateCampaign({
      projectId: project.id,
      projectName: project.name,
      audience,
      goal,
      platforms,
    })
    setGenerated(campaign)
  }

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} retry={retry} />
  if (!project) return <EmptyState title="Create a project before generating a campaign." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Campaign builder" title="Generate a launch plan in one focused pass." />
      <div className="builder-layout">
        <section className="card form-card">
          <label>
            Project
            <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)}>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target audience
            <input value={audience} onChange={(event) => setAudience(event.target.value)} />
          </label>
          <label>
            Goal
            <input value={goal} onChange={(event) => setGoal(event.target.value)} />
          </label>
          <PlatformSelector
            selected={platforms}
            togglePlatform={(platform) =>
              setPlatforms((current) =>
                current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
              )
            }
          />
          <button className="primary-button" onClick={() => void submitCampaign()} type="button">
            Generate campaign
          </button>
        </section>
        <section className="card">
          <h3>Generated campaign</h3>
          {generated ? (
            <CampaignPreview campaign={generated} setView={setView} />
          ) : (
            <EmptyState title="Your campaign preview will appear here." />
          )}
        </section>
      </div>
    </div>
  )
}

function CampaignCalendarPage() {
  const { data, isLoading, error, retry } = useAsync(getCampaigns)
  const [days, setDays] = useState<CampaignDay[] | null>(null)
  const campaign = data?.[0]
  const visibleDays = days ?? campaign?.days ?? []

  function moveDay(from: number, to: number) {
    if (to < 0 || to >= visibleDays.length) return
    const next = [...visibleDays]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDays(next.map((day, index) => ({ ...day, day: index + 1 })))
  }

  function updateDay(id: string, content: string) {
    setDays(visibleDays.map((day) => (day.id === id ? { ...day, content } : day)))
  }

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} retry={retry} />
  if (!campaign) return <EmptyState title="No campaign calendar has been generated yet." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Calendar" title={campaign.name} />
      <div className="timeline">
        {visibleDays.map((day, index) => (
          <CampaignDayCard
            day={day}
            key={day.id}
            moveDown={() => moveDay(index, index + 1)}
            moveUp={() => moveDay(index, index - 1)}
            updateContent={(content) => updateDay(day.id, content)}
          />
        ))}
      </div>
    </div>
  )
}

function GeneratedPostsPage() {
  const { data, isLoading, error, retry } = useAsync(getCampaigns)
  const [posts, setPosts] = useState<GeneratedPost[] | null>(null)
  const visiblePosts = posts ?? data?.[0]?.posts ?? []

  function updatePost(id: string, content: string) {
    setPosts(visiblePosts.map((post) => (post.id === id ? { ...post, content } : post)))
  }

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} retry={retry} />
  if (visiblePosts.length === 0) return <EmptyState title="No generated posts yet." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Generated posts" title="Preview and refine each channel." />
      <div className="post-grid">
        {visiblePosts.map((post) => (
          <PostCard post={post} key={post.id} updatePost={updatePost} />
        ))}
      </div>
    </div>
  )
}

function AnalyticsPage() {
  const { data, isLoading, error, retry } = useAsync(getAnalytics)

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} retry={retry} />
  if (!data) return <EmptyState title="Analytics will appear after a campaign runs." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Analytics" title="Measure campaign performance." />
      <div className="metric-row">
        <MetricCard label="Likes" value={formatNumber(sum(data.timeline.map((point) => point.likes)))} />
        <MetricCard label="Comments" value={formatNumber(sum(data.timeline.map((point) => point.comments)))} />
        <MetricCard label="Shares" value={formatNumber(sum(data.timeline.map((point) => point.shares)))} />
        <MetricCard label="CTR" value={`${data.summary.ctr}%`} />
      </div>
      <div className="content-grid two">
        <section className="card">
          <h3>Engagement over time</h3>
          <BarChart points={data.timeline.map((point) => ({ label: point.label, value: point.engagement }))} />
        </section>
        <section className="card">
          <h3>Platform comparison</h3>
          <PlatformComparison analytics={data} />
        </section>
      </div>
      <section className="card">
        <h3>Top performing posts</h3>
        <table>
          <thead>
            <tr>
              <th>Post</th>
              <th>Platform</th>
              <th>Engagement</th>
              <th>CTR</th>
            </tr>
          </thead>
          <tbody>
            {data.topPosts.map((post) => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>{post.platform}</td>
                <td>{formatNumber(post.engagement)}</td>
                <td>{post.ctr}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function AutomationPage() {
  const { data, setData, isLoading, error, retry } = useAsync(getPlatforms)
  const platforms = data ?? []

  async function connect(id: string) {
    const updated = await connectPlatform(id)
    setData(platforms.map((platform) => (platform.id === id ? updated : platform)))
  }

  async function disconnect(id: string) {
    const updated = await disconnectPlatform(id)
    setData(platforms.map((platform) => (platform.id === id ? updated : platform)))
  }

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} retry={retry} />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Automation" title="Manage official branded account setup." />
      <div className="automation-grid">
        {platforms.map((platform) => (
          <PlatformCard platform={platform} key={platform.id} onConnect={connect} onDisconnect={disconnect} />
        ))}
      </div>
    </div>
  )
}

function SettingsPage() {
  const [theme, setTheme] = useState('System')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [tone, setTone] = useState('Confident and helpful')

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Settings" title="Tune the workspace for the launch team." />
      <div className="settings-grid">
        <SettingsPanel title="Profile">
          <label>
            Name
            <input defaultValue="Avery Chen" />
          </label>
          <label>
            Email
            <input defaultValue="avery@virel.local" />
          </label>
        </SettingsPanel>
        <SettingsPanel title="Theme">
          <div className="segmented">
            {['System', 'Light', 'Dark'].map((option) => (
              <button className={theme === option ? 'active' : ''} key={option} onClick={() => setTheme(option)} type="button">
                {option}
              </button>
            ))}
          </div>
        </SettingsPanel>
        <SettingsPanel title="Notifications">
          <label className="toggle-row">
            <input checked={emailAlerts} onChange={(event) => setEmailAlerts(event.target.checked)} type="checkbox" />
            Email campaign summaries
          </label>
        </SettingsPanel>
        <SettingsPanel title="AI settings">
          <label>
            Brand tone
            <input value={tone} onChange={(event) => setTone(event.target.value)} />
          </label>
        </SettingsPanel>
        <SettingsPanel title="Connected accounts">
          <p>Instagram, Reddit, and Discord are ready for assisted publishing workflows.</p>
        </SettingsPanel>
        <SettingsPanel title="Danger zone">
          <button className="danger-button" type="button">
            Archive workspace
          </button>
        </SettingsPanel>
      </div>
    </div>
  )
}

function SettingsPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card settings-panel">
      <h3>{title}</h3>
      {children}
    </section>
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
    <article className="card project-card">
      <div className="card-title-row">
        <h3>{project.name}</h3>
        <span className={`pill ${project.status.toLowerCase()}`}>{project.status}</span>
      </div>
      <p>{project.tagline}</p>
      <div className="platform-line">{project.platforms.join(' / ')}</div>
      <ProgressBar value={project.progress} />
      <div className="card-footer">
        <span>Updated {project.lastUpdated}</span>
        <div>
          <button className="tiny-button" onClick={() => onEdit(project)} type="button">
            Edit
          </button>
          <button className="tiny-button danger" onClick={() => void onDelete(project.id)} type="button">
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <div className="row-item">
      <span>
        <strong>{project.name}</strong>
        <small>{project.platforms.slice(0, 3).join(', ')}</small>
      </span>
      <span className="pill">{project.progress}%</span>
    </div>
  )
}

function PlatformCard({
  platform,
  onConnect,
  onDisconnect,
}: {
  platform: Platform
  onConnect: (id: string) => Promise<void>
  onDisconnect: (id: string) => Promise<void>
}) {
  return (
    <article className="card platform-card">
      <div className="card-title-row">
        <h3>{platform.name}</h3>
        <span className={`pill ${platform.status.toLowerCase().replace(' ', '-')}`}>{platform.status}</span>
      </div>
      <p>{platform.username}</p>
      <div className="info-list">
        <span>{platform.automation}</span>
        <span>{platform.phoneRequired ? 'Phone may be required' : 'Email setup friendly'}</span>
      </div>
      <div className="button-row">
        <button className="primary-button" onClick={() => void onConnect(platform.id)} type="button">
          {platform.status === 'Connected' ? 'Reconnect' : 'Connect'}
        </button>
        <button className="ghost-button" onClick={() => void onDisconnect(platform.id)} type="button">
          Disconnect
        </button>
        <button className="ghost-button" type="button">
          Run setup assistant
        </button>
      </div>
    </article>
  )
}

function CampaignPreview({ campaign, setView }: { campaign: Campaign; setView: (view: View) => void }) {
  return (
    <div className="preview-stack">
      <div className="card-title-row">
        <h4>{campaign.name}</h4>
        <span className="pill">{campaign.status}</span>
      </div>
      <p>{campaign.goal}</p>
      <div className="platform-line">{campaign.platforms.join(' / ')}</div>
      <div className="mini-calendar">
        {campaign.days.map((day) => (
          <div className="calendar-cell" key={day.id}>
            <strong>Day {day.day}</strong>
            <span>{day.title}</span>
          </div>
        ))}
      </div>
      <button className="primary-button" onClick={() => setView('Calendar')} type="button">
        Review calendar
      </button>
    </div>
  )
}

function CampaignDayCard({
  day,
  moveDown,
  moveUp,
  updateContent,
}: {
  day: CampaignDay
  moveDown: () => void
  moveUp: () => void
  updateContent: (content: string) => void
}) {
  return (
    <article className="card timeline-card" draggable>
      <div className="day-badge">Day {day.day}</div>
      <div className="timeline-body">
        <div className="card-title-row">
          <h3>{day.title}</h3>
          <span className="pill">{day.status}</span>
        </div>
        <p>{day.platforms.join(' / ')}</p>
        <textarea value={day.content} onChange={(event) => updateContent(event.target.value)} rows={3} />
        <div className="card-footer">
          <span>{day.scheduledTime}</span>
          <div>
            <button className="tiny-button" onClick={moveUp} type="button">
              Up
            </button>
            <button className="tiny-button" onClick={moveDown} type="button">
              Down
            </button>
            <button className="tiny-button" onClick={() => updateContent(`${day.content} Fresh hook regenerated.`)} type="button">
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function PostCard({ post, updatePost }: { post: GeneratedPost; updatePost: (id: string, content: string) => void }) {
  const [copied, setCopied] = useState(false)

  async function copyPost() {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <article className="card post-card">
      <div className="card-title-row">
        <h3>{post.platform}</h3>
        <span className="pill">{post.engagementEstimate}% fit</span>
      </div>
      <strong>{post.title}</strong>
      <textarea value={post.content} onChange={(event) => updatePost(post.id, event.target.value)} rows={6} />
      <div className="button-row">
        <button className="ghost-button" onClick={() => void copyPost()} type="button">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button className="ghost-button" onClick={() => updatePost(post.id, `${post.content} Updated with a sharper call to action.`)} type="button">
          Regenerate
        </button>
      </div>
    </article>
  )
}

function PlatformSelector({
  selected,
  togglePlatform,
}: {
  selected: PlatformName[]
  togglePlatform: (platform: PlatformName) => void
}) {
  return (
    <div className="selector-group">
      <span>Platforms</span>
      <div className="platform-cloud">
        {platformNames.map((platform) => (
          <button
            className={selected.includes(platform) ? 'platform-chip selected' : 'platform-chip'}
            key={platform}
            onClick={() => togglePlatform(platform)}
            type="button"
          >
            {platform}
          </button>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" aria-label={`${value}% complete`}>
      <span style={{ width: `${value}%` }} />
    </div>
  )
}

function BarChart({ points }: { points: { label: string; value: number }[] }) {
  const max = useMemo(() => Math.max(...points.map((point) => point.value), 1), [points])
  return (
    <div className="bar-chart">
      {points.map((point) => (
        <div className="bar-column" key={point.label}>
          <span style={{ height: `${(point.value / max) * 100}%` }} />
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  )
}

function PlatformComparison({ analytics }: { analytics: Analytics }) {
  const max = Math.max(...analytics.platforms.map((platform) => platform.engagement), 1)
  return (
    <div className="comparison-list">
      {analytics.platforms.map((platform) => (
        <div className="comparison-row" key={platform.platform}>
          <div>
            <strong>{platform.platform}</strong>
            <small>{platform.growth}% growth</small>
          </div>
          <ProgressBar value={(platform.engagement / max) * 100} />
        </div>
      ))}
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: value > 9999 ? 'compact' : 'standard' }).format(value)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function SettingsPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card settings-panel">
      <h3>{title}</h3>
      {children}
    </section>
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
    <article className="card project-card">
      <div className="card-title-row">
        <h3>{project.name}</h3>
        <span className={`pill ${project.status.toLowerCase()}`}>{project.status}</span>
      </div>
      <p>{project.tagline}</p>
      <div className="platform-line">{project.platforms.join(' / ')}</div>
      <ProgressBar value={project.progress} />
      <div className="card-footer">
        <span>Updated {project.lastUpdated}</span>
        <div>
          <button className="tiny-button" onClick={() => onEdit(project)} type="button">
            Edit
          </button>
          <button className="tiny-button danger" onClick={() => void onDelete(project.id)} type="button">
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <div className="row-item">
      <span>
        <strong>{project.name}</strong>
        <small>{project.platforms.slice(0, 3).join(', ')}</small>
      </span>
      <span className="pill">{project.progress}%</span>
    </div>
  )
}

function PlatformCard({
  platform,
  onConnect,
  onDisconnect,
}: {
  platform: Platform
  onConnect: (id: string) => Promise<void>
  onDisconnect: (id: string) => Promise<void>
}) {
  return (
    <article className="card platform-card">
      <div className="card-title-row">
        <h3>{platform.name}</h3>
        <span className={`pill ${platform.status.toLowerCase().replace(' ', '-')}`}>{platform.status}</span>
      </div>
      <p>{platform.username}</p>
      <div className="info-list">
        <span>{platform.automation}</span>
        <span>{platform.phoneRequired ? 'Phone may be required' : 'Email setup friendly'}</span>
      </div>
      <div className="button-row">
        <button className="primary-button" onClick={() => void onConnect(platform.id)} type="button">
          {platform.status === 'Connected' ? 'Reconnect' : 'Connect'}
        </button>
        <button className="ghost-button" onClick={() => void onDisconnect(platform.id)} type="button">
          Disconnect
        </button>
        <button className="ghost-button" type="button">
          Run setup assistant
        </button>
      </div>
    </article>
  )
}

function CampaignPreview({ campaign, setView }: { campaign: Campaign; setView: (view: View) => void }) {
  return (
    <div className="preview-stack">
      <div className="card-title-row">
        <h4>{campaign.name}</h4>
        <span className="pill">{campaign.status}</span>
      </div>
      <p>{campaign.goal}</p>
      <div className="platform-line">{campaign.platforms.join(' / ')}</div>
      <div className="mini-calendar">
        {campaign.days.map((day) => (
          <div className="calendar-cell" key={day.id}>
            <strong>Day {day.day}</strong>
            <span>{day.title}</span>
          </div>
        ))}
      </div>
      <button className="primary-button" onClick={() => setView('Calendar')} type="button">
        Review calendar
      </button>
    </div>
  )
}

function CampaignDayCard({
  day,
  moveDown,
  moveUp,
  updateContent,
}: {
  day: CampaignDay
  moveDown: () => void
  moveUp: () => void
  updateContent: (content: string) => void
}) {
  return (
    <article className="card timeline-card" draggable>
      <div className="day-badge">Day {day.day}</div>
      <div className="timeline-body">
        <div className="card-title-row">
          <h3>{day.title}</h3>
          <span className="pill">{day.status}</span>
        </div>
        <p>{day.platforms.join(' / ')}</p>
        <textarea value={day.content} onChange={(event) => updateContent(event.target.value)} rows={3} />
        <div className="card-footer">
          <span>{day.scheduledTime}</span>
          <div>
            <button className="tiny-button" onClick={moveUp} type="button">
              Up
            </button>
            <button className="tiny-button" onClick={moveDown} type="button">
              Down
            </button>
            <button className="tiny-button" onClick={() => updateContent(`${day.content} Fresh hook regenerated.`)} type="button">
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function PostCard({ post, updatePost }: { post: GeneratedPost; updatePost: (id: string, content: string) => void }) {
  const [copied, setCopied] = useState(false)

  async function copyPost() {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <article className="card post-card">
      <div className="card-title-row">
        <h3>{post.platform}</h3>
        <span className="pill">{post.engagementEstimate}% fit</span>
      </div>
      <strong>{post.title}</strong>
      <textarea value={post.content} onChange={(event) => updatePost(post.id, event.target.value)} rows={6} />
      <div className="button-row">
        <button className="ghost-button" onClick={() => void copyPost()} type="button">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button className="ghost-button" onClick={() => updatePost(post.id, `${post.content} Updated with a sharper call to action.`)} type="button">
          Regenerate
        </button>
      </div>
    </article>
  )
}

function PlatformSelector({
  selected,
  togglePlatform,
}: {
  selected: PlatformName[]
  togglePlatform: (platform: PlatformName) => void
}) {
  return (
    <div className="selector-group">
      <span>Platforms</span>
      <div className="platform-cloud">
        {platformNames.map((platform) => (
          <button
            className={selected.includes(platform) ? 'platform-chip selected' : 'platform-chip'}
            key={platform}
            onClick={() => togglePlatform(platform)}
            type="button"
          >
            {platform}
          </button>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" aria-label={`${value}% complete`}>
      <span style={{ width: `${value}%` }} />
    </div>
  )
}

function BarChart({ points }: { points: { label: string; value: number }[] }) {
  const max = useMemo(() => Math.max(...points.map((point) => point.value), 1), [points])
  return (
    <div className="bar-chart">
      {points.map((point) => (
        <div className="bar-column" key={point.label}>
          <span style={{ height: `${(point.value / max) * 100}%` }} />
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  )
}

function PlatformComparison({ analytics }: { analytics: Analytics }) {
  const max = Math.max(...analytics.platforms.map((platform) => platform.engagement), 1)
  return (
    <div className="comparison-list">
      {analytics.platforms.map((platform) => (
        <div className="comparison-row" key={platform.platform}>
          <div>
            <strong>{platform.platform}</strong>
            <small>{platform.growth}% growth</small>
          </div>
          <ProgressBar value={(platform.engagement / max) * 100} />
        </div>
      ))}
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: value > 9999 ? 'compact' : 'standard' }).format(value)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export default App
