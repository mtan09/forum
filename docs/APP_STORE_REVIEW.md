# App Store Review strategy

Last official-policy review: 2026-08-05

This is the durable release-policy record for forum. It exists so future work
does not rely on conversational memory or repeatedly collapse Apple policy,
publisher terms, copyright law, and conservative risk management into one
category.

## Product priority

Preserve as much of forum's functionality as possible while presenting an
honest, stable, reviewable iPhone app. Do not remove useful news analysis,
publisher previews, or social functionality merely because a more conservative
implementation is possible. Do not misrepresent the app to App Review.

## Current Apple sources

- App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- App Store categories:
  https://developer.apple.com/app-store/categories/
- App information and Content Rights:
  https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- App Review preparation:
  https://developer.apple.com/app-store/review/
- App Review attachments:
  https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-attachments
- App privacy:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Apple design fonts and license terms:
  https://developer.apple.com/fonts/

Apple changes its rules. Re-check official Apple sources before the initial App
Store submission, after a relevant rejection, and whenever this review is more
than 30 days old during active release work.

## Apple rules that directly affect forum

### 1.2 — User-generated content

The app must provide objectionable-content filtering, reporting, timely
moderation, user blocking, and published contact information. Review posts,
comments, DMs, profiles, images, and other user submissions as one moderation
surface. The production reviewer account must be able to exercise reporting and
blocking.

Implemented release behavior: post, article, comment, profile, and received-DM
actions use the same report queue. A DM report is accepted only from the
message recipient; the admin can hide that message, ban its sender, or dismiss
the report. The same actions are accessible from the visible overflow button
and from a press-and-hold preview throughout the app. Authors may permanently
delete their own posts and comments; post deletion also removes its thread,
while deleting a comment removes its reply subtree. This author control is a
product behavior, not a claim that Guideline 1.2 explicitly requires per-item
deletion. Posts and attributed publisher links support direct reposts and
authored quote posts. A direct repost references the original item; a quote is
moderated and reportable as a new post while its embedded source remains
tappable. Blocking removes interaction in both directions. Public accounts
can receive DMs normally; a private account accepts a DM only from an account it
already follows, while prior thread history remains readable. The hosted
support page provides the moderation contact path.

### 1.5 — Developer information

The app and Support URL must contain accurate, working contact information.

### 2.1 — App completeness

The submitted build must be stable, its URLs and production backend must be
live, and App Review must receive a functioning non-admin account with access to
the complete experience. Remove placeholder content. Test on a physical
supported iPhone using production services.

### 2.2 — Beta testing

Use TestFlight for beta distribution. A TestFlight build intended for external
testing must still comply with the App Review Guidelines.

### 2.3 — Accurate metadata

The description, privacy answers, screenshots, previews, age rating, review
notes, and "What's New" text must match the submitted build. Do not hide
features from review. Use forum-owned or controlled demo imagery in permanent
App Store marketing assets where practical; Apple separately requires rights
for screenshot and preview materials.

### Temporary fictional review community

The initial review database may contain a controlled fictional community so a
reviewer can exercise social feeds, threaded discussion, recommendation
variety, profiles, and The Floor before forum has public users. This is a data
fixture, not a hidden review-only feature:

- Every fictional account is visibly marked `(Fictional demo account)` on its
  profile and account-bearing social surfaces and uses a forum-owned logo
  avatar. Compact native navigation titles may use the name alone so controls
  remain visible on small iPhones.
- Each account has a distinct fictional role, bio, political lean, interests,
  and writing voice. Do not present a demo persona as a real person.
- A backend worker may schedule posts, comments, reactions, and Floor pins at
  staggered intervals. Generated text is grounded only in current topic titles
  and attributed publisher headlines, is screened by the same safety system,
  and is stored as auditable demo-generated content.
- The worker may interact with fictional accounts, their content, publisher
  articles, and Floor rooms. Its presence and temporary purpose must be stated
  in App Review Notes; never imply that the activity came from real users.
- The worker requires the explicit `DEMO_ACTIVITY_ENABLED=yes` production
  setting. Its durable jobs are idempotent across retries and visible through
  the admin status API.
- Choose manual release. After approval, disable the worker, run the guarded
  demo cleanup, smoke-test the approved build against the empty/clean state,
  and only then release. Cleanup is account-scoped through `is_demo`, cascades
  the personas' activity, and reconciles cached publisher-article vote/comment
  counters. Deleting fixture rows does not change the reviewed binary or core
  product behavior. Keep the non-admin reviewer account active.

Screenshots may include these controlled fictional accounts because their
identities and avatar artwork are owned by forum and visibly disclosed. Do not
use the former third-party portrait URLs.

### 4.2 — Minimum functionality

