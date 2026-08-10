# TestFlight build 10 — what to test

**Running doc.** Add to it as work lands; check items off on the device.

## Baseline

| | |
|---|---|
| Previous build | **1.0.0 (9)** — `81a4646`, tested on device 2026-08-09, results in `TESTFLIGHT_BUILD_8.md` |
| Client delta | **one file.** `context/authContext.tsx`, +14 −4 (`08a1377`). Everything else since build 9 is documentation. |
| Backend delta | three fixes, deployed 2026-08-09 — already live, testable without this build |

**This build is not worth cutting on its own.** One 14-line fix does not justify
a build, a submission and a TestFlight round trip. Batch it with the next real
client change. What follows is what to check *when* it ships.

Note the build number will be **11 or higher** — `autoIncrement` consumes a
number per attempt, and attempt 8 was spent on a failed signing run. Read
"build 10" as "the next build after 9".

---

## A. The session fix — the only client change

`restoreSession()` used to delete the stored token from an unqualified `catch`,
so *any* failure of the startup `/users/me` check signed the user out — not just
an expired credential. A network failure did it too. Now only 401 and 403 clear
the token; network errors and 5xx leave it alone.

This is the one thing that genuinely needs the new binary.

### A1. Losing connectivity does not sign you out

- [ ] Sign in. Force-quit the app.
- [ ] **Turn on Airplane Mode.**
- [ ] Launch the app. You should still be **signed in** — the feed shell,
      possibly with empty or error states, but **not** the sign-in landing page.
- [ ] Turn Airplane Mode off, pull to refresh → content loads, still signed in.

On build 9 and earlier this signs you out and you have to log in again.

### A2. A genuinely invalid token still signs you out

The fix must not go too far — a real rejection has to still clear the session.

- [ ] Sign out explicitly from Settings → lands on the landing page, and
      relaunching keeps you signed out.

Harder to test properly without rotating `JWT_SECRET`, which logs out every
device. If that rotation happens for other reasons, confirm then that the app
returns you to sign-in rather than sitting in a broken half-signed-in state.

### A3. Nothing regressed in the normal path

- [ ] Fresh launch with signal → straight to the feed, no auth flash
- [ ] Sign out, sign back in → feed
- [ ] Kill and relaunch while signed in → feed

---

## B. Backend fixes — already live, test before this build exists

All three deployed 2026-08-09. No new binary needed.

### B1. Daily Brief story counts are no longer zero

A card in the 2026-08-09 brief read **"0 outlets · 0 articles"**. Counts are now
frozen at generation instead of recomputed at read time against a corpus that
has since churned.

- [ ] Tomorrow's 07:00 brief: every story card shows a **non-zero** outlet and
      article count
- [ ] Open an older edition from the date chips → its counts are still sensible,
      not zero
- [ ] Counts look like a *day's* coverage, not a story's lifetime — a long-running
      story should not claim 180 articles inside a daily brief

### B2. Floor rooms keep their coverage

Subtopics cited by a debate or a brief in the last 8 days now keep their article
membership when the story drops off the hot list.

- [ ] Open each of today's Floor rooms → all show attributed coverage
- [ ] Open a room from **two or three days ago** → still shows coverage rather
      than an empty shell

### B3. Notification emails still carry their button

Unrelated behaviour change: an unset `WEB_APP_URL` now logs a warning instead of
silently dropping the link. Production sets it, so nothing should differ.

- [ ] A reply or DM email still has the "Open forum" button, still pointing at
      `forumeveryside.com` + the same path as the push

---

## C. Carried over from build 9 — never tested

### C1. The 9am Floor reminder — the original bug

**This is still unverified.** Build 9 was installed after 09:00 on 2026-08-09,
so that morning's reminder fired on build 7. It is the specific defect the
previous build existed to fix.

- [ ] At 9am with the reminder enabled: it fires
- [ ] **Force-quit first**, then tap → cold-launches onto The Floor, not the feed
- [ ] Backgrounded → tap → The Floor

### C2. The reminder migration

- [ ] Settings still shows the reminder toggle **on** (the migration must not
      silently disable it)
- [ ] Toggling off and on again does not leave two reminders

`ensureFloorReminderCurrent()` runs once per install after sign-in, and build 9
has been launched many times, so this has almost certainly already happened —
but it has not been observed.

---

## Known and deliberately not fixed — do not file these

- **Posts that argue against something can be placed on the side they oppose.**
  "Restricting birthright citizenship won't fix public health" scores 0.78
  right. Cause and reasoning in `TESTFLIGHT_BUILD_8.md`. Not patched, because
  there is no way yet to tell whether a patch helps — see the deferred holdout
  set in `../forum-api/CLAUDE.md`.
- **"Worth hearing" in the Daily Brief is usually empty.** Documented in
  `DAILY_BRIEF.md`; a ranking-order issue, not a bug in the brief.
- **The upvote digest email sends but may not arrive.** Resend accepts it and
  the row clears; this is deliberability, not code. Check Resend's delivery log.
- **13 Floor/brief subtopics emptied before the fix landed** and are not
  retroactively refilled. `routes/topics.ts` resolves past them for the Floor;
  brief cards for those specific stories may still read zero.

---

## Before cutting the build

```
npm run typecheck
npm run lint
npm run check:deep-links
npm run check:universal-links
npx expo-doctor                 # 20/20 as of 2026-08-09
eas env:list production         # confirm SENTRY_AUTH_TOKEN is current
```

All six passed on 2026-08-09. `expo-doctor` failing is now meaningful again —
it used to fail permanently on dependency drift, which is fixed.
