# App Store Review strategy

Last official-policy review: 2026-07-29

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
- topic and perspective summaries are forum-original multi-source analysis; and
- publisher material must not imply sponsorship or affiliation.

Answer the Content Rights field truthfully. Keep a concise review attachment
ready that explains article flow, attribution, publisher navigation, original
analysis, remote previews, moderation, and takedown contact. Do not overwhelm
the initial submission with every source-policy note unless Apple asks.

## Article-content strategy

The preferred functionality-preserving design is transient analysis:

1. Fetch eligible article text for processing.
2. Keep raw text out of PostgreSQL, R2, logs, Sentry, analytics, backups, and
   public/admin APIs.
3. Extract structured coverage evidence, including entities, events, dates,
   legislation, source claims, and cluster features.
4. Remove copied phrasing from persisted evidence and summaries.
5. Discard raw text immediately after successful processing.
6. Persist the headline, publisher, canonical URL, date, structured evidence,
   cluster membership, policy/provenance fields, and original synthesis.
7. Never expose the raw body to users or use forum as a replacement reader.

The source-rights registry may still select metadata-only analysis for sources
with a concrete restriction. Do not apply a blanket metadata-only policy to all
publishers without a current product and App Review reason.

## forumAI coverage context

Transient analysis does not mean re-fetching every full article for each user
question. The ingestion job may read eligible text once, convert it to
structured evidence, discard the text, and persist only that evidence.

forumAI should retrieve:

- story and article IDs;
- attributed headlines, publishers, URLs, and dates;
- political/source bands;
- entities and event terms;
- structured source claims and timeline facts;
- cross-source agreement and disagreement;
- cluster heat/volume; and
- forum-original coverage summaries.

It should not retrieve stored article bodies because none should be retained.
Responses must distinguish confirmed cross-source facts from claims attributed
to one outlet, avoid long source-like phrasing, and provide publisher links.

## Publisher-image strategy

Do not treat "never use R2" as an Apple requirement. Image delivery is a product,
performance, privacy, and rights decision.

Preferred supported modes:

- `remote_no_cache`: load a reviewed publisher/feed thumbnail directly;
- `managed_thumbnail`: keep a bounded, resized R2 thumbnail with provenance,
  expiry, purge, and takedown support;
- `licensed_cache`: retain an authorized image under its license; and
- `none`: use forum-owned fallback artwork.

A managed R2 thumbnail cache can improve consistency, latency, bandwidth, and
layout quality. It also makes forum the server storing and distributing the
image, so it should retain only card/carousel-sized variants rather than
original full-resolution files, record the source article and image URL, expire
unused files, and support immediate purge.

Do not use a single publisher photograph as if it were forum's own story art.
Summary image carousels are acceptable product UI: label each item with its
publisher, keep it connected to the corresponding source link, use restrained
thumbnail dimensions, and fall back cleanly when unavailable.

## Store positioning

- Primary category: News
- Secondary category: Social Networking
- Product description: a social news-discussion platform that organizes
  attributed coverage across perspectives and directs readers to publishers,
  rather than a publisher or full-article reader.

## Submission checklist

- Production backend, database, email/reset links, push setup, forumAI, images,
  support, privacy, and deletion are reachable.
- Reviewer credentials are non-admin, stable, and stored only in App Store
  Connect.
- UGC filtering, report, block, admin response, and contact paths work.
- App Privacy and age-rating answers match the build.
- Screenshots show the real app using controlled demo accounts/content.
- Publisher cards attribute the source and open the complete publisher page.
- Review notes explain the social and multi-perspective functionality, article
  flow, moderation, account deletion, and any non-obvious permissions.
- No hidden review mode, dormant feature, placeholder URL, test credential in
  the repository, or misleading Content Rights statement exists.
