# App Store Review strategy

Last official-policy review: 2026-07-30

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
the report. Blocking removes interaction in both directions. The hosted support
page provides the moderation contact path.

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

### 4.2 — Minimum functionality

Apple says apps should not primarily be web clippings, content aggregators, or
collections of links. Apple also explicitly lists RSS readers and news digests
as valid News-category apps. Forum must present its differentiating native
functionality clearly:

- posts, comments, profiles, follows, votes, bookmarks, and DMs;
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

- Current consent version: `2026-07-30`.
- Signup presents separate Allow and Not now choices before the username can be
  sent to OpenAI. Not now still creates an account; deterministic on-server
  username rules run without OpenAI.
- Existing users are not grandfathered. Before the next affected action, a
  review-visible sheet identifies OpenAI, the data categories, moderation and
  forumAI purposes, the Privacy Policy, the effect of declining, and withdrawal.
- The backend enforces current consent before OpenAI moderation or forumAI, so
  old clients cannot bypass the UI.
- Declining or withdrawing preserves browsing, voting, saving, and following.
  Posting, commenting, DMs, moderated profile edits, image uploads, feedback
  screenshots, and forumAI ask again because they use OpenAI safety or
  generation.
- Settings → Privacy → OpenAI processing shows current status and allows
  withdrawal. Withdrawal stops future sharing and never claims to reverse
  processing that already occurred.
- Permission evidence stores user id, disclosure version, decision status, and
  timestamp. No rejected raw content is stored in the moderation audit.

Feed personalization is first-party processing. forum records feed impressions,
opens, approximate dwell time, outbound publisher opens, selected interests, and
"Not interested" choices. Semantic recommendation vectors are generated locally
from forum's existing content and are not an additional OpenAI purpose. Settings
offers a feed-personalization reset, and the hosted privacy policy discloses the
collection and ranking use. This behavior does not use advertising identifiers
or track users across other companies' apps and websites.

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

The product Terms currently set a 17-year minimum. Signup requires a separate
age-and-Terms acknowledgment. This is a product/legal alignment choice, not an
Apple rule that every political discussion app must impose exactly that age.

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
the initial submission with every source-policy note unless Apple asks.

## Article-content strategy

Apple does not require transient-only analysis or deletion of ingested article
text. The product has intentionally restored its original functionality-first
architecture:

1. Fetch recent article text from the publisher feed or page.
2. Store it in PostgreSQL for deterministic scoring, clustering, search,
   rescoring, debugging, and forumAI retrieval.
3. Store the publisher headline, source, canonical URL, date, and direct image
   URL with the record.
4. Do not display article bodies in the feed, article detail, search, profile,
   or summary interfaces.
5. Do not return the stored body from public article, bookmark, search, source,
   profile-article, or topic-detail API responses.
6. Keep the publisher as the destination for reading the complete article.
7. Keep public multi-perspective summaries headline-only: one attributed
   publisher headline for each available Left/Center/Right band.

This is a deliberate product and engineering choice, not a claim that storing
publisher text is affirmatively authorized by Apple. Publisher terms and
copyright analysis remain separate risks. Do not describe private storage as an
Apple requirement or tell App Review that the text is discarded.

### Implemented architecture

- `@extractus/article-extractor` uses substantial feed text first and falls
  back to the publisher page.
- `articles.content` stores the extracted text and feeds the scorer, hot-topic
  clustering, full-text search, rescoring, and forumAI retrieval.
- Public article projections omit `articles.content`; the React Native client
  renders the headline, source, media, metadata, and publisher link.
- Story `short_summary` is an original outlet-count coverage note.
- Story `long_summary` contains only attributed publisher headlines. A
  regression test verifies that article-body sentences never enter it.
- The bounded `backfill:article-content` job repairs recent rows that were
  stripped by the retired conservative migration before reclustering them.

## forumAI coverage context

forumAI retrieves a small, clamped set of relevant recent article bodies from
PostgreSQL. Retrieval is deterministic, balances outlets and perspective bands
when possible, and supports both topic-specific and broad "today's biggest
story" prompts.

Stored text is private model context. The app does not expose a publisher-body
reader, and forumAI must synthesize answers in fresh language, attribute
outlet-specific claims, avoid long source-like passages, and provide publisher
links. Passing an article or post ID may still pin the conversation to that
subject.

## Publisher-image strategy

Do not treat "never use R2" as an Apple requirement. Image delivery is a product,
performance, privacy, and rights decision.

The implemented app restores direct publisher/feed image delivery. Ingestion
stores the selected image URL in `articles.media`; the client loads it with the
normal device cache. It does not require the retired rights-mode fields or an
R2 transformation before showing the image.

Do not use a single publisher photograph as if it were forum's own story art.
Summary image carousels are acceptable product UI: label each item with its
publisher, keep it connected to the corresponding source link, use restrained
thumbnail dimensions, and fall back cleanly when unavailable.

Validation remains narrow and product-driven: malformed article-path metadata
and explicit audio/video/HLS assets are rejected, while valid extensionless CDN
image URLs remain eligible. A failed publisher image falls back to forum-owned
purple artwork. R2 remains in use for user uploads and private beta-feedback
screenshots, not as a mandatory publisher-image proxy.

## Store positioning

- Primary category: News
- Secondary category: Social Networking
- Product description: a social news-discussion platform that organizes
  attributed coverage across perspectives and directs readers to publishers,
  rather than a publisher or full-article reader.

## Submission checklist

- Production backend, database, email/reset links, push setup, forumAI, images,
  support, privacy, and deletion are reachable.
- The review-facing URLs are
  `https://api.forumeveryside.com/support` and
  `https://api.forumeveryside.com/legal/privacy`. The browser beta currently
  lives at `https://mtan-forum.expo.app`; Apple does not require the full web
  client and the review URLs to share a hostname.
- Signup allow/decline, existing-user just-in-time OpenAI permission, withdrawal,
  and re-consent work; no affected request reaches OpenAI before current consent.
- Reviewer credentials are non-admin, stable, and stored only in App Store
  Connect. The review account uses a controlled real inbox and remains
  available for the lifetime of the reviewed build; the separate owner account
  is never supplied to Apple.
- UGC filtering, report (including received DMs), block, admin response, and
  contact paths work.
- App Privacy and age-rating answers match the build.
- Screenshots show the real app using controlled demo accounts/content.
- Publisher cards attribute the source and open the complete publisher page.
- Review notes explain the social and multi-perspective functionality, article
  flow, moderation, account deletion, and any non-obvious permissions.
- No hidden review mode, dormant feature, placeholder URL, test credential in
  the repository, or misleading Content Rights statement exists.
