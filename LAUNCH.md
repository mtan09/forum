# TestFlight release runbook

This is the ordered release checklist for the iPhone-only forum beta. Code and
safe defaults live in git; credentials, reviewer passwords, Apple keys, Sentry
tokens, and every `.env` file do not.

The permanent domain and account-email infrastructure are configured. The
current production release candidate is mobile commit `0f265f3`, backend
commit `103c8ba`, and EAS iOS build 6. External testing and App Review remain
blocked by the validation and App Store Connect items below. Internal
TestFlight can continue while they are completed.

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
2. Apply numbered migrations through 019 once, in order:

   ```bash
   railway run --service forum-api npm run migrate:release
   railway run --service forum-api npm run migrate:017
   railway run --service forum-api npm run migrate:018
   railway run --service forum-api npm run migrate:019
   ```

3. Confirm the seeded `john@example.dev` persona remains usable with the shared
   development password and its admin flag is false.
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

Use a real inbox or controlled alias for the review identity and keep it
available for the lifetime of the build. `RELEASE_ACCOUNT_ROLE=reviewer`
explicitly removes admin access, including when it updates an existing account.
Do not give Apple the owner account: it exposes controls ordinary users cannot
access and does not represent the submitted product.

Migration 016 is backward compatible: private-account fields default public,
existing follows become accepted, existing push preferences migrate, and email
delivery defaults off.

Migration 017 is backward compatible with stored product data but intentionally
does not grandfather existing users into third-party AI sharing. It records
versioned allow/decline/withdrawal decisions and stores opaque Expo push ticket
IDs until their delivery receipts are checked.

Migration 018 adds first-party recommendation events, preference records, and
local semantic vectors. Migration 019 adds DM-report support and an
admin-hidden message flag. Migration 019 must be applied before deploying API
code that queries `messages.hidden`.

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
PUBLIC_API_URL
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

The permanent domain is `forumeveryside.com`. The following production state
was verified on July 31, 2026:

- `api.forumeveryside.com` routes to the Railway API and `/health` gates deploys.
- Resend sends as `forum <accounts@updates.forumeveryside.com>` with the sending
  domain verified.
- `support@forumeveryside.com` routes through Cloudflare Email Routing to the
  private support inbox. A real message was delivered; Gmail placed the first
  new-domain test in Spam, where it should be marked **Not spam** to establish
  inbox reputation.
- Railway sets `SUPPORT_EMAIL` and `LEGAL_CONTACT_EMAIL` to
  `support@forumeveryside.com`.
- The permanent review URLs are
  `https://api.forumeveryside.com/support` and
  `https://api.forumeveryside.com/legal/privacy`; both return HTTP 200.
- `WEB_APP_URL` is `https://mtan-forum.expo.app`, the validated EAS Hosting
  production alias. Laptop and phone-width layouts render without console
  errors. Attaching `forumeveryside.com` directly to EAS Hosting is optional and
  requires a paid Expo plan.
- `PUBLIC_API_URL` is `https://api.forumeveryside.com`, so verification emails
  use the public HTTPS origin instead of Railway's internal HTTP request URL.
- A disposable production signup received its verification message in the
  controlled inbox, the message contained a direct HTTPS link, and redeeming it
  returned `Email verified`.
- A real password-reset message reached the controlled inbox. Its six-digit
  code was redeemed successfully; the old password then returned 401, the new
  password logged in, and the account reported `email_verified=true`.
- All disposable accounts used for these checks were deleted afterward and
  their temporary credentials were removed.

Before external TestFlight, still repeat the reset redemption through the iOS
UI and test reply email, DM email, and coalesced upvote email end to end. Put the
permanent support and privacy URLs in App Store Connect; the full web app does
not need to share their hostname.

Production never logs verification links or reset codes when email is missing.
Email verification gates email delivery only, not ordinary participation.
New accounts see a third onboarding step with the destination address, resend,
status-check, and continue-for-now actions; Settings retains the resend action
for any account that remains unverified.
The recovery API returning `{ "ok": true }` is not sufficient verification:
request a reset for a controlled production account, receive the six-digit
code, set a new password in the iOS app, and confirm the old password no longer
works.

## 6. EAS and physical-iPhone QA

The app requests push permission only after the user taps the contextual
Settings control. Generate/configure APNs credentials through EAS, then test
registration, registration repair after an already-granted permission,
routing, unregister-on-sign-out, delivery, Expo receipt polling, and dead-token
cleanup on a physical iPhone.

Production currently has a valid EAS-managed APNs push key for
`com.michaeltan.forum`. On July 31, 2026, a notification sent through forum's
preference-aware backend path reached a registered physical iPhone. Expo ticket
IDs were persisted for the five-minute background receipt checker. Still test
tap routing, sign-out unregistration, and dead-token cleanup in the new binary.

