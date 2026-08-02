# App Review notes draft

Do not put reviewer credentials in this file. Enter them only in App Store
Connect after the controlled account is created and verified.

## App Review Notes (version 1.0)

forum: Every Side is a native social news-discussion app. A network connection
is required. The supplied account is a normal, non-admin, public account.

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
   aggregate distribution, and join the related discussion thread.
4. forumAI is optional. Before any personal data or user content is sent to
   OpenAI, forum identifies OpenAI, explains the data and purposes, links the
   Privacy Policy, and asks the user to Allow or choose Not now. Declining
   preserves browsing, voting, saving, and following. The choice can be changed
   under Settings → Privacy → OpenAI processing.
5. UGC safety actions are available on posts, comments, profiles, and received
   direct messages. Reports enter an admin review queue; blocking prevents
   interaction in both directions. Support contact information is available at
   https://api.forumeveryside.com/support.
6. Account deletion is available in Settings → Account → Delete Account. It
   immediately removes the account and app data and queues associated stored
   media for deletion within 24 hours.
7. Push permission is not requested at login. It is requested contextually
   when the user enables notifications in Settings. The only other declared
   device permission is Photo Library access for selecting an existing image.

The app has no purchases, subscriptions, advertising, cross-app tracking, or
social-login provider. Privacy Policy:
https://api.forumeveryside.com/legal/privacy

## TestFlight “What to Test” draft

Please test feed relevance and variety, story clustering, left/center/right
headline comparisons, article image/link reliability, The Floor spectrum and
thread, forumAI consent and responses, search results, profiles and follow
requests, posts/comments/DMs, report/block actions, notification settings,
light and dark mode, email verification/reset, feedback submission, and account
deletion. Report crashes, stale or mismatched stories, missing images, confusing
perspective labels, layout issues, and notification or email failures.
