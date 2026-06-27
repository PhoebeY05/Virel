## Ethical + Platform Reality (Account Strategy)

Virel creates official project-branded accounts (e.g. @StudySnapAI) for each student project so that marketing is consistent, professional, and separated from personal identities.

These accounts become the central identity of the project across platforms.

---

## Feasibility Approach: Browser-Automated Setup Assistant

Virel uses a guided browser automation system (e.g. Playwright-based assistant) to streamline account creation across platforms.

Instead of fully autonomous “bot creation”, Virel functions as a co-pilot for account setup, where the user remains in control.

The system:

- Opens official signup pages for each platform
- Pre-fills:
  - Username
  - Bio
  - Profile image
  - Branding assets
- Guides users step-by-step through verification (email / phone / CAPTCHA)
- Reduces repetitive setup work from ~10–15 minutes per platform to ~1–2 minutes
- Ensures consistent naming and branding across all platforms

---

## Human-in-the-Loop Design (Important Safeguard)

To ensure safety, compliance, and platform trust:

- Users manually confirm each signup step
- CAPTCHA and verification steps are always completed by the user
- No attempt is made to bypass anti-bot systems
- Automation is strictly used for form-filling, navigation, and setup acceleration

---

## Platform Reality Check

| Platform | Signup Flow | Phone Number Required? | Automation Feasibility |
|----------|-------------|------------------------|--------------------------|
| Instagram / Facebook | Email/phone + verification + CAPTCHA | ⚠️ Optional (phone improves trust, but not always required) | ⚠️ Assisted only (form filling + navigation) |
| X (Twitter) | Email/phone + anti-bot checks | ⚠️ Often required for full functionality / scaling accounts | ⚠️ Assisted only |
| TikTok | Phone/email + verification | ⚠️ Frequently required for stable account usage | ⚠️ Assisted only |
| Reddit | Email + CAPTCHA | ❌ Not required (email-only accounts common) | ⚠️ Partially assisted |
| LinkedIn | Strong identity verification | ⚠️ Phone often required for verification/security checks | ❌ Limited to guidance only |
| Xiaohongshu | Phone + regional verification | ✅ Required (phone-based identity system) | ❌ Guidance only |

---

## Key Constraint Insight

A major limitation in multi-platform account creation is phone number scarcity and verification constraints:

- Most platforms allow multiple email accounts
- But many platforms:
  - require unique phone numbers per account
  - use phone verification for anti-bot protection
  - restrict scaling multiple accounts per user/device

This makes fully automated mass account creation impractical and unsustainable.

---

## Design Implication for Virel

Instead of relying on unlimited automated account creation, Virel is designed around:

- Creating 1 official branded account per platform per project
- Using phone number allocation strategically only where required
- Minimizing phone dependency by prioritizing email-based platforms where possible
- Guiding users through verification rather than attempting automation bypass

This ensures Virel remains:
- scalable  
- compliant with platform constraints  
- usable for real student projects  

## Final Product Positioning

Virel is not a bot or account generator.

It is a launch infrastructure tool for student projects, combining:

- Automated setup assistance (browser automation)
- Branding consistency across platforms
- Multi-platform content generation
- Centralized campaign management after setup

---

## Key Insight

Virel removes the friction of launching a project online by acting as a setup + marketing layer, while keeping users fully in control of account creation and complying with platform verification requirements.

## Campaign Timeline
1. Pre-Launch Phase

Purpose: Build curiosity before the product is released.

This phase is about preparing the audience.

Content can include:

Content Type Purpose
Teaser posts Build interest
Problem awareness posts Show why the product is needed
Founder story Make the startup feel human
Behind-the-scenes Show progress
Waitlist posts Collect early interest
Community questions Understand what users care about

Example:

“We’re building a tool to help students manage group projects better. What’s the worst part of group work for you?”

This phase should not be too salesy. It should make people aware of the problem.

2. Launch Phase

Purpose: Announce the product and get people to take action.

This can still be your 7-day launch sprint.

Day Focus
Day 1 Official announcement
Day 2 Founder story
Day 3 Problem-solution post
Day 4 Product demo
Day 5 Feature highlight
Day 6 Community feedback / testimonial
Day 7 Strong call-to-action

This is where the campaign is most intense.

The goal is to get:

signups, beta users, product visits, feedback, or purchases.

3. Growth Loop Phase

Purpose: Keep promoting the product after launch.

This is better than calling it “post-launch” because it shows that the campaign continues.

The Growth Loop can repeat every week or month.

Weekly Activity Purpose
Share product updates Show that the product is improving
Repurpose successful posts Reuse what worked
Share user feedback Build trust
Answer FAQs Reduce doubts
Post tutorials Teach people how to use the product
Compare with alternatives Show why the product is useful
Run new campaign angles Test different styles
Re-engage users Bring people back

This phase is basically constant promotion, but smarter.