Apple says apps should not primarily be web clippings, content aggregators, or
collections of links. Apple also explicitly lists RSS readers and news digests
as valid News-category apps. Forum must present its differentiating native
functionality clearly:

- posts, comments, profiles, follows, votes, bookmarks, and DMs;
- direct reposts and authored quote posts with in-app source navigation;
- left/center/right coverage comparison;
- bias spectra and user spectrum participation;
- The Floor;
- multi-source hot-topic clustering and original coverage synthesis;
- forumAI grounded in attributed coverage information; and
- search across community posts and publisher links.

Do not weaken these features so far that the product becomes a basic link list.

### 4.8 — Login services

Forum's own email/password authentication does not by itself trigger the
equivalent-login requirement. If a third-party or social login is added, review
Guideline 4.8 before release.

### 5.1 — Privacy

Maintain an accurate privacy policy and App Privacy answers covering forum and
integrated third parties. Request only data needed for the feature, explain
permissions contextually, provide consent withdrawal where required, and keep
in-app account deletion functional. Disclose relevant OpenAI, Sentry, Expo,
Railway, Neon, R2, Resend, and push-notification behavior.

Guideline 5.1.2(i) explicitly requires disclosure of where personal data is
shared with third parties, including third-party AI, and explicit permission
before sharing. It does not require forum to use third-party AI.

forum's implemented OpenAI posture is:

- Current consent version: `2026-08-02`.
- Signup presents separate Allow and Not now choices for later OpenAI-dependent
  features, but the signup username itself is checked only by deterministic
  on-server rules and is not sent to OpenAI. Not now still creates an account.
- Existing users are not grandfathered. Before the next affected action, a
  review-visible sheet identifies OpenAI, the data categories, moderation and
  forumAI purposes, the Privacy Policy, the effect of declining, and withdrawal.
- The backend enforces current consent before OpenAI moderation or forumAI, so
  old clients cannot bypass the UI.
- Deterministic on-server rules hard-stop narrow categories for every user.
  When a user has accepted the current disclosure, text submissions also
  receive OpenAI's broader moderation check.
- Declining or withdrawing preserves browsing, text posts, comments, DMs,
  profile editing, voting, saving, following, reporting, and blocking. No
  declined text is sent to OpenAI. Image uploads, feedback screenshots, and
  forumAI ask again because those features inherently use OpenAI image-safety
  or generation.
- Sharing or quoting an existing forum post or publisher article stores a typed
  reference to that already-reviewed item. The reference itself does not resend
  the original contents to OpenAI. New quote commentary is a normal post and
  follows the post consent/moderation behavior above; ordinary DM text likewise
  follows the DM behavior above.
- Settings → Privacy → OpenAI processing shows current status and allows
  withdrawal. Withdrawal stops future sharing and never claims to reverse
  processing that already occurred.
- Permission evidence stores user id, disclosure version, decision status, and
  timestamp. No rejected raw content is stored in the moderation audit.
- Settings → Delete Account transactionally removes profile and activity data,
  including structured feedback text and metadata. A durable outbox job
  removes the account's public media and private feedback screenshots with
  retries and a 24-hour deadline; old JWTs fail as soon as the account row is
  gone.

Feed personalization is first-party processing. forum records feed impressions,
opens, approximate dwell time, outbound publisher opens, selected interests, and
"Not interested" choices. Semantic recommendation vectors are generated locally
from forum's existing content and are not an additional OpenAI purpose. Settings
offers a feed-personalization reset, and the hosted privacy policy discloses the
collection and ranking use. This behavior does not use advertising identifiers
or track users across other companies' apps and websites.

Post spectrum placement is also first-party processing. The versioned scorer
uses committed framing terms, policy rules, compositional matching, and reviewed
local prototypes; post text is not sent to OpenAI or another third party for the
placement. OpenAI moderation remains a separate consent-controlled safety step.

Keep the consent copy, hosted policy, App Privacy answers, age rating, and
Review Notes aligned. If the provider, purposes, or data categories materially
change, bump the version and require a new decision.

The App Store content rating is not itself a contractual minimum account age.
As of August 2, 2026, App Store Connect calculates forum as 16+ under Apple's
current rating system and 17+ on operating systems earlier than version 26,
principally because political news regularly includes mature real-world themes
such as war and political strife. Do not describe this result as an Apple
requirement that every account holder be at least 17. Signup accepts the Terms
and Privacy Policy; the Terms instead require compliance with applicable law,
any required parent or guardian consent, and device or App Store age controls.

The release build declares Photo Library access because users can select an
existing image. It does not declare camera, microphone, or Face ID access; none
of those capabilities is used. Sentry disables default PII and removes account
identifiers, authorization/cookie headers, URL query strings, and network
request/response bodies before events leave the app.

### 5.2 — Intellectual property and third-party services

