# forum — Michael Tan

A political discussion social media app built with Expo / React Native. The feed mixes user posts with fed-in news articles, and every piece of content carries a **spectrum bar** showing where it sits politically — the goal is seeing the whole conversation, not just your side of it.

## Features

- **Social feed** of user posts and news articles, filterable by 7 general discussion topics
  - Each post/article has a spectrum bar describing its political position
  - **For You / Random / Against You** tabs — deliberately surface content that matches or challenges your own positions
- **Auto-generated subtopics** for each general topic, with a short summary blurb
  - Tap to open a full summary screen: images, metadata, longer summary, and relevant articles
- **Posting**: text + image posts with a topic picker; persistent up/downvotes; nested comments with replies
- **Profiles** with avatar, header, bio, and per-topic political spectrum positions
- **forumAI**: a specialized chatbot that answers every question from three perspectives (Left / Center / Right)
  - "Explain like I'm: ..." framing selector (student, policymaker, skeptic, ...)

## Architecture

The app is a pure API client — no direct database or storage access. The backend lives in a sibling repo, [`../forum-api`](../forum-api): Hono on Node, Postgres, self-managed JWT auth, disk/R2 image storage, and an Anthropic-powered endpoint for forumAI. See `forum-api/README.md` for endpoint docs and production deployment (Neon + R2 + Railway).

All requests go through [`lib/api.ts`](lib/api.ts):

- Auth token is a JWT kept in AsyncStorage (`signIn`/`signUp`/`signOut` via [`context/authContext.tsx`](context/authContext.tsx))
- The API base URL is `EXPO_PUBLIC_API_URL` if set; otherwise it's derived from the Expo dev server's host on port 3000, so a phone on the same Wi-Fi reaches your local backend with zero config

Key directories:

```
app/            screens (expo-router file-based routing)
  (tabs)/       feed, forumAI, create post, profile, settings
  auth/         landing, login, create account
  post/[id]     post detail + comments
  summary/[id]  subtopic summary screen
  article/[id]  article detail
components/     post/article cards, spectrum bar, comments, carousels
context/        authContext (session), postContext (feed + votes)
lib/api.ts      API client: fetch wrapper, token storage, image upload
```

## Getting started

1. **Start the backend** (first time: see `forum-api/README.md` for database setup)

   ```bash
   cd ../forum-api
   npm run dev        # http://localhost:3000
   npm run seed:dev   # optional: sample users, posts, comments
   ```

2. **Start the app**

   ```bash
   npm install
   npx expo start
   ```

   Open in the iOS simulator, Android emulator, or Expo Go on a device on the same network.

3. **Log in** — create an account, or use a seeded dev user:
   `john@example.dev` / `jane@example.dev` / `alice@example.dev`, password `password123`

To point the app at a deployed backend instead, set `EXPO_PUBLIC_API_URL` (e.g. in a `.env` file):

```
EXPO_PUBLIC_API_URL=https://your-api.example.com
```

> forumAI requires `ANTHROPIC_API_KEY` in `forum-api/.env`; the endpoint returns a clear error until it's set.

## Development

```bash
npx expo start       # dev server (i = iOS simulator, a = Android, w = web)
npm run lint         # eslint
npx tsc --noEmit     # typecheck
```

Backend (`../forum-api`):

```bash
npm run dev          # API with hot reload on :3000
npm run typecheck
npm run seed:dev     # idempotent — safe to re-run
```

Schema changes go in `forum-api/schema.sql` (idempotent `IF NOT EXISTS` statements) and are applied with `psql forum -f schema.sql`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App loads but feed is empty / network errors | Backend not running — `cd ../forum-api && npm run dev` |
| Works in simulator, not on a physical device | Device must be on the same Wi-Fi as the dev machine; otherwise set `EXPO_PUBLIC_API_URL` to `http://<your-LAN-IP>:3000` |
| `connection refused` from Postgres | `brew services start postgresql@15` |
| Logged out unexpectedly | JWTs expire after 30 days — log in again |
| forumAI returns "not configured" | Set `ANTHROPIC_API_KEY` in `forum-api/.env` and restart the API |
| Images upload but don't render on device | Disk-storage URLs use the API host — same Wi-Fi / `EXPO_PUBLIC_API_URL` rules as above |

## Roadmap

Wired in the backend or sketched in the UI, but not finished:

- **Bookmarks** — the button toggles locally; needs persistence (a `bookmarks` table already exists in the schema)
- **Per-topic user positions** — `GET/POST /users/me/positions` exist and signup could seed defaults, but the profile screen still shows hardcoded spectrum values, and the For You / Against You tabs read from that same hardcoded list
- **Profile editing** — `PATCH /users/me` supports username/bio/avatar/header; the settings screen is currently just a logout button
- **Fact-check panel** — per-claim verdict/evidence UI is commented out in the post screen, awaiting a real fact-check source
- **Article ingestion** — the `articles` table carries `content_hash`, `political_relevance`, `lean_confidence`, and `status` fields designed for an automated news pipeline; articles are currently seeded manually
