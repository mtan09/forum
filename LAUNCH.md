# TestFlight release runbook

This is the ordered release checklist for the iPhone-only forum beta. Code and
safe defaults live in git; credentials, reviewer passwords, Apple keys, Sentry
tokens, and every `.env` file do not.

External testing is intentionally blocked until a permanent domain is selected,
verified for email, and used for the final support/privacy URLs. Internal
TestFlight can begin before that gate.

## 1. Local release gate

Run from `forum-api`:

```bash
npm ci
npm run typecheck
npm test
npm audit
```

Run from `forum`:

```bash
npm ci
npx tsc --noEmit
npm run lint
npx expo-doctor
npx expo export --platform ios --output-dir /tmp/forum-ios-export
```

The native baseline is Expo SDK 57 / React Native 0.86 and iOS 16.4+. The app
is iPhone-only (`ios.supportsTablet=false`). Expo 57 currently has upstream
build/lint dependency advisories in its own current toolchain; do not use
`npm audit fix --force` or downgrade Expo to silence them. Reassess the
advisories before each release and require Expo Doctor, typecheck, lint, and
the production export to pass.

## 2. Production database and identities

1. Back up the production database.
2. Apply migration 016 once:

   ```bash
   railway run --service forum-api npm run migrate:release
   ```

3. Confirm the seeded `john@example.dev` content remains, its credentials no
   longer exist, and its admin flag is false.
4. Audit the mock corpus without deleting flagged content:

   ```bash
   railway run --service forum-api npm run audit:moderation
   ```

5. Create two new identities with `npm run account:release`:
   - an owner-only admin account;
   - a non-admin App Review account.

Supply `RELEASE_ACCOUNT_EMAIL`, `RELEASE_ACCOUNT_USERNAME`, and
`RELEASE_ACCOUNT_ROLE` only in the invoking shell. Put the generated password
directly into a password manager or App Store Connect. Never paste either
credential into docs, tickets, chat, or committed files.

Migration 016 is backward compatible: private-account fields default public,
existing follows become accepted, existing push preferences migrate, and email
delivery defaults off.

## 3. Railway services

The production project has two services from the same repository:

| Service | Start command | Schedule/restart |
|---|---|---|
| `forum-api` | `npm start` | always on; health check `/health`, 30 s timeout |
| `forum-ingest` | `npm run ingest` | cron `0 * * * *`; restart policy `Never` |

Both use the production `DATABASE_URL`. The ingest service performs database
warm-up retries, takes a Postgres advisory lock, retries sources independently,
persists `ingest_runs`, and clusters after successful ingestion. Do not restore
`INGEST_INTERVAL_MINUTES`; ingestion must not run inside the API process.

Required production variables:

```text
DATABASE_URL
JWT_SECRET
OPENAI_API_KEY
AI_DAILY_LIMIT
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
R2_FEEDBACK_BUCKET_NAME
SENTRY_DSN
SENTRY_ENVIRONMENT
SENTRY_RELEASE
WEB_APP_URL
```

Create/verify the private feedback bucket:

```bash
railway run --service forum-api npm run storage:feedback
```

The media bucket is public; the feedback bucket must stay private. Confirm its
lifecycle policy and test a five-minute admin-authorized screenshot URL.

Deploy migrations first, then `forum-api`, then `forum-ingest`. Wait for
Railway `SUCCESS`, call `/health`, inspect deploy/runtime logs, and trigger one
manual ingest. Confirm one successful `ingest_runs` row before removing any
legacy API variable. Simulate two concurrent ingests and verify one records
`skipped_locked`.

## 4. Observability and delivery

Backend Sentry needs `SENTRY_DSN`; mobile Sentry needs:

```text
EXPO_PUBLIC_SENTRY_DSN
EXPO_PUBLIC_SENTRY_ENVIRONMENT
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
```

