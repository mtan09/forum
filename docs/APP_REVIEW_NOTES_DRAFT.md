# App Review notes draft

Do not put reviewer credentials in this file. Enter them only in App Store
Connect after the controlled account is created and verified.

## App Review Notes (version 1.0)

forum: Every Side is a native social news-discussion app. A network connection
is required. The supplied account is a normal, non-admin, public account.

The supplied account is configured and opens Home. To test signup, sign out and
choose Create Account. Signup asks for username, accessible email, password,
Terms/Privacy acceptance, and an Allow/Not now OpenAI choice. The three-step
welcome asks users to choose interests, optionally follow active accounts, then
verify email. Verification is sent only on reaching step 3. Closing mid-flow
keeps the account signed in; the next launch opens Home.

The prelaunch database has 31 fictional demo accounts, each visibly labeled
`(Fictional demo account)` and using a forum-owned logo avatar. Their bios,
viewpoints, and activity are fictional. A scheduler staggers social and Floor
positions for populated feeds and threads. It also gives new publisher cards a
few persona-shaped votes and occasionally one visibly fictional headline-based
comment. This is disclosed sample data, not real-user activity or a hidden
review mode. It will be removed before release; the reviewer account remains.

News flow: forum polls public RSS/Atom feeds and displays the publisher,
headline, date, canonical link, and a remote metadata image. The complete
article remains at the publisher.
Feed or page text may be processed transiently to derive relevance,
search/recommendation signals, and a one-way clustering profile, then discarded.
Article bodies are neither stored nor displayed. Summary cards contain
attributed headlines. Preview images are not copied to forum's storage.

Main areas to review:

1. The Home tab contains For You, Random, and Against You feeds. Random is
   intentionally centered to encourage exposure to different perspectives.
   Overflow menus include Not Interested and Report; user content also supports
   blocking its author.
2. Open a clustered story to see the Summary screen. Left, Center, and Right
   cards contain attributed publisher headlines. Publisher cards and images
   identify their source; opening one loads the original publisher page.
3. The Floor lets users place their own position on a spectrum, compare the
   aggregate distribution, and join the related thread. Review activity includes
   the visibly disclosed fictional community described above.
4. forumAI is optional. Before any personal data or user content is sent to
   OpenAI, forum identifies OpenAI, explains the data and purposes, links the
   Privacy Policy, and asks the user to Allow or choose Not now. Declining keeps
   browsing and text social features available under forum's on-server rules. Image
   uploads and forumAI ask again because they require OpenAI image safety or
   generation. The choice is in Settings → Privacy → OpenAI processing.
   News grounding contains eligible attributed headlines and forum-generated
   story metadata only; publisher article bodies are not stored or sent to
   OpenAI. Publishers with reviewed AI/automation restrictions are excluded.
5. UGC safety actions are available on posts, comments, profiles, and received
   DMs. Reports enter an admin queue; blocking prevents interaction both ways.
6. Account deletion is available in Settings → Account → Delete Account. It
   immediately removes the account and app activity, then queues associated
   stored media and private feedback screenshots for deletion within 24 hours.
7. Push permission is not requested at login. It is requested contextually
   when notifications are enabled in Settings. The only other device permission
   is Photo Library access for selecting an existing image.

The app has no purchases, subscriptions, advertising, cross-app tracking, or
social-login provider. Privacy Policy:
https://api.forumeveryside.com/legal/privacy

Publishers, photographers, and other rights holders can request a correction or
removal at support@forumeveryside.com or through the public Support URL above.

## TestFlight “What to Test” draft

Please test feed relevance and variety, story clustering, left/center/right
headline comparisons, article image/link reliability, The Floor spectrum and
thread, forumAI consent and responses, search results, profiles and follow
requests, posts/comments/DMs, report/block actions, notification settings,
light and dark mode, email verification/reset, feedback submission, and account
deletion. Report crashes, stale or mismatched stories, missing images, confusing
perspective labels, layout issues, and notification or email failures.

## Post-approval release checklist

1. Keep the version on manual release while Apple reviews it.
2. Set `DEMO_ACTIVITY_ENABLED=no` on the demo worker.
3. Run `npm run demo:cleanup` once as a dry run and verify that every target is
   an `is_demo = true` account and that the reported article interactions match
   the intended removal scope.
4. Run the guarded apply command with
   `DEMO_ACCOUNT_DELETE=DELETE_FICTIONAL_DEMO_ACCOUNTS`.
   The transaction also reconciles vote and comment counters on affected
   publisher articles.
5. Verify the reviewer account still signs in and remains non-admin.
6. Smoke-test Home, Search, The Floor, Summary, forumAI, profiles, and their
   empty states in the already-approved build.
7. Release the same approved build. Do not upload a replacement binary unless
   the smoke test discovers an actual defect that requires code changes.
