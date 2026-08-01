# Publisher content-rights registry

Last reviewed: 2026-08-01

This is the durable source-by-source record for the news publishers currently
configured in `forum-api/src/ingest/sources.ts`. It supports, but does not
replace, `APP_STORE_REVIEW.md`. Re-check an entry before relying on it for a
release, after a publisher changes ownership or terms, and at least every 30
days while an App Store submission is active.

This document is operational research, not legal advice and not a declaration
that every current use is authorized. It deliberately separates:

- a publisher making an RSS feed technically available;
- permission expressed in that publisher's terms;
- permission or defenses supplied by copyright law; and
- Apple's separate requirement that the app have the necessary rights or be
  otherwise permitted by law in every distribution region.

## What forum currently does

As of this review, forum:

1. polls 58 public RSS/Atom endpoints;
2. stores each publisher's headline, canonical URL, publication date, selected
   remote image URL, and extracted article text;
3. uses the text privately for relevance scoring, lean scoring, clustering,
   search, and forumAI retrieval;
4. displays the publisher name, headline, remote image, date, and link, but not
   the stored article body;
5. displays attributed publisher headlines in the Left/Center/Right summary
   cards; and
6. directs the user to the publisher for the complete article.

The current implementation is documented more fully in
`docs/APP_STORE_REVIEW.md`. The fact that a body is private analysis input does
not make publisher terms inapplicable. Likewise, not charging for the app does
not automatically make an organizational App Store product "personal" or
"non-commercial" under a publisher's terms.

## How to read the registry

The status labels are deliberately narrow:

- **LINK** — an official policy expressly permits at least a headline/source
  link. This is not an image or article-body license.
- **RSS-LIMITED** — RSS use is expressly limited, commonly to personal or
  non-commercial use or to a prescribed display format.
- **LICENSE-LIMITED** — a Creative Commons or republication license exists, but
  its scope or conditions do not automatically fit forum's automated app.
- **RESTRICTED** — official terms reserve reuse and ordinarily require written
  permission or a separate license.
- **AI/AUTOMATION** — official terms expressly restrict automated collection,
  aggregation, data mining, AI use, or some combination of them.
- **GAP** — no sufficiently specific, current publisher permission was located
  in this review. A GAP is not the same as an express prohibition or a grant.

“Image grant” means an identified permission covering forum's image use. A
remote image URL or RSS enclosure is metadata, not by itself an image license.
Many publishers license photographs from AP, Reuters, Getty, freelancers, or
other third parties and cannot necessarily sublicense them.

## Source registry

The feed column is the exact endpoint currently configured. “Policy finding”
is a conservative paraphrase of the linked primary source, not a quotation.

### Left