Store mobile values in EAS environments/secrets. `SENTRY_AUTH_TOKEN` is for
source-map upload only and must never reach the app bundle. Verify controlled
backend and frontend errors produce readable, symbolicated events with no
authorization headers, cookies, email addresses, usernames, IP addresses, or
raw rejected moderation input.

Configure monitors/alerts for:

- API health or database degradation;
- stale or repeatedly failing ingestion;
- repeated Resend/Expo Push failures;
- account media cleanup older than 24 hours;
- unexpected forumAI spend or limit growth.

`AI_DAILY_LIMIT` must be explicit in production.

## 5. Permanent-domain gate

Do not open external registration or external TestFlight until a permanent
domain has been chosen.

After selection:

1. Register the domain.
2. Add it to Resend and verify SPF, DKIM, and DMARC.
3. Set `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`, and
   `LEGAL_CONTACT_EMAIL`.
4. Set `WEB_APP_URL` to the permanent HTTPS web app.
5. Use the permanent `/support` and `/legal/privacy` URLs in App Store Connect.
6. Verify signup verification, password reset, reply email, DM email, and
   coalesced upvote email end to end.

Production never logs verification links or reset codes when email is missing.
Email verification gates email delivery only, not ordinary participation.

## 6. EAS and physical-iPhone QA

The app requests push permission only after the user taps the contextual
Settings control. Generate/configure APNs credentials through EAS, then test
registration, routing, unregister-on-sign-out, and delivery on a physical
iPhone.

```bash
npx eas-cli@latest build --platform ios --profile development
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile device
```

Set `EXPO_PUBLIC_API_URL` to the Railway production origin in EAS development,
preview, and production environments. Test every main screen in light and dark
mode on the smallest and largest supported iPhones. Validate login, signup,
verification, reset, moderation allow/reject/outage, private profiles, follow
requests, notification combinations, feedback screenshots, account deletion,
push routing, and forumAI.

Reject the build for render errors, native faults, unhandled promise warnings,
unexplained server errors, or VirtualizedList regressions.

## 7. App Store Connect record

Create the record only after checking the exact name:

- Name: `forum`, if Apple accepts it.
- Bundle ID: `com.michaeltan.forum`.
- Primary category: News.
- Secondary category: Social Networking.
- Device support: iPhone only.

If Apple rejects the exact name `forum`, stop and make a branding decision. Do
not invent a fallback.

Accept pending Apple agreements, complete export compliance, and put the
generated App Store Connect Apple ID into
`submit.production.ascAppId` in `eas.json`.

Answer UGC/content-rights and age-rating questions honestly. Complete App
Privacy for email, account identifiers, user content, messages, interactions,
push tokens, diagnostics/Sentry, and data sent to OpenAI. The hosted privacy
policy must match actual Railway, Neon, R2, Expo, OpenAI, Sentry, and Resend
behavior.

## 8. Internal TestFlight

Build and submit:

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

Create an `Internal QA` group for the owner and a small trusted group. Add the
beta description, feedback email, review contact, non-admin reviewer account,
and detailed What to Test notes. Keep TestFlight native crash/screenshot
feedback enabled alongside the in-app structured feedback queue.

Observe the internal build for at least 24 hours. Review Railway logs, Sentry,
ingest freshness, push/email delivery, TestFlight feedback, and in-app feedback.
Resolve regressions and send a new build when necessary.

## 9. External TestFlight

External readiness requires every item below:

- permanent domain and final support/privacy URLs;
- working verification and password recovery email;
- active text/image moderation and reviewed mock corpus;
- backend/mobile Sentry receiving redacted symbolicated events;
- fresh hourly ingestion with healthy left/center/right sources;
- private feedback screenshots and full account-media cleanup verified;
- no known/shared admin credentials;
- 24-hour internal observation with no unresolved crash/log regression.

Then create `Founding Testers`, submit the build to TestFlight Beta App Review,
and invite 10–25 external testers. Review TestFlight and in-app feedback daily.