```bash
npx eas-cli@latest build --platform ios --profile development
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile device
```

Set production `EXPO_PUBLIC_API_URL` to
`https://api.forumeveryside.com`; development and preview may use the same
hosted API or an explicit local override. Test every main screen in light and dark
mode on the smallest and largest supported iPhones. Validate signup with both
OpenAI choices, the existing-user just-in-time disclosure, withdrawal and
re-consent, and confirm no affected request reaches OpenAI before permission.
Also validate login, verification, reset, moderation allow/reject/outage,
private profiles, follow requests, notification combinations, feedback
screenshots, account deletion, push routing, and forumAI.

Reject the build for render errors, native faults, unhandled promise warnings,
unexplained server errors, or VirtualizedList regressions.

## 7. App Store Connect record

Create the record only after checking the exact name:

- Name: `forum: Every Side`.
- Bundle ID: `com.michaeltan.forum`.
- App Store Connect Apple ID: `6795639287`.
- Primary category: News.
- Secondary category: Social Networking.
- Device support: iPhone only.

Accept pending Apple agreements, complete export compliance, and put the
generated App Store Connect Apple ID into
`submit.production.ascAppId` in `eas.json`.

Answer UGC/content-rights and age-rating questions honestly. Complete App
Privacy for email, account identifiers, user content, messages, interactions,
push tokens, diagnostics/Sentry, and data sent to OpenAI. Review notes should
identify the signup and Settings OpenAI controls and explain what remains
available after decline. The hosted privacy policy must match actual Railway,
Neon, R2, Expo, OpenAI, Sentry, and Resend behavior.

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

## 10. App Store submission

The App Store Connect record is `forum: Every Side` (`6795639287`). As of
August 2, 2026, the following are already configured:

- subtitle `News from Every Perspective`;
- News primary and Social Networking secondary categories;
- current age-rating result of 16+ (17+ on operating systems earlier than 26);
- published App Privacy answers and hosted policy/choice URLs;
- product description, keywords, support URL, and marketing URL;
- manual release after approval; and
- an internal TestFlight group.

The 16+/legacy 17+ value is Apple's content-suitability rating, not a fixed
minimum account age. Signup must not claim that Apple requires all users to be
17. Keep the questionnaire answers truthful for a political news and social app,
and keep the Terms aligned with applicable law, required parent or guardian
consent, and App Store or device age restrictions.

Before `Add for Review`, complete every remaining item:

1. Wait for build 6 to finish, inspect the signed IPA, submit it to App Store
   Connect, complete processing/export compliance, and select build 6 on the
   1.0 version page. Do not leave build 5 selected.
2. Upload six accurate 6.5-inch iPhone screenshots. The first three should be
   Feed, multi-perspective story Summary, and The Floor; follow with forumAI,
   Discover, and a community thread/profile view. Use controlled content and
   keep the status bar, light/dark presentation, and text readable.
3. Enter the legal copyright holder and year. Do not guess whether the holder
   should be Michael Tan, John Tan, or Zhiqiang Tan; the account owner must make
   that legal-ownership decision.
4. Create and verify `appreview@forumeveryside.com` as a public, non-admin
   account with a stable password, then enter the email and password only in
   App Store Connect. Create a second disposable account for deletion testing.
5. Add Review Notes that explain the three feed modes, summary comparison, The
   Floor, optional OpenAI permission, report/block controls (including received
   DMs), account deletion, and the publisher-link article flow.
6. Complete TestFlight Test Information: review contact, sign-in requirement,
   reviewer credentials, and What to Test notes. Create `Founding Testers` only
   after the internal soak passes.
7. Select app availability/territories and confirm the app is Free and Public.
   Keep Apple Silicon Mac and Vision Pro availability off for this iPhone-only
   release unless they are deliberately tested.
8. Complete the account-level EU Digital Services Act trader-status setup in
   App Store Connect Business, including any identity/contact verification
   Apple requests.
9. Resolve Content Rights honestly. The record currently says the app has the
   necessary rights to third-party content, while
   `docs/PUBLISHER_CONTENT_RIGHTS.md` records substantial permission gaps.
   Obtain a defensible authorization/legal basis or change the product/source
   scope before certifying; do not use a review note or attachment that implies
   blanket publisher permission that has not been established.
10. Re-run the official-policy review, full QA, physical-iPhone notification
    delivery, email verification/reset, deletion cleanup, Railway/Sentry/ingest
    checks, and a 24-hour internal TestFlight soak. Only then select build 6,
    save all metadata, and use `Add for Review`.
