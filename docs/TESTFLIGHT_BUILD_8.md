# TestFlight build 8 — what to test

**Running doc.** Add to it as work lands; check items off on the device. When
build 8 ships and is verified, start a build 9 section rather than editing this
one away.

## Baseline

| | |
|---|---|
| Last TestFlight build | **7** — `a0e7f7a`, production/STORE, 2026-08-06 16:13 EDT |
| Build 8 contains | everything after `a0e7f7a` on `master`, plus the uncommitted notification work |
| Verified how | typecheck, lint and 220 API tests pass; **no iOS runtime verification has happened for any of it** |

Build 7 is what's on the phone now. Everything below is the delta.

### Why so much of this is untested

Three things in this batch cannot be checked anywhere but a physical iPhone:

- **Haptics do not fire in the simulator at all.** Coverage was confirmed by
  reading code, never by feel.
- **Remote push does not work in the simulator or Expo Go.** It needs a real
  device build.
- The simulator build was a *release* build with an embedded bundle, so the
  notification fix could not be exercised even locally.

That is the reason this list is long. Most of it is not "probably fine" — it is
"has never run on a phone."

---

## A. Notifications — highest priority, entirely unverified

Three defects fixed. None observed working. This is the whole reason build 8
exists, so test it first.

### A1. The 9am Floor reminder opens the Floor

The reminder was scheduled with no `data.url`, so tapping it only foregrounded
the app. *(This is the bug you reported.)*

- [ ] Settings → enable the Floor reminder
- [ ] Wait for 9am (or temporarily change `REMINDER_HOUR` / swap the trigger for
      `TIME_INTERVAL, seconds: 10` in `lib/notifications.ts`)
- [ ] **Backgrounded:** tap the banner → lands on The Floor
- [ ] **Force-quit:** kill from the app switcher first, then tap → cold-launches
      straight onto The Floor

### A2. Cold-start taps route at all — affects every notification type

Separate defect. The tap handler only listened for live taps and only attached
after auth resolved, so a tap that *launches* the app from terminated was
dropped. Force-quit is the normal state at 9am, so **A1 warm passing tells you
nothing about A1 cold.**

Run this row for all nine notifications in A3 — force-quit each time:

- [ ] Each notification cold-launches onto its target screen, not the feed

### A3. Every notification lands on the right screen

`npm run notify:test -- --user <yourUserId> --case <case>` in `../forum-api`
sends any of these on demand. `--list` shows them all.

| Case | Should open |
|---|---|
| `reply-on-post` | that post |
| `reply-on-article` | that article |
| `reply-in-debate` | that debate room |
| `comment-on-post` | that post |
| `new-dm` | the conversation with the sender |
| `post-upvoted` | that post |
| `follow-accepted` | that user's profile |
| `new-follower` | that user's profile |
| `follow-request` | the follow-requests screen |

- [ ] All nine open the correct screen (foreground, backgrounded, force-quit)
- [ ] Swiping a notification away does **not** navigate anywhere

### A4. The reminder migration

Installs that already have the old reminder keep the broken one — the schedule
lives in iOS and is not rebuilt on launch. `ensureFloorReminderCurrent()`
reschedules once on first launch after sign-in.

- [ ] Your phone has the reminder enabled from build 7. After updating to build 8
      and opening it once, the reminder still fires **and now opens the Floor**
- [ ] Settings still shows the toggle as on (the migration must not silently
      turn it off)
- [ ] Toggling off then on still works, and doesn't leave two reminders

### A5. Email notifications

Needs `email_enabled` + the per-kind flag on, and a verified address.

- [ ] Reply and DM emails arrive; the button links to
      `forumeveryside.com` + the same path as the push
- [ ] Upvotes **batch into a digest** rather than one email per vote
- [ ] `/auth/verify?token=` shows the success page and flips the account to verified
- [ ] Password reset still arrives as a 6-digit code with no link

### A6. Email links survive sign-in (web)

Previously an email link opened in a signed-out browser bounced to the landing
page and dropped the path, so every link was effectively "open the homepage."
The destination is now held in `sessionStorage` and handed back after auth.

