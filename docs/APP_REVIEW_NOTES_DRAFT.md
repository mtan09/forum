# App Review notes draft

Do not put reviewer credentials in this file. Enter them only in App Store
Connect after the controlled account is created and verified.

## App Review Notes (version 1.0)

forum: Every Side is a native social news-discussion app. A network connection
is required. The supplied account is a normal, non-admin, public account.

Because forum has not launched publicly and has no real community yet, this
review database includes 31 fictional demo accounts. Every one is visibly
identified by `(Fictional demo account)` on profiles and account-bearing social
surfaces and uses a forum-owned colored logo avatar. Their bios, viewpoints,
and activity are fictional. A backend fixture scheduler staggers their posts,
comments, reactions, and Floor positions so App Review can test populated feeds and
threads over time. Some new fixture text is generated from developer-authored
persona instructions and current attributed publisher headlines, then passes
forum's moderation checks. This is disclosed sample data, not real-user
activity and not a hidden review mode. The accounts and fixture activity will
be removed before public release; the supplied non-admin reviewer account will
remain available.

The same scheduler gives newly ingested publisher cards a small number of
persona-shaped votes and occasionally one visibly fictional community comment.
Those comments are generated from the attributed headline only and do not
claim to reproduce or summarize the publisher's full article.

News-content flow: forum polls public publisher RSS/Atom feeds and shows the
publisher name, attributed headline, publication date, canonical article link,
and a remote preview image when publisher feed or page metadata supplies one.
The complete article remains at the publisher. During ingestion, feed or page
text may be processed transiently on forum's server to derive relevance,
placement, bounded search/recommendation signals, and a one-way clustering
profile; the article body is then discarded and is neither stored nor displayed.
Summary perspective cards contain attributed headlines rather than copied body
text. Publisher preview images are not copied into forum's object storage and
remain visually connected to their publisher card and original link.

Main areas to review:

1. The Home tab contains For You, Random, and Against You feeds. Random is
   intentionally centered to encourage exposure to different perspectives.
   The overflow menu on posts and publisher articles contains Not Interested
   and Report; user-generated content also supports blocking its author.
2. Open a clustered story to see the Summary screen. Left, Center, and Right
   cards contain attributed publisher headlines rather than copied article
   bodies. Publisher cards and images identify their source, and opening an
   article takes the user to the original publisher page for the full story.
3. The Floor lets users place their own position on a spectrum, compare the
   aggregate distribution, and join the related discussion thread. During
   review, the displayed room activity includes the visibly disclosed
   fictional demo community described above.
4. forumAI is optional. Before any personal data or user content is sent to
   OpenAI, forum identifies OpenAI, explains the data and purposes, links the
   Privacy Policy, and asks the user to Allow or choose Not now. Declining
   preserves browsing, text posts, comments, direct messages, profile editing,
   voting, saving, following, reporting, and blocking under forum's on-server
   safety rules. Image uploads and forumAI ask again because those features
   require OpenAI image-safety or generation. The choice can be changed under
   Settings → Privacy → OpenAI processing.
   News grounding contains only eligible attributed publisher headlines and
   forum-generated story metadata; publisher article bodies are neither stored
   nor sent to OpenAI. Content from publishers with reviewed AI/automation
   restrictions is excluded from OpenAI context. Locally derived aggregate
   clustering signals may still help forum identify a covered topic, after which
   forumAI receives only eligible attributed headlines for that topic.
5. UGC safety actions are available on posts, comments, profiles, and received
   direct messages. Reports enter an admin review queue; blocking prevents
   interaction in both directions. Support contact information is available at
   https://api.forumeveryside.com/support.
6. Account deletion is available in Settings → Account → Delete Account. It
   immediately removes the account, app activity, and structured feedback
   records, then queues associated stored media and private feedback screenshots
   for deletion within 24 hours.
7. Push permission is not requested at login. It is requested contextually
   when the user enables notifications in Settings. The only other declared
   device permission is Photo Library access for selecting an existing image.

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