Apple requires apps that access or display third-party content to be permitted
under the service's terms and says authorization may be requested. App Store
Connect also requires the developer to declare third-party Content Rights.

This is not the same as a ban on news aggregation. The review-facing product
posture is:

- forum indexes and analyzes coverage;
- the publisher remains the destination for the full reporting;
- every publisher item is attributed and linked;
- forum does not display a copied full article;
- topic blurbs are original outlet-count notes and perspective cards are
  clearly attributed publisher headlines; and
- publisher material must not imply sponsorship or affiliation.

Answer the Content Rights field truthfully. Keep a concise review attachment
ready that explains article flow, attribution, publisher navigation, original
analysis, remote previews, moderation, and takedown contact. Do not overwhelm
the initial submission with every source-policy note unless Apple asks. The
prepared text is `docs/APP_REVIEW_CONTENT_RIGHTS_DRAFT.md`.

## Article-content strategy

Apple does not specifically require transient-only analysis or deletion of
ingested article text. forum nevertheless uses transient analysis as a
rights-conscious product and engineering choice based on the source-policy
record in `PUBLISHER_CONTENT_RIGHTS.md`; this must not be described as an Apple
mandate.

1. Fetch recent article text from the publisher feed or page.
2. Use that text only in memory during the ingest transaction to derive lean,
   relevance, confidence, topics, hashtags, search terms, a local recommendation
   vector, and a one-way weighted clustering profile.
3. Store those bounded derived values with the publisher headline, source,
   canonical URL, date, and direct image URL. Do not store the article body.
4. Do not display article bodies in the feed, article detail, search, profile,
   or summary interfaces.
5. Do not expose readable article-body-derived prose through public APIs. Search
   uses the headline and bounded derived terms; recommendations use the stored
   local vector; clustering uses one-way term identifiers and weights.
6. Keep the publisher as the destination for reading the complete article.
7. Keep public multi-perspective summaries headline-only: one attributed
   publisher headline for each available Left/Center/Right band.

Publisher terms and copyright analysis remain separate from Apple review. Do
not claim that transient processing itself creates permission. Describe the
implemented behavior truthfully if App Review asks.

### Implemented architecture

- `@extractus/article-extractor` uses substantial feed text first and falls
  back to the publisher page. The resulting text stays in process memory only
  long enough to derive the stored fields and is not written to PostgreSQL.
- `articles.analysis_profile` stores at most 48 readable weighted search/label
  terms and at most 512 SHA-256-derived weighted term identifiers for clustering.
  It contains no word order or article prose and is not a substitute for a body.
- `articles.analysis_text` is a bounded search-term string;
  `recommendation_embedding` is a local numeric vector. Public article responses
  include neither internal analysis field.
- `articles.content` remains temporarily in the schema only for a staged rollout,
  is nullable, and is protected after the scrub by a validated database check
  requiring every value to be `NULL`.
- Story `short_summary` is an original outlet-count coverage note.
- Story `long_summary` contains only attributed publisher headlines. A
  regression test verifies that article-body sentences never enter it.
- Rescoring may refetch a page for transient recomputation, but never persists
  the body. `scrub:article-bodies` derives missing profiles before nulling legacy
  bodies and verifies clustering agreement before its guarded apply mode runs.
- A production dry-run on the newest 400 articles retained 100% of feature
  weight and matched all 79,800 threshold decisions, including all 225 joins.

## forumAI coverage context

forumAI retrieves a small, clamped set of eligible attributed headlines and
forum-generated story metadata. Retrieval uses the stored bounded profile,
balances outlets and perspective bands when possible, and supports both
topic-specific and broad "today's biggest story" prompts. Publisher bodies are
not stored or sent to OpenAI.

Sources with explicit AI, RAG, automated-analysis, or closely related policy
restrictions are excluded by a machine-enforced allow/deny decision. Unknown
sources fail closed. The current deny set is The New Republic, HuffPost, Vox,
The New Yorker, The Atlantic, The Guardian, NBC News, ABC News, CNBC, Sky News,
New York Post, The Daily Wire, Newsmax, The Blaze, and Breitbart. Inclusion of a
different publisher's headline is not a claim of a blanket AI license; it is the
current risk-calibrated operating policy and must be updated with the registry.

Passing an eligible article ID may pin the conversation to its attributed
headline. A restricted article does not show the forumAI action in the client,
and the API independently rejects a forged or stale request before consuming
the user's daily forumAI allowance. User-post context remains subject to the
user's explicit OpenAI consent.

## Publisher-image strategy

Do not treat "never use R2" as an Apple requirement. Image delivery is a product,
performance, privacy, and rights decision.

The implemented app restores direct publisher image delivery. Ingestion checks
publisher RSS/Atom media first and may fall back to image metadata on the
publisher page, stores the selected URL in `articles.media`, and lets the client
load it with the normal device cache. It does not require the retired
rights-mode fields or an R2 transformation before showing the image.