| Publisher | Feed in use | Official policy evidence | Status | Policy finding and image position |
| --- | --- | --- | --- | --- |
| Mother Jones | <https://www.motherjones.com/feed/> | [Site footer/copyright contact](https://www.motherjones.com/about/) | GAP | A public feed exists, but this review did not locate a current feed-republication or automated-analysis grant. No image grant established. |
| Democracy Now | <https://www.democracynow.org/democracynow.rss> | [Feeds](https://www.democracynow.org/pages/help/podcasting), [Creative Commons reuse](https://www.democracynow.org/education/resources) | LICENSE-LIMITED | Text is offered under CC BY-NC-ND 3.0 with credit for non-commercial republication. “No derivatives” and “non-commercial” need application-specific analysis; third-party photographs are not assumed covered. |
| The Nation | <https://www.thenation.com/feed/?post_type=article> | [Terms of use](https://www.thenation.com/termsofuse/) | RESTRICTED | Terms reserve text and images and prohibit copying, scraping, extracting, distribution, and derivative use without written consent. Hyperlinking is separately authorized under conditions. No image grant. |
| The Intercept | <https://theintercept.com/feed/?rss> | [Copyright/permissions contact](https://theintercept.com/about/) | GAP | A publisher feed exists, but no current app, republication, image, or automated-analysis permission was established in this review. |
| Salon | <https://www.salon.com/feed/> | [Terms of service](https://www.salon.com/about/tos) | RESTRICTED | Use is limited to personal, non-commercial access; copying, distribution, exploitation, articles, and photographs require permission. No RSS-specific app grant located and no image grant. |
| The New Republic | <https://newrepublic.com/rss.xml> | [Terms and conditions](https://newrepublic.com/pages/terms-and-conditions) | RESTRICTED / AI/AUTOMATION | Terms prohibit scraping or automated collection without written permission and reserve republication, display, and derivative rights. Images are protected content. |
| HuffPost | <https://chaski.huffpost.com/us/auto/vertical/politics> | [BuzzFeed/HuffPost user agreement](https://www.buzzfeed.com/about/useragreement) | RESTRICTED / AI/AUTOMATION | The agreement effective July 16, 2026 prohibits manual or automated scraping, collection, archiving, and using content to create AI summaries or substitute experiences, apart from its stated search-indexing exception. No feed-specific app or image grant was located. |
| Talking Points Memo | <https://talkingpointsmemo.com/feed> | [Terms of use](https://talkingpointsmemo.com/terms-of-use) | RESTRICTED | TPM identifies site content as protected property. No app syndication, article extraction, AI-context, or image permission was found. |
| Vox | <https://www.vox.com/rss/index.xml> | [Permissions and licensing](https://corp.voxmedia.com/licensing/), [terms](https://www.voxmedia.com/terms-of-use/) | LINK / AI/AUTOMATION | Vox Media expressly allows sharing a link using the article headline. Its terms prohibit automated monitoring, caching, extraction, copying, or distribution. The link permission does not grant article-body or image reuse. |
| Slate | <https://slate.com/feeds/news-and-politics.rss> | [RSS page](https://www.slate.com/articles/news_and_politics/slate_fare/2006/12/slates_new_improved_rss_feed.html) | GAP | Slate publishes a feed, but this review did not locate current editorial-feed terms granting app redistribution, body extraction, AI use, or image reuse. |
| Daily Beast | <https://www.thedailybeast.com/arc/outboundfeeds/rss/articles/?outputType=xml> | [Terms of use](https://www.thedailybeast.com/company/terms-of-use) | RESTRICTED | Terms limit copying, database entry, display, publication, transmission, and exploitation; personal occasional copies are the stated exception. Text and photos are protected. |
| The New Yorker | <https://www.newyorker.com/feed/news> | [Condé Nast user agreement](https://www.condenast.com/user-agreement) | RESTRICTED / AI/AUTOMATION | Terms expressly prohibit automated or manual collection, aggregation, storage, republication, and use for AI operation or grounding/RAG, other than search-engine indexing. RSS content remains subject to the same limits. No image grant. |
| The Atlantic | <https://www.theatlantic.com/feed/all/> | [Terms and conditions](https://www.theatlantic.com/terms-and-conditions/) | RSS-LIMITED / RESTRICTED / AI/AUTOMATION | Feeds are limited to personal, non-commercial use with attribution, a direct link, and canonical-link requirements. The terms prohibit automated or manual monitoring, indexing, and data mining without permission; separately licensed material such as AP content has additional storage and redistribution limits. No image grant applicable to forum was identified. |

### Lean left

