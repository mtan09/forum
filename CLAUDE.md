# forum — iOS + web client

Expo SDK 57 / React Native 0.86 / expo-router. iOS 16.4+, iPhone-only.
Backend is a sibling repo at `../forum-api` (Hono / Postgres / JWT on Railway).

## Commits

**Never list Claude as a contributor.** No `Co-Authored-By` trailer, no
"Generated with" footer. Commits are authored solely by the repo owner.

## One codebase, two platforms

The web app *is* the iOS app rendered through React Native Web. Almost every
screen and component is shared. Divergence is deliberately confined to:

| file | role |
|---|---|
| `components/web-shell.tsx` | persistent web chrome: left nav, content column, Floor rail |
| `components/web-stack-header.tsx` | in-column `← Post` header (and the auth variant) |
| `components/web-page-frame.tsx` | thin passthrough; the shell owns the column |
| `components/web-floor-rail.tsx` | right rail |
| `app/auth/landingpage.web.tsx` | marketing landing page (signed-out) |
| `app/(tabs)/_layout.web.tsx` | passthrough — the shell lives at the root layout |
| `global.css` | web-only global styles, imported from `app/_layout.tsx` |

Plus ~29 files with `Platform.OS === 'web'` branches.

**Before adding a web branch, check whether the difference is real.** Most past
"web looks worse" bugs were web-only branches that had drifted from iOS —
bordered cards where iOS used hairline-split rows, a second background colour,
per-route column widths. Deleting the branch was usually the fix.

**Any change to shared code must be checked on both.** iOS via the simulators,
web via `npm run web:export` and a local static server.

## Checks before any build

```
npm run typecheck        # tsc --noEmit
npm run lint             # expo lint
npm run check:deep-links # notification paths still resolve to screens
npx expo-doctor          # required, not optional
eas env:list             # confirm EAS env before an EAS build
```

### Dependency patch versions — the hold was lifted (2026-08-08)

Six packages were previously held at older patch versions through build 8
(`expo`, `expo-notifications`, `expo-router`, `expo-image-picker`,
`expo-sharing`, `expo-symbols`). **All six are now upgraded and that is
deliberate** — `expo-notifications` sits at 57.0.9, not 57.0.8.

The original reason for holding was that build 8 exists to verify a
notification fix, and bumping the package the fix depends on would add a second
variable. That was judged an acceptable trade and the upgrade was kept.

What this means when build 8 is tested: **if a notification misbehaves, the
dependency bump is a live suspect alongside the fix itself.** 57.0.9's two
changes are an Android notification-tap crash fix and a web `SecurityError`
fix, neither of which should reach an iPhone-only app whose
`lib/notifications.web.ts` is a no-op shim — so the bump is unlikely to be the
cause, but it is no longer ruled out by construction. Check `expo-notifications`
57.0.9's changelog before concluding the fix failed.

`expo-doctor` should now be clean on version drift. A *new* drift warning is
worth reading rather than assuming it is this one.

## Notifications

Every notification carries an in-app path in `data.url`, and the tap handler in
`lib/notifications.ts` navigates **only** when that path is present and starts
with `/`. A notification with no `data` silently does nothing on tap — that is
how the 9am Floor reminder shipped broken. `npm run check:deep-links` exists to
catch the other half of the failure: a renamed screen leaving a live path
pointing at nothing. It reads the server-sent paths from
`../forum-api/src/lib/notification-routes.ts`, so that file is the place to add
a new destination.

`attachNotificationRouter` handles two arrivals, and both matter. A tap while
the app is running comes through the listener; a tap that *launches* the app
from a terminated state is delivered to native before JS exists and must be
drained with `getLastNotificationResponse()`. expo-notifications does not
replay it to a late listener. Cold start is the normal case for a 9am reminder,
so **test force-quit, not just backgrounded** — they take different code paths.

The reminder is scheduled once and lives in iOS, not rebuilt on launch, so
changing its payload does nothing for installs that already have it.
`ensureFloorReminderCurrent()` is the one-time repair; bump the storage key
again if the payload changes.

**Local notifications fire in the simulator; remote push does not.** Push needs
a device build, and the simulator's release build (`main.jsbundle`, no dev
launcher) cannot attach to Metro — use `npx expo run:ios` for a debug build.
`npm run notify:test` in `../forum-api` sends any one of the nine real
notifications on demand so the matrix doesn't require waiting for real events.

## Web deploy

Cloudflare Pages, project `forum-web`, **production branch is `main`**.
Custom domains: `forumeveryside.com` (canonical) and `www.forumeveryside.com`.

```
npm run web:export
npx wrangler pages deploy dist --project-name=forum-web --branch <preview-name>
# verify on the returned *.pages.dev URL, THEN:
npx wrangler pages deploy dist --project-name=forum-web --branch main
```

**Always deploy to a preview branch and verify before promoting to `main`.**
A direct-to-production deploy once caused a ~10 minute outage: Cloudflare served
an edge-cached `index.html` pointing at a purged bundle, so the app fetched a
missing script and mounted nothing — blank page on the custom domain while the
same build rendered fine on `*.pages.dev`.

`public/_headers` is the fix and must keep the SPA shell uncached:

```
/*                  Cache-Control: no-cache, must-revalidate
/_expo/static/*     Cache-Control: public, max-age=31536000, immutable
/assets/*           Cache-Control: public, max-age=31536000, immutable
```

After promoting, confirm the live domain serves the same bundle hash as the
preview. Propagation lags by a minute or two; sample a few times before
concluding anything is wrong.

## Haptics

Every interactive control fires a haptic. The vocabulary (`lib/haptics.ts`):

| helper | use |
|---|---|
| `tapLight` | ordinary taps, links, avatars, chips |
| `tapMedium` | send / post / submit |
| `selectTick` | segmented pickers and tabs |
| `notifySuccess` | completed action |
| `notifyWarning` | destructive confirmation |

Not just `onPress` — `onAction`, `onValueChange`, and `onPressIn` need them too.
Modal backdrop dismissals do **not** (a backdrop is not a button).

**iOS simulators produce no haptics at all.** Coverage can only be confirmed by
reading the code or testing on a physical device.

## Icons

`components/ui/icon-symbol.tsx` maps SF Symbol names to Material Community
Icons for web and Android. **SF Symbols are Apple-licensed and cannot ship on
the web** — the mapping is the only lever. If a web icon looks wrong, fix the
mapping rather than reaching for a new icon library; the mapping is typed
against MCI's names, so `tsc` validates any change.

## Post volume in the review environment

Almost all posts, comments and votes in production are written by 31 scheduled
demo personas — ~5 accounts are real. Posts run ~1:125 against articles right
now purely because a cron job paces the personas to ~20/day.

**Don't design screens around that ratio.** The target is a userbase where
posts match or outnumber articles. Feed density, empty states, and any
"there's not much here" affordance should hold up at both extremes, and a
community feature is not disqualified by today's volume. Full numbers and the
reasoning: `../forum-api/CLAUDE.md`, "Content volume is a launch artifact."

## Gotchas

- `adjustsFontSizeToFit` is unreliable in RN iOS and has silently shrunk text to
  unreadable sizes. Prefer `numberOfLines` + `flexShrink`.
- Verify UI fixes **visually**. Grepping the bundle for a changed style has
  produced false "fixed" claims more than once.
