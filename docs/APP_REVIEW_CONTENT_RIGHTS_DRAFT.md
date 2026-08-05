# App Review content-rights response draft

This is a concise factual product-flow explanation to keep ready for App Review.
It is not a substitute for source-specific authorization or a legal opinion, and
it must not be presented as proof that every publisher licensed every use. Do not
include the internal 58-source registry in the initial submission unless Apple
asks for source-specific support.

## Suggested response or attachment

**forum: Every Side** is a native social news-discussion app that helps users
compare how multiple publishers and community members frame current political
stories. It is not a full-article reader and does not present publisher reporting
as forum's own work.

forum polls public publisher RSS/Atom feeds. For each eligible publisher item,
the app displays the publisher name, attributed headline, publication date,
canonical article link, and a remote preview image when the publisher's feed or
page metadata supplies one. The complete article remains on the publisher's
website and opens through the corresponding original link. forum does not claim
publisher sponsorship, endorsement, or affiliation.

During hourly ingestion, feed or page text may be processed transiently on
forum's server to derive political relevance and placement, bounded search and
recommendation signals, and a non-sequential weighted clustering profile. The
article body is discarded after those derived values are created. Article bodies
are not stored in the production database, returned by public APIs, or displayed
in the feed, article detail, search, profile, or summary interfaces. Summary
perspective cards display one attributed publisher headline for each available
Left, Center, and Right band rather than copied article-body prose.

forumAI is optional and requires the user's explicit permission before personal
data or user content is sent to OpenAI. Its current-news grounding contains only
eligible attributed publisher headlines and forum-generated story metadata.
Publisher article bodies are not sent to OpenAI. Content from publishers with
reviewed AI, automated-analysis, RAG, or closely related restrictions is excluded
from OpenAI context. Those publishers may still contribute locally derived
aggregate signals used to organize covered topics; when forumAI discusses such a
topic, the model receives only headlines from publishers currently eligible for
OpenAI context.

Publisher preview images remain remote publisher-supplied URLs and are not copied
into forum's Cloudflare R2 storage. Each preview remains visually connected to
the attributed publisher card and original article link. Invalid or unavailable
images fall back to forum-owned artwork.

Publishers, photographers, and other rights holders can request correction or
removal through https://api.forumeveryside.com/support or by emailing
support@forumeveryside.com. forum will investigate promptly and remove or
correct challenged material when appropriate.

forum's original functionality includes social posts and comments, profiles,
follows, direct messages, voting, bookmarks, source and perspective comparison,
multi-source clustering, The Floor discussion rooms, personalized feeds, search,
and consent-controlled forumAI. These features distinguish the product from a
collection of publisher links.

## Before using this response

- Confirm the submitted build still matches every statement above.
- Confirm the production database body-storage constraint is active.
- Confirm the source-policy allow/block decisions and review date are current.
- Confirm the Support URL and support email work.
- If Apple requests authorization for a publisher or image, answer with the
  specific permission or reviewed legal basis. Do not cite public RSS
  availability alone as authorization.
- Keep App Store Connect's Content Rights answer truthful for every selected
  distribution territory.