- [ ] Sign out on the web app, then open a notification email link in that
      browser → after signing in you land on **the linked screen**, not the feed
- [ ] Same but as a brand-new account: the destination survives onboarding too
- [ ] Reloading the page while on the auth screen doesn't lose it
- [ ] Signing out from somewhere else later does **not** teleport you back to
      the old link

---

## B. Haptics — physical device only (`09fba59`)

34 files touched, adding haptics to controls that had none. **This has never
been felt**, only read. Sweep for two failure modes: a control that should
buzz and doesn't, and a control that buzzes twice.

- [ ] Feed: upvote, downvote, comment, repost, bookmark, share
- [ ] Carousel arrows and swipes; image carousel
- [ ] Comments: reply, vote, long-press menu, share sheet
- [ ] Profile: tab switches (`selectTick`), avatars, display names
- [ ] Settings: every toggle (`onValueChange`, not just `onPress`)
- [ ] Following / Messages / Summary / Source screens
- [ ] Dropdowns, text-input accessories, error-boundary retry
- [ ] Send / post / submit feel *heavier* (`tapMedium`) than ordinary taps
- [ ] **Modal backdrop dismissals do NOT buzz** — a backdrop is not a button

---

## C. iOS regressions from the web revamp (`262b713`)

The commit says "iOS is untouched throughout," and that is *almost* true — but
it edited shared components, and two changes are **not** platform-gated. These
are the highest-risk items after notifications, because nobody was looking for
them.

### C1. Text-field focus ring is new on iOS

`components/app-text-input.tsx:172` — `shellFocused: { borderColor: c.primary }`
is applied unconditionally, so **every text field on iOS now turns purple when
focused.** That was built for web. It may be fine or even nice; it is a
deliberate check, not an accident to ignore.

- [ ] Focused fields look right (login, create account, composer, DM, search, bio)
- [ ] The border does not shift layout or clip when focus lands

Also in that file: the shell changed from `ThemedView` to a plain `View`.
`styles.shell` sets `backgroundColor: c.card` explicitly so this should be
invisible — confirm anyway, in dark mode especially.

- [ ] Field backgrounds correct in both light and dark

### C2. Carousel arrows restyled on both platforms

`components/carousel.tsx` — the puck went from a 32pt black circle
(`rgba(0,0,0,0.46)`) with `‹`/`›` text glyphs to a 30pt translucent white pill
(`rgba(255,255,255,0.14)` + border) with `IconSymbol` chevrons. iOS gets this
too.

- [ ] Arrows are visible against light *and* dark carousel images
- [ ] Chevrons render as chevrons (SF Symbols path), not tofu
- [ ] Tap targets still comfortable at 30pt

### C3. Auth redirect logic changed — shared, so iOS is exposed

The A6 fix edits `app/_layout.tsx`'s redirect chain, which is **the same code
that gets you past login on iOS**. A mistake here doesn't look like a missing
deep link, it looks like a login loop or a blank screen after signing in.

The state machine was replayed offline across five scenarios (fresh sign-in,
sign-in through onboarding, signed-out-mid-app, root with nothing held, and a
stale held route) and all five behave correctly — but that was a simulation of
the logic, not the app.

- [ ] Fresh install → sign in → lands on the feed, no loop
- [ ] Fresh install → create account → onboarding → feed
- [ ] Sign out → sign back in → feed
- [ ] Kill and relaunch while signed in → straight to the feed, no auth flash

On iOS nothing should ever be held (there are no email-link cold starts into a
deep path), so all four should behave exactly as they did in build 7. Any
difference is a regression.

### C4. External links changed code path

`lib/open-external.ts` replaced direct `WebBrowser.openBrowserAsync` calls.
Native still routes to `openBrowserAsync`, so behaviour should be identical.

- [ ] Article links still open the in-app Safari sheet (**not** an external jump
      to Safari.app) and swipe-back returns to the app
- [ ] Check from: the feed, an article screen, the carousel, and a summary

