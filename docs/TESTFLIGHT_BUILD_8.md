# TestFlight build 8 — what to test

**Running doc.** Add to it as work lands; check items off on the device. When
this ships and is verified, start a new section rather than editing this one
away.

> ### ⚠️ "Build 8" arrives in TestFlight as **build number 9**
>
> `eas.json` sets `autoIncrement: true` with `appVersionSource: "remote"`, so
> EAS assigns the number and consumes one per *attempt*, not per success. The
> first attempt (`d9aa5ebb`) took number **8** and failed at signing — the
> provisioning profile predated the Associated Domains entitlement and had to be
> regenerated. The retry (`61108292`) succeeded and took number **9**.
>
> Number 8 does not exist in TestFlight and never will. Everywhere this document
> says "build 8" it means **the artifact labelled 1.0.0 (9)**. Look for 9 on the
> phone.

## Results — tested on device 2026-08-09, build 1.0.0 (9)

| section | outcome |
|---|---|
| **A2** cold-start routing | **pass** |
| **A3** all nine notifications + dismissal | **pass** — every one cold-launched onto its target; swipe-away navigated nowhere |
| **A5** email | **pass** — reply and DM arrive, button path matches the push, link opens the app |
| **B** haptics | **pass** |
| **C** iOS regressions from the web shell | **pass** |
| **D** small iOS fixes | **pass** |
| **G** Daily Brief | **pass** — 07:00 delivery real, re-running the job sent nothing (dedupe holds) |
| **H** Universal Links | **pass** — email link opens the app, not Safari |
| **I** post spectrum | **one real defect, below** |
| **A1 / A4** 9am Floor reminder | **NOT TESTED** — build 9 was installed after 09:00, so this morning's reminder fired on build 7. Needs tomorrow. |

A2 and A3 passing is the point of this build: the cold-start drain works, which
was the defect that made every launched-from-terminated tap a no-op.

### Defect found in I — opposition read as support

Two posts scored **0.78 (right)** while arguing the opposite:

> "Restricting birthright citizenship **won't** 'fix' public health—it's an
> administrative shock that destabilizes families…"

Receipts show `polarity: "for"` on both claims. Two causes compound:

- **Contrastive negation is not detected.** `claims.ts` catches "I oppose
  cutting Medicaid", but not "X **won't** fix Y" or "X **isn't** A—**it's** B",
  where the topic phrase is the sentence subject and the disagreement follows.
- **One span counted twice.** "Restricting birthright citizenship" fires a
  phrase rule (`immigration-enforcement · more`) *and* a template rule
  (`birthright citizenship` is also an `immigration-openness` term with
  "Restricting" as the contracting verb). Both push right, inflating 0.65 to
  0.78.

A confident placement on the side a post argues against is worse than the
centrist mislabelling `neutral_false_placement_rate` guards against.

**Deliberately not fixed by adding patterns.** That is the whack-a-mole that
produced the overfitted scorer `claims-4.0.0` replaced, and there is currently
no way to tell whether such a fix helps — see the deferred holdout set in
`../forum-api/CLAUDE.md`. This is the first defect where verification is
genuinely impossible without it.

## Baseline

| | |
|---|---|
| Last TestFlight build | **7** — `a0e7f7a`, production/STORE, 2026-08-06 16:13 EDT |
| This build | **1.0.0 (9)** — `61108292-1ef7-48f7-9175-89e09b92d6fe`, built 2026-08-09 02:48 UTC, from `81a4646` |
| Contents | everything after `a0e7f7a` on `master`, including the Daily Brief, Universal Links, and the rebuilt post scorer |
| Verified how | typecheck, lint, expo-doctor 20/20, 259 API tests, CI green; **no iOS runtime verification has happened for any of it** |

Sections **G**, **H** and **I** were added 2026-08-08 and cover work that did
not exist when this list was first written. All backend pieces are already
deployed, so G and I are testable on build 7 *before* build 8 exists — H is not,
because it depends on an entitlement that only a new binary carries.

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

## G. Daily Brief — new, backend already live

Opt-in daily edition. The API, the `forum-daily-brief` cron and the web client
are deployed, so most of this works on build 7 already.

**Don't wait for 07:00.** Trigger a delivery pass on demand from `../forum-api`:

```
npm run daily-briefs        # runs one pass against production
```