| Publisher | Feed in use | Official policy evidence | Status | Policy finding and image position |
| --- | --- | --- | --- | --- |
| The Guardian | <https://www.theguardian.com/us-news/rss> | [RSS help](https://www.theguardian.com/help/feeds), [terms](https://www.theguardian.com/help/terms-of-service) | RSS-LIMITED / AI/AUTOMATION | RSS is for personal, non-commercial use. Current terms expressly prohibit automated collection, aggregation, text/data analysis, and AI synthesis without approval. No image grant. This is a direct conflict with forum's present extraction/clustering/forumAI use unless another legal basis or license applies. |
| The New York Times | <https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml> | [Terms of service](https://help.nytimes.com/hc/en-us/articles/115014893428-Terms-of-service) | RESTRICTED | No app redistribution, stored-body analysis, or image license was identified. Treat the feed as discovery only pending a specific permission or legal analysis; images may have third-party credits. |
| ProPublica | <https://www.propublica.org/feeds/propublica/main> | [Republishing rules](https://www.propublica.org/nerds/happy-birthday-creative-commons) | LICENSE-LIMITED | Many stories are CC BY-NC-ND 3.0, but ProPublica bars wholesale/automatic republication and syndication in apps. It expressly excludes photographs and illustrations absent specific permission. Headline-link use is narrower than republication but the feed is not a blanket app license. |
| Time | <https://time.com/feed/> | [Terms of service](https://legal.time.com/terms-of-service/) | RESTRICTED | General terms reserve editorial and visual content; no RSS app, stored-body, AI-grounding, or image grant applicable to forum was found. |
| The Independent | <https://www.independent.co.uk/news/world/americas/us-politics/rss> | [RSS policy](https://www.independent.co.uk/service/rss-feeds-775086.html), [terms](https://www.independent.co.uk/terms) | LINK / RSS-LIMITED | Feeds are personal/non-commercial and republication requires a license. Separately, third parties may link using the URL while quoting the headline and source. That supports forum's headline-link cards, not body extraction or images. |
| NBC News | <https://feeds.nbcnews.com/nbcnews/public/politics> | [NBCUniversal terms](https://www.nbcuniversal.com/terms) | RESTRICTED / AI/AUTOMATION | NBCUniversal terms restrict copying, scraping, aggregation, and reuse beyond personal access. No RSS-specific app or image grant was identified. |
| CBS News | <https://www.cbsnews.com/latest/rss/politics> | [CBS News terms](https://www.cbsnews.com/news/cbsnewscom-terms-of-service/) | RESTRICTED | Terms prohibit copying, republication, transmission, or distribution other than a personal non-commercial copy. Images and third-party materials are expressly included. |
| ABC News | <https://abcnews.go.com/abcnews/politicsheadlines> | [Disney terms of use](https://disneytermsofuse.com/) | RESTRICTED / AI/AUTOMATION | Disney's general terms do not establish an app syndication or image grant and restrict business/high-volume automated use. Treat article extraction and image display as unlicensed pending written permission or legal analysis. |
| NPR | <https://feeds.npr.org/1014/rss.xml> | [NPR terms of use](https://www.npr.org/about-npr/179876898/terms-of-use) | RSS-LIMITED | NPR materials and feeds are generally framed as personal/non-commercial absent permission. NPR also notes that some text and images are excluded from its own APIs because of underlying rights. No image grant established. |
| Al Jazeera | <https://www.aljazeera.com/xml/rss/all.xml> | [Licensing FAQ](https://network.aljazeera.net/en/more/faq) | RESTRICTED | Al Jazeera states that content is available for licensing through its Content Sales operation. A public feed is not a located app or image license. |
| Politico | <https://rss.politico.com/politics-news.xml> | [Terms of service](https://www.politico.com/terms-of-service) | RESTRICTED | No feed redistribution, body extraction, AI-context, or image permission applicable to forum was identified. Treat editorial and visual content as reserved. |
| Axios | <https://api.axios.com/feed/> | [Terms of use](https://www.axios.com/terms) | RESTRICTED | The endpoint is public, but no blanket app syndication, body-storage, AI-grounding, or image license was located. Axios's own disclosed AI licensing arrangements reinforce that AI access can be separately licensed. |
| PBS NewsHour | <https://www.pbs.org/newshour/feeds/rss/politics> | [PBS terms](https://www.pbs.org/about/about-pbs/terms-of-use/) | RESTRICTED | PBS reserves its content and gives personal/non-commercial rules for specified feeds such as podcasts. No NewsHour app redistribution or image grant was identified; individual items may also contain AP or other licensed material. |

### Center

| Publisher | Feed in use | Official policy evidence | Status | Policy finding and image position |
| --- | --- | --- | --- | --- |
| The Economist | <https://www.economist.com/united-states/rss.xml> | [Terms of use](https://www.economist.com/legal/terms-of-use) | RESTRICTED | Content is generally for personal/non-commercial access; systematic storage, redistribution, and exploitation require permission or a licensed content/API product. No image grant. |
| BBC News | <https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml> | [BBC terms](https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf) | LINK / RSS-LIMITED | BBC permits adding its news RSS feed with unchanged content, prominent credit, and a direct link, but says business use of RSS and metadata—including images and text—requires permission and may require a fee. |
| The Hill | <https://thehill.com/homenews/feed/> | [Nexstar terms](https://www.nexstar.tv/terms-of-use/) | RESTRICTED | The Hill's public feed does not establish article-body, AI, or image redistribution rights. Treat Nexstar/site content as reserved and request permission for reuse beyond attributed linking. |
| Christian Science Monitor | <https://rss.csmonitor.com/feeds/usa> | [Terms of service](https://www.csmonitor.com/About/Terms-of-Service) | RESTRICTED | No app syndication, stored-body analysis, AI-context, or image grant was identified. Publisher and third-party visual rights remain reserved. |
| CNBC | <https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000113> | [NBCUniversal terms](https://www.cnbc.com/nbcuniversal-terms-of-service/) | RESTRICTED / AI/AUTOMATION | NBCUniversal terms restrict automated/manual scraping and aggregation and do not grant redistribution of CNBC text or images. |
| Roll Call | <https://rollcall.com/feed/> | [Terms of use](https://rollcall.com/terms-of-use/) | RESTRICTED | No RSS app, body-extraction, AI-grounding, or image permission applicable to forum was identified. |
| NewsNation | <https://www.newsnationnow.com/feed/> | [Nexstar terms](https://www.nexstar.tv/terms-of-use/) | RESTRICTED | Nexstar's general terms do not supply a feed redistribution or image license. Treat the public feed as discovery pending permission or legal analysis. |
| Straight Arrow News | <https://san.com/feed/> | [Terms of use](https://san.com/terms-of-use/) | GAP | A feed is published, but this review did not establish a current permission for app redistribution, stored-body analysis, AI use, or remote images. |
| Sky News | <https://feeds.skynews.com/feeds/rss/us.xml> | [RSS page](https://news.sky.com/info/rss), [Sky terms](https://www.sky.com/help/articles/skycom-terms-and-conditions) | RESTRICTED / AI/AUTOMATION | Terms restrict copying and all automated or manual collection, scraping, aggregation, and AI use without express written authorization. No image grant. |
| Newsweek | <https://www.newsweek.com/rss> | [Terms of service](https://www.newsweek.com/terms-service) | RESTRICTED | No app syndication, article extraction, AI-context, or image grant was identified. Treat editorial and photographic material as reserved. |
| The Free Press | <https://www.thefp.com/feed> | [Publisher privacy/ownership notice](https://www.thefp.com/p/privacy-notice), [Substack terms](https://substack.com/terms) | RESTRICTED | The publication runs on Substack; neither the public feed nor platform terms establish a third-party app, body-analysis, or image license for forum. |

### Lean right

| Publisher | Feed in use | Official policy evidence | Status | Policy finding and image position |
| --- | --- | --- | --- | --- |
| RealClearPolitics | <https://www.realclearpolitics.com/index.xml> | [RSS page](https://www.realclearpolitics.com/rss), [terms](https://www.realclearpolitics.com/terms_of_service.html), [privacy/syndication statement](https://www.realclearpolitics.com/privacy.html) | LINK / RSS-LIMITED | RCP says it allows RSS syndication of public content, while its terms prohibit commercial or other unauthorized publication, caching, and retransmission. The scope for forum and images is not explicit; no image grant established. |
| The Dispatch | <https://thedispatch.com/feed/> | [Terms of use](https://thedispatch.com/terms-of-use/) | RESTRICTED | No blanket app syndication, stored-body analysis, AI grounding, or image grant was identified. |
| Reason | <https://reason.com/feed/> | [Terms of use](https://reason.com/terms-of-use/) | LINK / RESTRICTED | Reason expressly allows linking and citation without implying sponsorship, but restricts content to personal/non-commercial use and requires permission for republication. No image grant. |
| Just the News | <https://justthenews.com/rss.xml> | [Terms of service](https://justthenews.com/terms-service) | RESTRICTED | Content is personal/non-commercial; distribution, display, storage, and reproduction require permission. The site provides a licensing contact and separately handles photograph rights. |
| Daily Mail | <https://www.dailymail.co.uk/news/us-politics/index.rss> | [Terms](https://www.dailymail.co.uk/home/article-1388142/Terms.html) | RSS-LIMITED / RESTRICTED | No permission for forum's automated app, stored-body analysis, or image display was identified. MailOnline images frequently belong to agencies or third parties. |
| Washington Examiner | <https://www.washingtonexaminer.com/feed> | [Terms of service](https://www.washingtonexaminer.com/terms-of-service/) | LINK / RESTRICTED | Linking is permitted under conditions in published Examiner terms, but text/image reuse remains personal/non-commercial or permission-based. Confirm the current terms before relying on older RSS language. |
| New York Post | <https://nypost.com/politics/feed/> | [Terms of use](https://nypost.com/terms/) | RESTRICTED / AI/AUTOMATION | News Corp/Post terms do not establish app syndication, body extraction, AI grounding, or image permission and reserve automated collection and editorial/visual rights. |
| Washington Times | <https://www.washingtontimes.com/rss/headlines/news/politics/> | [Terms of use](https://www.washingtontimes.com/terms/) | RESTRICTED | No app redistribution, stored-body, AI-context, or image license was identified. |
| The American Conservative | <https://www.theamericanconservative.com/feed/> | [RSS page](https://www.theamericanconservative.com/rss-feeds/), [permissions contact](https://www.theamericanconservative.com/contact-us/) | GAP | The nonprofit publishes feeds and a permissions/reprints contact, but no terms granting automated app distribution, body analysis, or image reuse were located. |

### Right

| Publisher | Feed in use | Official policy evidence | Status | Policy finding and image position |
| --- | --- | --- | --- | --- |
| Fox News | <https://moxie.foxnews.com/google-publisher/politics.xml> | [Current terms](https://www.foxnews.com/terms-of-use), [RSS-specific rules](https://www.foxnews.com/story/foxnews-com-terms-of-use.amp) | LINK / RSS-LIMITED / RESTRICTED | Fox's RSS rules permit feed display with an unchanged feed, attribution, and a functional direct article link, and prohibit intermediate pages and certain advertising. Current general terms broadly prohibit unauthorized copying, scraping, and republication. No separate image grant established. |
| National Review | <https://www.nationalreview.com/feed/> | [Terms of use](https://www.nationalreview.com/terms-of-use/) | RESTRICTED | No app syndication, article extraction, AI-context, or image grant applicable to forum was identified. |
| Washington Free Beacon | <https://freebeacon.com/feed/> | [Contact/copyright notice](https://freebeacon.com/contact/) | GAP | A public feed exists, but no sufficiently specific current feed, automated-analysis, or image permission was located. |
| Daily Caller | <http://feeds.dailycaller.com/dailycaller> | [Licensing contact](https://dailycaller.com/contact/) | RESTRICTED | Daily Caller directs users to a licensing address for its material, expressly including photos and videos. No blanket app or AI-analysis grant was identified. |
| The Daily Wire | <https://www.dailywire.com/feeds/rss.xml> | [Terms](https://www.dailywire.com/terms) | RESTRICTED / AI/AUTOMATION | Terms expressly prohibit automated or manual monitoring, gathering, copying, or distribution, including for training an LLM or similar system. Content and images are personal-use only absent permission. |
| The Federalist | <https://thefederalist.com/feed/> | [RSS page](https://thefederalist.com/tag/rss/), [copyright notice](https://thefederalist.com/contact/) | GAP | A feed is advertised, but no current permission covering third-party app distribution, stored-body analysis, AI use, or images was located. |
| Newsmax | <https://www.newsmax.com/rss/Politics/1/> | [Terms and RSS policy](https://www.newsmax.com/terms.aspx/), [RSS page](https://www.newsmax.com/rss/) | RSS-LIMITED / AI/AUTOMATION | RSS headlines are offered for personal/non-commercial use with attribution. Terms prohibit automated access despite the feed language and prohibit AI/ML development or training; the limited RSS permission does not cover bodies or images. |
| The Blaze | <https://www.theblaze.com/feeds/feed.rss> | [Terms of use](https://www.theblaze.com/terms) | RESTRICTED / AI/AUTOMATION | Terms limit use to personal/non-commercial purposes and prohibit copying, distribution, scraping, crawling, and spidering. No image grant. |
| PJ Media | <https://pjmedia.com/feed> | [Publisher contact/terms channel](https://pjmedia.com/contact-us) | GAP | Townhall Media publishes the feed, but no sufficiently specific current permission for app redistribution, stored-body analysis, AI grounding, or images was located. |
| RedState | <https://redstate.com/feed> | [Publisher contact](https://redstate.com/contact-us) | GAP | Townhall Media publishes the feed, but no sufficiently specific current permission for app redistribution, stored-body analysis, AI grounding, or images was located. |
| American Thinker | <https://feeds.feedburner.com/americanthinker> | [Terms/copyright contact](https://www.americanthinker.com/static/terms_of_use.html) | GAP | The FeedBurner endpoint is public, but no sufficiently specific current app, automated-analysis, or image permission was established. |
| Breitbart | <http://feeds.feedburner.com/breitbart> | [Terms of use](https://www.breitbart.com/terms-of-use/) | RESTRICTED / AI/AUTOMATION | Available terms prohibit automated access, data mining, extraction, archiving, reproduction, distribution, and derivative use without authorization. No image grant. |

## Cross-provider conclusions

### 1. The strongest currently documented metadata paths are narrow

Vox, The Independent, BBC, Fox, Reason, RealClearPolitics, and some Examiner
language provide varying degrees of support for headline/source/link use. Their
terms do **not** collectively authorize full-text storage, forumAI grounding, or
publisher photography. Each condition—attribution, direct linking, unchanged
feed content, non-commercial limits, and no implied endorsement—must be honored
individually.

### 2. The current full-text/AI pipeline has concrete provider-term conflicts

The Guardian, Condé Nast/The New Yorker, Sky, Daily Wire, and Newsmax have
particularly clear restrictions involving automated collection, aggregation,
data analysis, AI use, or RAG. Other publishers broadly prohibit scraping or
systematic storage without naming AI. This is a publisher-terms issue; Apple did
not create these restrictions.

Before certifying App Store Content Rights, obtain written permission, remove
the affected source from the conflicting processing path, or obtain qualified
legal advice that identifies another applicable basis. A general fair-use belief
should not be recorded as publisher permission.

### 3. Images are the least-supported content type

No source in this review supplied a blanket permission that clearly covers
forum's current remote publisher-image display across the App Store app.
ProPublica expressly excludes photographs and illustrations from its CC
republication license. Publisher pages often credit AP, Reuters, Getty, AFP,
freelancers, governments, campaigns, or social-media users. Consequently:

- never infer image rights from rights in a headline or publisher-written text;
- preserve the image credit and provenance when available;
- do not copy publisher images into R2 without a separate basis;
- keep the image visually connected to the attributed publisher link;
- use bounded preview sizing and a forum-owned fallback; and
- support prompt removal when a publisher or photographer objects.

These safeguards reduce practical risk but do not themselves create permission.

### 4. Headlines have a better copyright posture than bodies or photos, but
not a universal free pass

The U.S. Copyright Office lists titles and short phrases among material not
protected by copyright. That supports exact headline identification in the
United States, particularly when paired with attribution and a direct link.
It does not resolve contract terms, trademarks/passing off, compilation rights,
hot-news theories, or laws in every App Store region. See [Circular
33](https://www.copyright.gov/circs/circ33.pdf).

### 5. Free is relevant but not decisive

The U.S. Copyright Office states that non-commercial purpose is only one fair-use
factor; not every free or nonprofit use is fair. Courts also consider the nature
and amount of the work and market effect. See the Copyright Office's [fair-use
overview](https://www.copyright.gov/fair-use/more-info.html). Publisher contract
definitions may also treat an app, company, audience-building product, or
business use as non-personal or commercial even when no subscription or ad is
charged.

### 6. Apple's question is broader than “do we show full articles?”

Apple states that apps containing, showing, or accessing third-party content
must have the necessary rights **or be otherwise permitted by law** in each
country or region where the app is available. See Apple's [App information
reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).
The current registry does not support a blanket factual statement that all 58
publishers have licensed forum's present text, analysis, and image uses.

## Recommended release record

Do not send this full internal matrix to App Review unless asked. Maintain a
short, accurate review note that explains what users see, attribution, direct
publisher navigation, the absence of article bodies in the UI, original forum
features, and the support/takedown route. If Apple asks for authorization,
respond with the exact applicable permissions or legal rationale; do not claim
that public RSS availability alone is authorization.

For a defensible provider program:

1. Add machine-readable per-source policy fields beside `SOURCES`: review date,
   metadata mode, image mode, analysis mode, policy URL, and contact.
2. Seek written headline/thumbnail/analysis permission from priority outlets,
   starting with the feeds that materially improve perspective coverage.
3. Route sources with explicit AI/automation restrictions away from article-body
   storage and forumAI until permission or a reviewed legal basis exists.
4. Prefer licensed or publisher-supplied metadata APIs where available.
5. Keep a takedown log and remove challenged content promptly without treating
   removal as an admission.
6. Recheck ownership and terms before every App Store submission and update the
   `Last reviewed` date only after all 58 entries have actually been reviewed or
   documented as a policy gap.

## Review provenance

- Publisher inventory: `forum-api/src/ingest/sources.ts`, reviewed 2026-08-01.
- Product behavior: current mobile/backend implementation and
  `docs/APP_STORE_REVIEW.md`.
- Policy evidence: linked first-party publisher terms, RSS, licensing, and
  permissions pages reviewed on 2026-08-01. A **GAP** entry records that the
  review did not locate sufficiently specific permission; it is not a claim
  that no other agreement or policy exists.
- Apple standard: official App Store Connect content-rights reference reviewed
  2026-08-01.
- U.S. copyright background: official U.S. Copyright Office Circular 33 and
  fair-use overview reviewed 2026-08-01.
