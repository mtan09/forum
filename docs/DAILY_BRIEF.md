# Daily Brief

## Product behavior

The Daily Brief is a persisted 7:00 AM local snapshot shown as a tall sheet on
iOS and web. It opens automatically once per edition after authentication and
onboarding, can be reopened from Profile, and exposes the most recent seven
editions. The client checks at launch, on foregrounding, and with one timer for
the next local 7:00 boundary, so an app left open overnight does not miss it.

Each edition has four intentionally separate sections:

- **Across forum:** three public hot-story clusters selected from articles
  published inside the edition window.
- **Worth hearing:** up to two posts from the existing first-party `For You`
  ranker. Quiet days are intentionally shorter rather than padded.
- **On The Floor:** today's leading rooms and yesterday's featured Floor recap.
- **Around you:** nonzero counts for replies, comments on the user's posts,
  upvotes on posts/comments, reposts, quotes, followers/requests, and unread
  DMs. DM text is never copied into the brief or email.

Story and Floor selection is shared rather than personalized. Post selection
and personal activity are user-specific. The brief references existing content
IDs and stores aggregate counts; it does not copy publisher article bodies or
send anything to OpenAI.

## Scheduling and delivery

The client reports its current IANA timezone to `GET /briefs/today`. PostgreSQL
constructs the prior and current 7:00 AM boundaries with `AT TIME ZONE`, so DST
changes produce the correct 23/24/25-hour window.

- Users with no delivery opt-in generate today's edition lazily on first open.
- A dedicated `forum-daily-brief` Railway cron runs `npm run daily-briefs` every
  15 minutes for users who enabled email or push.
- `(user_id, brief_date)` is unique, making concurrent app/cron generation
  idempotent.
- Email and push are independent opt-ins and remain gated by their global
  switches. Email also requires a verified address.
- The compact email is text-first, uses canonical Universal Links, includes
  standards-compatible one-click unsubscribe headers, and never embeds
  publisher images.
- The push body contains only aggregate counts suitable for a lock screen.
- The existing 9:00 AM Floor reminder remains independent.

`DAILY_BRIEF_ENABLED=no` disables generation/delivery without removing stored
editions. Omit it or set it to `yes` to enable the feature.

## Public interfaces

- `GET /briefs/today?timezone=America/New_York`
- `GET /briefs?limit=7`
- `GET /briefs/:date`
- `POST /briefs/:id/seen`
- `GET|PUT /users/me/notification-prefs` adds `push_daily_brief`,
  `email_daily_brief`, and `timezone`.
- `/brief/:date` is the shared Expo Router and Universal Link destination.

Migration `027-daily-brief.sql` adds the preference fields, snapshot table,
retention/delivery metadata, and the `daily_brief` push-receipt kind.

## Privacy and visibility

Generation excludes blocked actors, hidden posts, deleted rows, self-actions,
and items marked Not interested through the existing ranker. Hydration repeats
content visibility checks so a later deletion or block is reflected when an
archived edition opens. Account deletion cascades all editions immediately.

Snapshots are retained for seven editions and pruned by the worker. This uses
only first-party data already needed for the feed, social interactions, Floor,
and notification delivery. Resend and Expo receive an edition only when the
corresponding user opt-in is enabled.

## Verification

Run:

```sh
# forum-api
npm run typecheck
npx vitest run src/lib/daily-brief.test.ts src/lib/notification-delivery.test.ts

# forum
npm run typecheck
npm run lint
npm run check:deep-links
npm run check:universal-links
npm run web:export
```

Production acceptance additionally requires one controlled email, one physical
iPhone push, cold/warm Universal Link routing, dark/light sheet review, and a
Railway log showing an idempotent cron pass.

## August 8, 2026 implementation record

- Applied migration 027 to production Neon through the Railway API service.
- Added and deployed the dedicated `forum-daily-brief` Railway service with
  `npm run daily-briefs`, `*/15 * * * *`, and restart policy `NEVER`.
- Deployed the backward-compatible `/briefs` API and the Cloudflare Pages web
  client. The custom domain serves both `/brief/*` and each email story's
  `/summary/*` destination in its Apple association file.
- Found and fixed a production-boundary regression where PostgreSQL `date`
  values became locale strings such as `Sat Aug 08` in navigation paths.
- Changed story eligibility from mutable cluster update timestamps to article
  publication timestamps within the 7:00-to-7:00 edition window.
- Added a content schema version so pre-fix editions rebuild exactly once;
  genuinely quiet current editions remain stable.
- Confirmed the populated sheet visually on light and dark iOS simulators. The
  development-only gear overlay and Metro connection probes are not present in
  production/TestFlight builds.

Checks completed during implementation:

- forum: typecheck, lint, deep-link route check, Universal Link check, web
  export, live Cloudflare deployment route and association checks.
- forum-api: typecheck and 32 targeted Daily Brief/notification tests,
  including canonical email links, escaping, zero-count omission, and
  one-click unsubscribe headers.
- production: Railway API health, successful API and cron deployments, scoped
  API warning/error log review, an idempotent scheduled cron pass, authenticated
  iOS `/briefs` requests, and a clean custom-domain Safari render.

The full backend suite currently has 15 failures in the separate uncommitted
spectrum-classifier rewrite. Its other 209 tests pass. That rewrite was
deliberately excluded from the isolated Daily Brief production deployments.
