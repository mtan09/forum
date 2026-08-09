# forum — Michael Tan

A political discussion social media app built with Expo / React Native. The feed mixes user posts with fed-in news articles, and politically classifiable content carries a **spectrum bar** showing where it sits — the goal is seeing the whole conversation, not just your side of it.

## Features

- **Single main feed** of user posts and news articles, with hashtags as the organizing layer (author-picked on posts, auto-extracted on articles); 7 general topics live on silently as background metadata
  - Articles are discovered from 58 real outlets across the spectrum through a provenance-aware backend — see [`../forum-api`](../forum-api). Article text may be inspected transiently during ingestion, but it is not stored: the backend keeps bounded derived signals for deterministic scoring, clustering, search, and recommendations
  - Posts are auto-scored at creation by a versioned local classifier combining partisan framing, direct policy rules, compositional arguments, reviewed semantic prototypes, and lower-weight contextual alignment. It scores the expressed argument—not the author's profile, activity, or presumed politics—and preserves unclassified for text with no directional evidence
  - **Scorer receipts** — tap any spectrum bar (or an article's lean tag) to see *why* it landed where it did: policy position, supporting evidence, local detection method, exact framing phrases, and confidence. Post placement sends no content to third-party AI; the same text always produces the same placement
  - **Hot topics**: a pinned row of compact title chips above the feed, generated from privacy- and rights-conscious clustering profiles derived during ingestion. Summary screens compare one attributed publisher headline from the left, center, and right; article-body text never renders in those cards
  - **For You / Random / Against You** tabs surface content that matches or challenges your own placement; your own posts are excluded, and scroll position + sequence persist across tabs and screens
- **The Floor** — daily debate rooms auto-picked from the news clusters: the biggest story, the most divided one, and trending stories (up to 6/day). Commit your position on a spectrum track *before* the room's distribution and thread unlock. A **"Yesterday on the Floor"** recap shows where each room finally landed
- **Search + Discover** for articles and community posts, with live hot-story entry points, full-corpus result counts, and article/post result lanes. Matching story clusters lead the article view so a broad query can open the complete multi-outlet summary instead of looking like only a handful of items exist
- **Source pages** — tap a news outlet's favicon (with an initials fallback) for its detail page: rating, average article score with spread, content-type mix, and recent coverage
- **Profiles**
  - **One computed political spectrum**, earned from real activity (scored posts weigh 3×, upvotes pull toward the content's lean, downvotes pull away) — never self-declared. Public on every profile
  - **Trajectory** — a sparkline of where your dot sat over recent months, so a converged placement still shows its arc
  - Content tabs: Posts, Comments, Upvoted, and Saved (real bookmarks)
  - Settings live behind a gear button (not a tab)
- **Follows + Following feed** — follow anyone from their profile; Home stays focused on `For You / Random / Against You`, while a dedicated Following feed lives on your profile alongside follower counts
- **Direct messages** — a full DM inbox (envelope on your profile) with per-thread unread badges, optimistic sends, grouped date/time separators, swipe-to-reveal exact timestamps, tappable conversation identities, rich in-app post/article shares, and report/block actions on received messages. Public accounts can receive DMs normally; a private account can receive a DM only from someone it follows
- **Shareable cards** — export a branded image of your lean or a debate stance to the native share sheet; post shares link to web share pages with rich previews and an open-in-app button
- **Moderation and OpenAI permission** — forum's deterministic hard stops run first. Signup usernames use only forum's on-server rules. Before profile text, a post, comment, DM, forumAI prompt, or uploaded image is sent to OpenAI for additional safety processing or generation, the user receives a clear versioned allow/decline choice. Declining preserves text-based social features as well as browsing, voting, saving, and following; Settings allows later permission or withdrawal. Report/block tools remain available and admins get separate report and pre-publication review queues
- **Onboarding** — immediately after signup, new accounts can pick interests and follow suggested active users. Topics save when Step 1 advances and follows save immediately; onboarding is a one-session welcome flow, so a cold relaunch opens the signed-in home feed rather than forcing an unfinished flow to resume
- **Private accounts** — private profiles expose only their basic identity and spectrum until a follow request is accepted; requests can be approved, declined, cancelled, and removed, while individually encountered posts remain in feeds, search, and threads. Messaging a private account requires that account to follow the sender
- **Notifications + Daily Brief** — Push and Email are independently configurable for replies, upvotes, DMs, and follow activity. A persisted 7:00 AM local Daily Brief opens once in-app, remains available for seven days from Profile, and combines shared hot stories/Floor rooms with personalized posts and grouped account activity. Its email and push reminder are separate opt-ins. Push permission is requested contextually from Settings; the backend checks Expo's final delivery receipts and removes dead tokens. Replies/DM emails are immediate, and opted-in upvote email is coalesced. See [Daily Brief](docs/DAILY_BRIEF.md)
- **Feedback** — authenticated structured feedback captures category, route, theme, version/build, device metadata, and an optional privately stored screenshot; admins can triage it as open, planned, resolved, or dismissed, and account deletion removes the feedback record before its private screenshot is cleaned up asynchronously
- **Posting**: the create action opens a distraction-free three-quarter-height composer, focuses the writing surface immediately, and keeps a Photo Library control attached above the keyboard. Inline `#hashtags` remain supported; uploaded images are moderated, server-resized, and EXIF-stripped. The app does not request camera access
- **Article media** — the backend prefers publisher RSS/Atom media and may fall back to publisher page image metadata, then stores that remote URL. The app loads it directly with its normal device cache, rejects obvious video/HLS assets and malformed article-URL-as-image values, and falls back cleanly when a publisher image is unavailable. Summary carousels label every image with its publisher and tap through to the original article
- **Interactions** — persistent up/downvotes, nested comments with replies, bookmarks, direct reposts, and quote posts. The repost control on every post/article opens the same compact two-action menu for Repost or Quote; its count combines direct reposts and visible quote posts. Direct reposts can surface the attributed original in accepted followers' For You feeds, while quotes remain authored posts with a tappable embedded source card. The composer can also choose a quote from Bookmarks, Upvoted, or Your Posts. Optimistic interaction state is synchronized by content ID across feed, detail, profile, search, summary, and comment surfaces, so votes, saves, repost totals, comment counts, and owner deletions update immediately without waiting for a screen refetch. Authors can permanently delete their own posts or comments from the shared three-dot menu; a press-and-hold on any post, article, or comment raises a focused preview over a blurred background with the same context-aware actions below it
- **forumAI**: a guided three-perspective workspace that streams Left / Center / Right readings and searches eligible recent publisher headlines plus forum-generated story metadata for relevant context. Publisher bodies are neither stored nor sent to OpenAI, and source-policy controls exclude restricted publishers from AI context
  - "Explain like I'm: …" framing selector (student, policymaker, skeptic, …)
- **Settings** — account (edit profile, change password, private-account control, follow requests, email verification + password reset), **Appearance (Light / Dark / Match system)**, a persisted home-feed content choice (**posts + articles / posts only / articles only**), per-channel notification preferences, structured feedback, privacy/blocking, version/build information, Terms + Privacy, and account deletion

## UI color system

Every app screen resolves its colors through [`constants/theme.ts`](constants/theme.ts), with matching semantic roles for light and dark mode:

- **Primary:** forum purple (`#B647FF`) is the only brand and interaction color. It is used for the forum identity, primary buttons, links, active tabs, selected navigation, and loading indicators.
- **Accent:** there is no competing accent hue. Supporting accents are lighter or deeper tones of the same purple, used for tinted cards, chips, borders, and emphasis.
- **Background:** the page canvas only. Cards and controls use surface roles so they remain visibly separated from the canvas in both themes.
- **Surfaces:** neutral, muted, raised, and purple-tinted surface tokens cover cards, inputs, sheets, and branded callouts.
- **Text:** primary, secondary, muted, and disabled levels provide the same hierarchy on every screen.
- **Perspective:** blue, gray, and red are reserved exclusively for Left, Center, and Right data. A shared mapping keeps those colors identical across forumAI, Search, Summary, and article screens.
- **Status:** success, danger, upvote, downvote, and bookmark colors communicate state; they are not reused as brand colors.

The exported social-share cards intentionally use a fixed print palette so the generated image looks the same regardless of the viewer's current app theme.

## Architecture

The app is a pure API client — no direct database or storage access. The backend lives in a sibling repo, [`../forum-api`](../forum-api): Hono on Node, Postgres (Neon in prod), self-managed JWT auth, disk/R2 image storage, deterministic bias scoring with real news ingestion, and an OpenAI-powered streaming endpoint for forumAI. See `forum-api/README.md` for endpoint docs and production deployment.

All requests go through [`lib/api.ts`](lib/api.ts):

- Native auth tokens live in the iOS Keychain/Android Keystore through `expo-secure-store`; a one-time migration deletes the legacy AsyncStorage copy. The web adapter retains browser storage. Sign-out unregisters the device push token before deleting the local token
- The API base URL is `EXPO_PUBLIC_API_URL` if set; otherwise it's derived from the Expo dev server's host on port 3000, so a phone on the same Wi-Fi reaches your local backend with zero config
- forumAI streams over SSE, consumed via `expo/fetch`'s `ReadableStream`

Key directories:

```
app/               screens (expo-router file-based routing)
  (tabs)/          feed, The Floor, forumAI, search, profile
  auth/            landing, login, create account, verification/reset flows
  post/[id]        post detail + comments
  article/[id]     article detail
  summary/[id]     subtopic summary screen
  debate/[id]      a Floor room: stance track, distribution, thread
  user/[id]        public profile (spectrum + posts)
  source/[name]    news source detail page
  messages, dm/    direct-message inbox and conversation threads
  following        posts from accounts the current user follows
  brief/[date]     persisted Daily Brief sheet and seven-day archive
  onboarding       interests, suggested follows, and email-verification prompt
  admin-*          reports, pre-publication moderation, feedback, ingest status
  feedback         structured feedback + optional private screenshot
  follow-requests  private-account request management
  settings, blocked, editprofile, changepassword
components/        post/article/comment cards, spectrum bar + trail,
                  scorer receipts, share cards, report/block menu, carousels
context/          authContext (session), aiConsentContext (explicit OpenAI
                  permission UI), interactionContext (per-item cross-screen
                  votes/bookmarks/comment counts), postContext (normalized feed),
                  themeContext (Light / Dark / Match system preference),
                  feedPreferenceContext (persisted feed content filter)
lib/api.ts        API client: fetch wrapper, token storage, image upload
lib/article-media.ts  direct-image cache behavior and narrow media URL validation
lib/notifications.ts  native push registration/routing + Floor reminders
lib/notifications.web.ts  web-safe notification no-ops
lib/perspective-colors.ts  shared Left / Center / Right presentation mapping
lib/sentry.ts     env-gated crash reporting with PII and network-payload redaction
lib/token-storage.*  SecureStore on native; browser storage on web
```

## Getting started

1. **Start the backend** (first time: see `forum-api/README.md` for database setup)

   ```bash
   cd ../forum-api
   npm run dev          # http://localhost:3000
   npm run seed:expand  # optional: a lived-in community of users, posts, votes, debates
   ```

2. **Install the app dependencies**

   ```bash
   npm install
   ```

   Forum uses a project-specific Expo development build rather than Expo Go so
   native behavior such as push notifications, permissions, fonts, splash
   screens, and deep links matches the production app.

3. **Install a development build** (one time, and again after native dependency
   or app-config changes)

   ```bash
   npx eas-cli@latest build --platform ios --profile development  # iOS Simulator
   npx eas-cli@latest device:create                               # physical iPhone, once
   npx eas-cli@latest build --platform ios --profile device       # physical iPhone
   ```

   EAS physical-device builds and TestFlight require a paid Apple Developer
   Program team. Without one, connect your own iPhone to this Mac, enable
   Developer Mode, select your free Apple account in Xcode, and use
   `npx expo run:ios --device`; iOS Simulator builds do not require Apple
   signing.

4. **Start the development server**

   ```bash
   npm start
   ```

   Open the installed Forum development app. It connects to Metro with fast
   refresh, like Expo Go, but includes Forum's actual native configuration.

5. **Log in** — create an account or use a local fixture whose password you
   set yourself. Release and reviewer credentials must never be written in
   documentation or committed files.

To point the app at a deployed backend instead, set `EXPO_PUBLIC_API_URL` (e.g. in a `.env` file):

```
EXPO_PUBLIC_API_URL=https://api.forumeveryside.com
```

> forumAI requires `OPENAI_API_KEY` in `forum-api/.env`; the endpoint returns a clear error until it's set.

Local `.env` files are gitignored. Keep deployed API and Sentry values in local/EAS environment configuration; never commit them.

The current native baseline is Expo SDK 57 / React Native 0.86. The initial release is
iPhone-only (`ios.supportsTablet=false`) and supports iOS 16.4 or newer.
Local native builds require an Xcode release that includes Swift tools 6.2 or
newer. Xcode 16.2 includes Swift 6.0 and fails while resolving ExpoModulesJSI,
before Forum application code is compiled; update and open Xcode once before
retrying `npx expo run:ios`.

## Development

```bash
npm start            # Forum development client (i = iOS simulator, a = Android)
npm run web          # browser development server
npm run web:export   # production static export in dist/
npm run lint         # eslint
npx tsc --noEmit     # typecheck
npm run check:deep-links
npm run check:universal-links
```

The EAS `production` environment points TestFlight/App Store builds at
`https://api.forumeveryside.com`. Development and preview builds can use that
same hosted API or an explicit local override.
For a different backend during local Metro development, override
`EXPO_PUBLIC_API_URL` in the gitignored `.env.local`. A physical phone cannot
reach a server at the phone's own `localhost`; use the hosted API or the Mac's
LAN address.

### Web app

The browser build uses a web-specific responsive shell rather than stretching the phone UI. At laptop widths, navigation lives in a left rail, the feed stays in a constrained center column, and The Floor appears beside it as a live right rail. Tablet-sized browsers use a compact top navigation, while phone-sized browsers use a bottom navigation and a small composer action in the header. Search, forumAI, profile, summary, The Floor, and the post composer adapt to the available width while reusing the same API, auth, theme, and content logic as iOS and Android. Horizontal topic, image, and coverage rails expose mouse-friendly previous/next controls on larger browsers.

The production web deployment is **https://forumeveryside.com**. It is a
Cloudflare Pages direct-upload project named `forum-web`, backed by the same
Railway API as the iOS app. **https://forum-web-6tw.pages.dev** is Cloudflare's
generated project hostname, and **https://mtan-forum.expo.app** remains an EAS
Hosting fallback.
Shared user posts and articles use canonical
`https://forumeveryside.com/post/<post-id>` and
`https://forumeveryside.com/article/<article-id>` links. Set
`EXPO_PUBLIC_WEB_URL` only when a development or preview build needs a different
public web origin; production defaults to the permanent domain.
Eligible post, article, Floor, profile, DM, and follow-request paths are also
configured as iOS Universal Links. They open a newly built installed iOS app
when Apple selects it, and remain ordinary web URLs when the app is absent or
the visitor is on desktop. See
**[Universal Links](docs/UNIVERSAL_LINKS.md)** for the exact path scope,
Cloudflare/AASA deployment, validation command, and physical-device test.
The permanent support and privacy pages live at
**https://api.forumeveryside.com/support** and
**https://api.forumeveryside.com/legal/privacy**.

The authenticated web client is exported as a single-page app because post,
article, summary, user, and conversation URLs are dynamic. `public/_redirects`
rewrites unknown Cloudflare Pages paths to `index.html`. To publish an update,
set `EXPO_PUBLIC_API_URL=https://api.forumeveryside.com` in the local production
environment, run `npm run web:export`, and upload the generated `dist/` folder
as a new production deployment in the `forum-web` Pages project. A production
export without `EXPO_PUBLIC_API_URL` falls back to `http://localhost:3000` and
must not be uploaded.

CI (GitHub Actions) runs typecheck + lint on every push. See **[LAUNCH.md](LAUNCH.md)** for the App Store launch checklist — deployment, EAS builds, and the account setup (Apple/Resend/Sentry/Railway) each feature is env-gated behind.

The initial App Review database can include a temporary fictional community so
reviewers can navigate populated feeds and Floor rooms before public launch.
Every such account is visibly marked `(Fictional demo account)`, uses a
forum-owned colored logo avatar, and has its own bio and viewpoint. The backend
schedules disclosed fixture activity only when explicitly enabled. See
**[App Review notes](docs/APP_REVIEW_NOTES_DRAFT.md)** and the backend's
`docs/DEMO_COMMUNITY.md`; disable and remove the fixtures before manually
releasing the approved build.

Backend (`../forum-api`):

```bash
npm run dev          # API with hot reload on :3000
npm run typecheck
npm run seed:expand  # idempotent — safe to re-run
```

Schema changes go in `../forum-api/schema.sql` (idempotent `IF NOT EXISTS` statements) with a matching numbered file in `../forum-api/migrations/`, applied with `psql forum -f migrations/00N-name.sql`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App loads but feed is empty / network errors | Backend not running — `cd ../forum-api && npm run dev` |
| Works in simulator, not on a physical device | Device must be on the same Wi-Fi as the dev machine; otherwise set `EXPO_PUBLIC_API_URL` to `http://<your-LAN-IP>:3000` |
| `connection refused` from Postgres | `brew services start postgresql@15` |
| Logged out unexpectedly | JWTs expire after 30 days — log in again |
| forumAI returns "not configured" | Set `OPENAI_API_KEY` in `forum-api/.env` and restart the API |
| The Floor is empty | Rooms generate once enough recent articles cluster — run `npm run ingest` in `forum-api` |
| Daily Floor reminder toggle won't stay on | The OS denied notification permission — enable it for the app in system Settings |
| Push registration is skipped in development | Link the Expo project with EAS so `extra.eas.projectId` is available; the app intentionally skips token registration when no project ID exists |
| Images upload but don't render on device | Disk-storage URLs use the API host — same Wi-Fi / `EXPO_PUBLIC_API_URL` rules as above |
| An article has no publisher image | The source may not provide one, its URL may be malformed/dead, or the publisher may block direct delivery. The app uses branded purple story artwork instead of leaving a broken frame |