It only selects users whose local time is past 07:00 and who have opted in, so
set your timezone by opening the app first, then enable the toggles.

### G1. Opting in

- [ ] Settings → **Push reminder** and **Email Daily Brief** both toggle on
- [ ] With an unverified email, enabling the email brief shows **one** alert
      ("Verify your email first"), not two, and both toggles revert
- [ ] Enabling push when push is off enables push first, then the brief

### G2. The brief itself

- [ ] The sheet opens automatically once after sign-in, and **not again** the
      same day
- [ ] Sections render: Across forum (3 stories), On The Floor, Around you
- [ ] Story lines read `N outlets · N articles` with **window-scoped** counts —
      a long-running story should not claim 180 articles inside a daily brief
- [ ] **"Worth hearing" will usually be empty.** Known and deliberate — see
      `docs/DAILY_BRIEF.md`. Not a bug to file.
- [ ] Date chips let you page back through earlier editions
- [ ] Dismissing and reopening from the same day shows the same edition

### G3. Delivery — the part with the most new code

- [ ] Push arrives, and tapping it opens **that date's brief**, not the feed
- [ ] Force-quit, then tap → cold-launches onto the brief
- [ ] Email arrives; the button opens the brief; story links open summaries
- [ ] **Run `npm run daily-briefs` twice in a row → exactly one email and one
      push.** This is the dedupe fix; a second copy means the claim failed.
- [ ] Turn both toggles off, run the pass → nothing arrives

### G4. Unsubscribe

- [ ] The email footer link opens a confirmation page
- [ ] Confirming turns **Email Daily Brief** off in Settings, and leaves the
      in-app brief working
- [ ] Gmail's own list-unsubscribe control also works (it POSTs, and should
      silently succeed)

### G5. Timezone

- [ ] Change the device timezone, reopen the app, request a brief → **On The
      Floor** shows rooms for *your* current date, not US Eastern's

---

## H. Universal Links — build 8 only, cannot work before it

`associatedDomains` is an entitlement compiled into the binary. Build 7 does not
have it, so **every check here fails on build 7 and that is expected.** The
association file is already live and correct.

- [ ] After installing build 8, tap a `forumeveryside.com/post/...` link in
      Messages or Notes → opens **the app**, not Safari
- [ ] Same for `/article/...`, `/summary/...`, `/debate/...`, `/brief/...`
- [ ] A link to a signed-out route still behaves sensibly
- [ ] Long-press a link → the share sheet offers "Open in forum"

If links open Safari on build 8, check `apple-app-site-association` is served
from `https://forumeveryside.com/.well-known/` as `application/json` before
suspecting the app — and note Apple's CDN caches it, so a bad version can
persist after the fix.

---

## I. Post spectrum — rebuilt scorer, already live

`claims-4.0.0` replaced `stance-3.0.0`, and all 178 posts were re-scored. This
changes which posts show a spectrum bar and where the marker sits.

- [ ] Spectrum bars appear on posts that clearly argue a position
- [ ] A post that *opposes* something is placed on the opposing side, not left
      blank — this was the largest bug fixed
- [ ] Posts that state no position (questions, observations, "both parties…")
      show **no** spectrum rather than a centre marker
- [ ] Nothing obviously backwards. Placements that look wrong are worth
      reporting with the post text — there is no labelled test set yet, so your
      eyes are currently the only check.

Caveat: about 65 of 154 visible posts are deliberately unplaced. Blank is a
valid outcome, not a missing feature.

---

## Known gaps — not fixed, don't file these

- **Post spectrum coverage is ~40% unclassified.** Known, and a larger design
  question — see `../forum-api/docs/post-scoring.md`.
- **`expo-doctor` fails on six packages at patch drift.** Held deliberately —
  see below. Expect that check to be red; it is not a reason to stop the build.

---

## Before cutting build 8

```
npm run typecheck
npm run lint
npm run check:deep-links        # notification paths still resolve to screens
npm run check:universal-links   # AASA matches app.json, _headers and the routes
npx expo-doctor                 # now 20/20 — the old drift failure is gone
eas env:list                    # confirm EAS env
```

All six pass as of 2026-08-08. `expo-doctor` reporting a failure is now
meaningful again — it used to be expected noise.

**Do not skip `check:universal-links`.** Section H depends on the association
file matching the entitlement, and a mismatch is invisible until you are holding
the phone.

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