Do not use a single publisher photograph as if it were forum's own story art.
Summary image carousels are acceptable product UI: label each item with its
publisher, keep it connected to the corresponding source link, use restrained
thumbnail dimensions, and fall back cleanly when unavailable.

Validation remains narrow and product-driven: malformed article-path metadata
and explicit audio/video/HLS assets are rejected, while valid extensionless CDN
image URLs remain eligible. A failed publisher image falls back to forum-owned
purple artwork. R2 remains in use for user uploads and private feedback
screenshots, not as a mandatory publisher-image proxy.

Publisher articles quoted by users keep the same bounded preview posture as
other article cards: source, headline, optional remote feed image, and an in-app
route to the attributed article screen. Quoting does not copy or display the
publisher's article body.

## Typography strategy

Do not bundle or redistribute Apple's downloadable San Francisco font files.
Apple devices use their native system font, which renders San Francisco without
shipping a font asset. The web app uses the operating-system stack: San
Francisco on Apple devices, Segoe UI on Windows, Roboto on Android, followed by
Helvetica, Arial, and generic sans-serif fallbacks. Native Android and Windows
use Roboto and Segoe UI respectively.

This preserves the intended cross-platform appearance while respecting Apple's
separate license restriction on the downloadable SF font files. It is a font
license and distribution decision, not an App Review requirement to use any
particular typeface.

## Store positioning

- Primary category: News
- Secondary category: Social Networking
- Product description: a social news-discussion platform that organizes
  attributed coverage across perspectives and directs readers to publishers,
  rather than a publisher or full-article reader.
- Exact store copy is maintained in `docs/APP_STORE_METADATA_DRAFT.md`; update
  App Store Connect from that file instead of improvising release metadata.

## App Store Connect audit state (2026-08-05)

- Name, subtitle, promotional text, description, and keywords match
  `docs/APP_STORE_METADATA_DRAFT.md`. Public release copy does not describe the
  production app as a beta and accurately describes perspective cards as
  attributed publisher headlines.
- App Privacy discloses 15 collected data types. Browsing History is linked to
  the account, used for analytics and product personalization, and not used for
  tracking. Product Interaction and Other Usage Data are linked, used for app
  functionality, analytics, and product personalization, and not used for
  tracking. The native privacy manifest uses the same purposes.
- The truthful age-rating questionnaire calculates 16+ in most storefronts,
  with Apple's regional mappings (including 18+ in Brazil and 15+ in Korea).
  The app does not override that calculated rating.
- Availability is configured for 174 storefronts. China mainland is excluded;
  future App Store storefronts are enabled automatically. Mac and Vision Pro
  availability remain off, and distribution remains public/discoverable.
- Manual release remains the required release mode for the fictional-fixture
  cleanup sequence.
- The account holder completed DSA compliance on 2026-08-05; App Store Connect
  reports that all current regulatory requirements are complete. Copyright is
  `2026 Michael Tan`, and the non-admin reviewer credentials and notes are saved
  only in App Store Connect. The notes explain both the configured-account path
  and the complete new-account onboarding flow. Screenshots and the final build
  selection remain incomplete. Build 7 has not been created.

## Submission checklist

- Production backend, database, email/reset links, push setup, forumAI, images,
  support, privacy, and deletion are reachable.
- The review-facing URLs are
  `https://api.forumeveryside.com/support` and
  `https://api.forumeveryside.com/legal/privacy`. The production browser client
  is deployed through Cloudflare Pages at `https://forumeveryside.com`;
  `https://forum-web-6tw.pages.dev` is the generated Pages hostname and
  `https://mtan-forum.expo.app` remains an EAS Hosting fallback.
- Signup allow/decline, existing-user just-in-time OpenAI permission, withdrawal,
  and re-consent work; no affected request reaches OpenAI before current consent.
- Reviewer credentials are non-admin, stable, and stored only in App Store
  Connect. The review account uses a controlled real inbox and remains
  available for the lifetime of the reviewed build; the separate owner account
  is never supplied to Apple.
- UGC filtering, report (including received DMs), block, admin response, and
  contact paths work.
- App Privacy and age-rating answers match the build.
- Screenshots show the real app using controlled, visibly labeled fictional
  demo accounts/content.
- Review notes disclose that the fictional community's staggered activity is
  automated and temporary prelaunch fixture data.
- Publisher cards attribute the source and open the complete publisher page.
- Review notes explain the social and multi-perspective functionality, article
  flow, moderation, account deletion, and any non-obvious permissions.
- App availability excludes China mainland unless the account can supply the
  Internet News Information Permit Apple lists for apps with news content.
- No hidden review mode, dormant feature, placeholder URL, test credential in
  the repository, or misleading Content Rights statement exists.