---

## D. Small iOS fixes

| Commit | Change | Check |
|---|---|---|
| `534efbc` | Discover search spacing | [ ] Search bar spacing correct on Discover; no clipped or crowded rows |
| `534efbc` | Create-post photo visibility | [ ] Attached photo is visible in the composer before posting |
| `da60a41` | Profile comments meta row | [ ] Meta row on profile comments lays out correctly, wraps sanely, shows reply counts |

---

## E. Backend changes — already live, so testable *before* build 8

Both are deployed to production, which means **build 7 on your phone is already
using them.** They are not gated on build 8; they just have not been looked at
on a device.

### E1. Feed ranking (`c737478`)

Three structural handicaps on posts removed: per-kind weight normalisation,
unknown lean scoring 0.5 instead of 0.35, and `openRate` counting only `open`.

- [ ] Posts appear more often relative to articles than they used to
- [ ] For You / Random / Against You still feel distinct from each other
- [ ] No duplicate or obviously stale items

Caveat: there are ~144 posts against ~12k articles, so articles will still
dominate. That is volume, not ranking, and was deliberately left alone.

### E2. Spectrum decay (`c737478`)

Placement now weights recent activity by `0.5^(ageDays/365)`, floorless.

- [ ] Your spectrum position looks reasonable
- [ ] The history graph is continuous — no jump or reset at the changeover
- [ ] Position does **not** drift toward centre while you do nothing

### E3. Reply counts (`28b47f1`)

- [ ] Profile comments show reply counts

---

## F. Web-only — nothing to test on the phone

Listed so you don't go looking. Verify on forumeveryside.com instead.

- `8f8fd5f` — marketing landing page
- `262b713` — the persistent web shell (sidebar, Floor rail, content column),
  except the shared-component fallout in section C
- `46167ed` — docs only, no runtime effect

---

## Known gaps — not fixed, don't file these

- **Post spectrum coverage is ~40% unclassified.** Known, and a larger design
  question — see `../forum-api/docs/post-scoring-investigation.md`.
- **`expo-doctor` fails on six packages at patch drift.** Held deliberately —
  see below. Expect that check to be red; it is not a reason to stop the build.

---

## Before cutting build 8

```
npm run typecheck
npm run lint
npm run check:deep-links     # notification paths still resolve to screens
npx expo-doctor              # 1 check WILL fail — see below, that's expected
eas env:list                 # confirm EAS env
```

### Dependency versions — hold lifted, all six upgraded (2026-08-08)

The earlier plan was to hold six packages at their build-7 patch versions
through build 8. **That was reversed: all six are upgraded**, including
`expo-notifications` 57.0.8 → 57.0.9.

| package | build 7 | build 8 |
|---|---|---|
| `expo` | 57.0.10 | 57.0.11 |
| **`expo-notifications`** | **57.0.8** | **57.0.9** |
| `expo-router` | 57.0.10 | 57.0.11 |
| `expo-image-picker` | 57.0.7 | 57.0.8 |
| `expo-sharing` | 57.0.8 | 57.0.10 |
| `expo-symbols` | 57.0.1 | 57.0.2 |

**Consequence for section A.** Build 8's native notification code is no longer
identical to build 7's, so a notification failure has two possible causes: the
fix, or the bump. 57.0.9 contains only an Android notification-tap crash fix and
a web `SecurityError` fix — neither should reach an iPhone-only app whose
`lib/notifications.web.ts` is a no-op shim — so the bump is the less likely
explanation, but it is no longer excluded by construction.

If A1–A3 fail, check 57.0.9's changelog before concluding the routing fix is
wrong. If they pass, nothing to do.

`npm run notify:test` runs locally and calls `deliver()` in-process against the
production database, so it works without a deploy. The API refactor produces
byte-identical paths to what production already sends, so deploying is hygiene
rather than a prerequisite — but do it before relying on the tests as a
description of what's running:

```
railway up --service forum-api --detach   # NOT a bare `railway up`
curl -s https://api.forumeveryside.com/health
```
