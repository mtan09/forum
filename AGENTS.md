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

## Production secrets

Never run a command or API operation that prints live environment-variable
values, full service configurations containing variables, credentials, tokens,
connection strings, or private keys. In particular, do not use Railway
configuration or variable-listing commands when their output includes values.

For production diagnostics:

- inspect only sanitized `.env.example` files or variable names;
- use provider and Railway dashboards for write-only secret entry;
- ask the user to paste replacement secrets directly into the provider or
  Railway UI, never into chat or an agent-controlled terminal command;
- prefer sealed/shared Railway variables and redacted health checks;
- verify rotations through service health, functional checks, and redacted logs;
  and
- if a tool cannot guarantee redacted output, do not call it.

Never reproduce a secret found in prior output. If accidental exposure occurs,
stop querying configuration, identify only the affected variable names, and
recommend rotation without repeating their values.
