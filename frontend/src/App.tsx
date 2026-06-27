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

const manualGuidance: Partial<Record<Platform, string>> = {
  reddit:
    'Reddit may block automated signup browsers. Create or sign in to the Reddit account manually in your normal browser, then return to Virel for campaign setup.',
  linkedin:
    'LinkedIn uses stronger identity checks. Use your normal browser to sign up with Google, then return to Virel for branding and campaign setup.',
  xiaohongshu:
    'Xiaohongshu usually requires phone and regional verification. Complete signup manually, then return to Virel for branding and campaign setup.',
}

function App() {
  const [platform, setPlatform] = useState<Platform>('reddit')
  const [status, setStatus] = useState('Idle')
  const [isLaunching, setIsLaunching] = useState(false)

  async function launchAutomationTest() {
    const guidance = manualGuidance[platform]
    if (guidance) {
      setStatus(guidance)
      return
    }

    setIsLaunching(true)
    setStatus('Starting automation...')

    try {
      const response = await fetch('http://localhost:8000/automation/test-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          email: 'team@example.com',
          signupMethod: 'google',
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

      setStatus(`${data.message} PID: ${data.pid}${data.logPath ? ` Log: ${data.logPath}` : ''}`)
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
            {isLaunching ? 'Launching...' : manualGuidance[platform] ? 'Show manual guidance' : 'Launch Google sign-up'}
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
