# Launch checklist

Everything code-side is done and env-gated. This file is the ordered list of
steps that need **your accounts** — each one activates a feature that is
already built and waiting for a key.

## 1. Deploy the API (~20 min) — unblocks everything else

The API has a `Dockerfile`, `/health` with a DB check, and all migrations
applied to Neon already.

```bash
cd forum-api
# Railway (simplest):
npm i -g @railway/cli && railway login
railway init          # create project "forum-api"
railway up            # builds the Dockerfile and deploys
```

Then in the Railway dashboard set the environment variables (copy values
from your local `forum-api/.env`, they already point at Neon):

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Neon connection string (already in `.env`) |
| `JWT_SECRET` | same value as local — **or** rotate it (logs everyone out) |
| `OPENAI_API_KEY` | your OpenAI key |
| `INGEST_INTERVAL_MINUTES` | `60` — news refresh runs in-process |
| `AI_DAILY_LIMIT` | `50` (forumAI chats per user per day) |

Verify: `curl https://<your-app>.up.railway.app/health` → `{"status":"ok","db":"ok"}`.

Point the app at it: put `EXPO_PUBLIC_API_URL=https://<your-app>.up.railway.app`
in `forum/.env` **and** replace `https://YOUR-DEPLOYED-API.example.com` in
`forum/eas.json` (preview + production profiles).

## 2. R2 image storage (~10 min)

Uploads currently write to the server's disk, which is wiped on redeploy.
Create an R2 bucket (Cloudflare dashboard → R2 → Create bucket `forum-media`
→ Settings → enable public access), create an API token, then set on Railway:
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET_NAME`, `R2_PUBLIC_URL`. The upload route switches over automatically.

## 3. Resend email (~10 min)

Email verification + password reset are live but currently log emails to the
server console. Create a free account at resend.com, add + verify your
sending domain (or use their test domain first), create an API key, set on
Railway: `RESEND_API_KEY`, `EMAIL_FROM=forum <no-reply@yourdomain.com>`,
`LEGAL_CONTACT_EMAIL=you@yourdomain.com`. Emails start sending immediately.

## 4. Sentry crash reporting (~10 min, optional but recommended)

Create two projects at sentry.io (one Node, one React Native). Set
`SENTRY_DSN` on Railway, and `EXPO_PUBLIC_SENTRY_DSN` in `forum/.env` +
as an EAS secret. Both SDKs are installed and init automatically when the
DSN exists.

## 5. Apple Developer + EAS build (~1–2 h first time, mostly waiting)

Requires the $99/yr Apple Developer Program.

```bash
cd forum
npm i -g eas-cli && eas login       # free Expo account
eas init                            # writes the projectId into app.json
eas build --profile device --platform ios   # dev build for a real device
```

The dev build is Expo Go with your native modules — **push notifications
and Sentry work there** (they can't in Expo Go). Then:

```bash
eas build --profile production --platform ios
eas submit --platform ios           # uploads to App Store Connect
```

In App Store Connect fill in:
- **Privacy Policy URL**: `https://<your-api>/legal/privacy` (already live)
- **App Privacy** answers (matches the policy): collects Email, User content,
  Identifiers (push token) — all "linked to you", none used for tracking.
- **Age rating**: 17+ (user-generated content, mature themes possible)
- Reviewer notes: mention the demo login (`john@example.dev` / `password123`)
  and that reports are reviewed at Settings → Moderation with an admin account.

## 6. Android (later)

Icon mapping and adaptive icon are done; `eas build --platform android` when
ready. Do a QA pass in the emulator first (`npx expo start` → `a`).

## Already done — no action needed

- Rate limiting everywhere + per-user daily forumAI budget (`ai_usage` table)
- Email verification + reset-code flows (screens + API), Terms + Privacy at
  `/legal/*`, share pages with OG tags at `/p/:id`, `/a/:id`
- Follows + Following feed, DMs with unread badges, onboarding flow
- Push: token registration, prefs, and server sends on replies/upvotes/DMs
- Moderation: report review UI (Settings → Moderation as admin), hide/ban,
  banned-account lockout; john@example.dev is admin in dev + Neon
- Posts pagination, image resizing + EXIF strip, FTS search, spectrum cache
- Tests (scorer/limiter/hashtags) + CI workflows in both repos
- Store icon (opaque), adaptive icon, bundle IDs, `eas.json`
