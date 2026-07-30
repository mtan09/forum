# Repository guidance

## App Store work

Before changing release behavior, article ingestion or display, publisher images,
forumAI news context, authentication, privacy, moderation, App Store metadata, or
TestFlight/App Review configuration, read `docs/APP_STORE_REVIEW.md`.

Treat that document as the durable record of the product's App Review strategy.
Preserve forum's useful functionality unless a current Apple requirement creates
a concrete review risk. Distinguish:

- what Apple explicitly requires;
- what publisher terms require;
- what copyright law may require; and
- what is only a conservative engineering choice.

Do not describe a conservative choice as an Apple requirement. Before an App
Store submission, and whenever the recorded review date is stale, re-check the
official Apple sources and update the document. Never hide functionality from
App Review or provide inaccurate Content Rights, privacy, age-rating, or review
information.

