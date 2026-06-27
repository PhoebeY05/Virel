import './App.css'
import { useState } from 'react'

type Platform =
  | 'instagram'
  | 'facebook'
  | 'x'
  | 'reddit'
  | 'linkedin'
  | 'tiktok'
  | 'xiaohongshu'
  | 'producthunt'

const platforms: Platform[] = [
  'reddit',
  'instagram',
  'x',
  'facebook',
  'linkedin',
  'tiktok',
  'xiaohongshu',
  'producthunt',
]

function App() {
  const [platform, setPlatform] = useState<Platform>('reddit')
  const [status, setStatus] = useState('Idle')
  const [isLaunching, setIsLaunching] = useState(false)

  async function launchAutomationTest() {
    setIsLaunching(true)
    setStatus('Starting automation...')

    try {
      const response = await fetch('http://localhost:8000/automation/test-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          email: 'team@example.com',
          username: 'vireltestproject',
          password: 'ChangeMe123!',
          displayName: 'Virel Test Project',
          bio: 'Testing Virel guided account setup.',
          holdMs: 300000,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail ?? 'Automation failed to start')
      }

      setStatus(`${data.message} PID: ${data.pid}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">Virel automation</p>
          <h1>Test account setup from the UI</h1>
          <p>
            Launch a guided Playwright browser for one platform using sample project branding.
          </p>
        </div>

        <div className="panel">
          <label htmlFor="platform">Platform</label>
          <select
            id="platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
          >
            {platforms.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>

          <button type="button" onClick={launchAutomationTest} disabled={isLaunching}>
            {isLaunching ? 'Launching...' : 'Launch test browser'}
          </button>

          <div className="status" aria-live="polite">
            {status}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
