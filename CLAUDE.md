# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PodUptime is a distributed uptime monitoring system for the podcast industry (Spreaker). It measures availability of podcast hosting platforms and tracking-prefix redirects from multiple AWS regions. Full architecture description and diagram: `README.md` and `doc/architecture.excalidraw.svg`.

The repo has three independently deployable components, each with its own `package.json`, `node_modules`, and `serverless.yml`:

- **`monitor/`** — Lambda functions that perform the actual HTTP checks (multi-region: `us-west-1`, `us-east-2`, `eu-south-1`).
- **`analytics/`** — Lambda functions that ingest measurements, persist them (S3 + Aurora Serverless/Postgres), aggregate, and manage retention.
- **`website/`** — Astro + Tailwind static site that reads aggregated JSON and renders the public dashboard.

All three symlink a shared `conf/` directory (`monitor/conf`, `analytics/conf`, `website/conf` → `../conf`), which is the single source of truth for what gets monitored.

## Local development

Development happens inside a Docker container (Node/Lambda base image + a Postgres sidecar):

```shell
docker compose build dev && docker compose run --rm dev sh
```

This starts `postgresql` alongside `dev` and auto-loads `analytics/deployment/database/schema.sql` into it.

### Tests

Run from inside the dev container (needs the Postgres sidecar for `analytics` tests):

```shell
npm run test          # node:test, run once
npm run test-watch    # node:test, watch mode
```

Tests use Node's native `node:test` runner (`node --test`), invoked from the repo root, which picks up `*_test.js` files across `monitor/`, `analytics/`, and the root `conf_test.js`. There is no top-level `test` step in `monitor/package.json` or `analytics/package.json` — those exist only as placeholders for editor tooling; the real test run happens at the repo root.

To run a single test file: `node --test monitor/functions/check-endpoint/handler_test.js`.

CI (`.github/workflows/tests.yml`) does `npm ci` in `monitor` and `analytics`, loads `analytics/deployment/database/schema.sql` into a real Postgres service container, then runs `npm run test` from the repo root with `PGDATABASE/PGUSER/PGHOST/PGPORT/PGPASSWORD` set. There is no mocking of the database — tests hit real Postgres.

### Website

Run the site locally against real prod data/config:

```shell
cd website
npm install
STAGE=prod PUBLIC_STAGE=prod npm run dev -- --host
```

`STAGE` and `PUBLIC_STAGE` must always match — `STAGE` drives Astro's server-side config loading, `PUBLIC_STAGE` drives the client-side bundle. `conf/config.js` picks `config_prod.js` vs `config_nonprod.js` based on whichever of the two env vars equals `"prod"`.

## Architecture details worth knowing before editing

### Config-driven monitoring (`conf/`)

`conf/config.js` re-exports either `config_prod.js` or `config_nonprod.js`. Each defines `endpoints` (each with one or more `services`) and `regions`. A service has a `type` of `feed`, `enclosure`, or `prefix`; `prefix` services additionally require an `expected_url` (the redirect target). `conf_test.js` enforces this shape for both environments — any new endpoint/service must pass it.

To add a new endpoint/service (see README for full steps):
1. Add it to `conf/config_${STAGE}.js`.
2. If it's a prefix service, add a corresponding `<item>` to `website/public/rss/feed.xml` (some prefix providers validate against a real feed).
3. Add a changelog entry in `website/src/pages/changelog.astro`.

### Monitor flow (`monitor/`)

`kickstart` (scheduled every minute) fans each configured service out as a job onto SQS. `check-endpoint` consumes one job at a time and:
- Issues a `HEAD` request via `undici`, with a fresh `Agent` created and destroyed per check (deliberately not reusing the global keep-alive agent, so measurements stay independent — see comment in `handler.js`).
- For `prefix` services, redirects are *not* followed (`maxRedirections: 0`) and the response must be a 3xx redirecting to `expected_url`. For other types, redirects are followed and a `200` is expected.
- Publishes a `measurement` event to an `EventBridge` bus (`process.env.EVENT_BUS`).
- Tests inject a fake `agentFactory` via `context.agentFactory` (see `check-endpoint/handler_test.js`) to swap in undici's `MockAgent` instead of hitting the network.

### Analytics flow (`analytics/`)

EventBridge measurement events fan out to SQS queues consumed by dedicated Lambdas:
- `archive-raw` — writes raw events to S3 (Athena-friendly layout) for replay/audit.
- `aggregate-worker` — writes measurements into Aurora/Postgres (`measurements`, `unavailables` tables — schema in `analytics/deployment/database/schema.sql`).
- `aggregate-minutely` / `aggregate-daily` — scheduled Lambdas that push aggregation jobs, computing the JSON blobs the website reads.
- `archive-database` / `cleanup-database` — retention: S3 uses lifecycle policies, Postgres retention is enforced by a scheduled cleanup Lambda.

`analytics/common/database.js` wraps `pg.Pool` with **IAM auth token rotation**: it requests a short-lived RDS auth token via `@aws-sdk/rds-signer`, caches the pool until the token is near expiry (`EXPIRE_TOLERANCE`), and rebuilds it transparently. Locally, set `PGPASSWORD` to skip IAM signing entirely (used by Docker Compose / CI). SSL is only enabled when running inside actual Lambda (`process.env.AWS_EXECUTION_ENV` is set).

### Website (`website/`)

Astro + Tailwind static site, deployed to S3 behind CloudFront. It does not talk to Postgres directly — it fetches pre-aggregated JSON files (`instant-*.json`, `detailed-*.json`, `daily-*.json`, `recent-issues-*.json`) produced by the analytics aggregation Lambdas, via `src/lib/Api.ts`. `src/lib/Constants.ts` derives `HOSTING` vs `PREFIXES` endpoint lists straight from `conf/config.js` by checking whether an endpoint has any `prefix`-type service.

## Deployment

Each component's `serverless.yml` references `${param.SOMETHING}` values supplied externally — deployment tooling and secrets live outside this repo, so these files won't run standalone.
