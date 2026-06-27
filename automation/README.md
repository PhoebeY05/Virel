# Virel Automation Service

Playwright-powered browser automation for guided project account setup and campaign publishing.

## What This Service Does

- Opens official platform signup/login/profile pages.
- Reuses saved browser sessions from `storage-state/<platform>.json`.
- Prefills common account, profile, and post fields where possible.
- Pauses for the user when CAPTCHA, phone verification, email verification, or other security checks appear.
- Reports status back to the backend through REST APIs only.

It does not bypass CAPTCHA, verification, platform security checks, or access the database directly.

## Setup

```bash
cd automation
npm install
cp .env.example .env
npm run typecheck
```

Set `HEADLESS=false` for guided setup flows. Use `SLOW_MO_MS=150` or higher for demos.

## Commands

Run with direct JSON:

```bash
npm run setup -- '{"projectId":"p1","accountId":"a1","platform":"reddit","email":"team@example.com","password":"example-password","displayName":"StudySnap AI","username":"studysnapai","bio":"Launch better study sessions with AI."}'
```

```bash
npm run publish -- '{"projectId":"p1","accountId":"a1","platform":"x","displayName":"StudySnap AI","username":"studysnapai"}' '{"campaignId":"c1","postId":"post1","accountId":"a1","platform":"x","text":"We just launched StudySnap AI."}'
```

Run from backend-owned data:

```bash
npm run dev -- setup-from-backend <projectId> <platform>
npm run dev -- publish-from-backend <projectId> <campaignId> <platform>
```

## Platform Contract

Each adapter implements:

```ts
interface PlatformAdapter {
  login(): Promise<void>;
  createAccount(): Promise<void>;
  fillProfile(): Promise<void>;
  publishPost(post: Post): Promise<void>;
  logout(): Promise<void>;
  saveSession(): Promise<void>;
  restoreSession(): Promise<boolean>;
}
```

Add platform-specific behavior in `src/platforms/<platform>.ts`. Keep business logic in the backend; adapters should only automate browser actions.
