# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PodUptime is a distributed uptime monitoring system for the podcast industry (built/maintained by Spreaker). It measures availability of podcast hosting platforms and tracking prefixes from multiple AWS regions. Full architecture description: `README.md` and `doc/architecture.excalidraw.svg`.

The repo has three independently deployed components plus shared config:

- **`monitor/`** — multi-region measurement system. A scheduled `kickstart` Lambda pushes one job per monitored service to SQS every minute; a `check-endpoint` Lambda consumes the queue, performs the HTTP check, and publishes a `measurement` event to EventBridge.
- **`analytics/`** — ingests measurement events (fanned out from all monitor regions to one central EventBridge bus), stores raw data in S3 (Athena-friendly) and structured data in Aurora Serverless Postgres, and runs scheduled aggregation/retention Lambdas whose output (JSON files in S3) is the data source for the website.
- **`website/`** — static Astro + Tailwind site reading the aggregated JSON from S3/CloudFront, deployed as a static site.
- **`conf/`** — configuration shared between `monitor`, `analytics`, and `website` (endpoints/services to monitor, regions, etc.), isomorphic between Node and browser (see `conf/config.js`).

`monitor`, `analytics`, and `website` each have their own `package.json`, `package-lock.json`, and `serverless.yml`, and are deployed independently. `serverless.yml` files reference `${param.SOMETHING}` values injected at deploy time by tooling outside this repo — they won't run standalone.

## Commands

Local dev happens inside a Docker container that also runs a Postgres sidecar (schema auto-loaded on start):

```shell
docker compose build dev && docker compose run --rm dev sh
```

Run tests (root-level `node --test`, covers `monitor`, `analytics`, and root `conf_test.js`; requires the Postgres sidecar/env vars, see `.github/workflows/tests.yml` for the exact env vars used in CI):

```shell
npm run test
npm run test-watch   # watch mode
```

Run a single test file directly with the native runner, e.g.:

```shell
node --test monitor/functions/check-endpoint/handler_test.js
```

Run the website locally against real `poduptime.com` data/config:

```shell
cd website
npm install
STAGE=prod PUBLIC_STAGE=prod npm run dev -- --host
```

`STAGE`/`PUBLIC_STAGE` select `conf/config_${STAGE}.js` (`STAGE` drives Astro's server-side generation, `PUBLIC_STAGE` drives client-side JS — always set both to the same value).

## Architecture notes

- Everything is ESM (`"type": "module"` everywhere); Lambda handlers are plain exported async functions (e.g. `export const checkEndpoint = async (event, context) => {...}`).
- `monitor/functions/check-endpoint/handler.js` creates/destroys a dedicated `undici` `Agent` per measurement (rather than reusing the global agent) so that keep-alive connection reuse only happens within a single redirect chain, not across separate measurements. Prefix-type services are checked with `maxRedirections: 0` and must return a 3xx redirecting to the configured `expected_url`; other service types must return `200`.
- Dependency injection for testability: handlers accept things like `agentFactory` via the Lambda `context` object (see `context?.agentFactory ?? createAgent` in `check-endpoint/handler.js`) so tests can substitute fakes without mocking modules.
- `analytics/common/database.js` manages a lazily-created `pg` `Pool` authenticated via IAM/RDS `Signer` tokens (short-lived, refreshed based on `EXPIRE_TOLERANCE`/`TOKEN_LIFETIME`); set `PGPASSWORD` to bypass IAM auth for local/test Postgres. TLS is only enabled when `AWS_EXECUTION_ENV` is set (i.e., running in real Lambda).
- `analytics/deployment/database/schema.sql` defines two tables: `measurements` (all results, aggregated later) and `unavailables` (raw failure details kept short-term for troubleshooting).
- Adding a new endpoint/service to monitor requires: (1) an entry in `conf/config_${STAGE}.js` (prefix services need `expected_url`), (2) if it's a prefix endpoint, a new `<item>` in `website/public/rss/feed.xml` so prefix services can validate against a real feed, and (3) a changelog entry in `website/src/pages/changelog.astro`.
- `conf/config.js` picks `config_prod.js` vs `config_nonprod.js` based on `STAGE`/`PUBLIC_STAGE` env vars, and is written to work both under Node (`process.env`) and in the browser (`import.meta.env`) — keep that dual-environment compatibility in mind when editing it.
