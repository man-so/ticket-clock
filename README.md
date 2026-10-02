# Ticket Clock

## Overview

Ticket Clock is a lightweight web utility that shows an estimated ticket-provider server time and the time remaining until a ticket opening.

It is designed for a single high-focus flow:

```text
Choose provider
-> Set ticket opening time
-> Sync estimated server time
-> Watch countdown
-> Final 10 seconds
-> GO!
```

## Supported Providers

- Interpark
- YES24
- Ticketlink
- Melon Ticket
- Weverse

## Features

- Estimated server time
- Countdown to ticket opening
- Five allowlisted ticket providers
- Automatic synchronization
- Manual re-sync
- Final 10-second countdown
- GO state
- Responsive mobile and desktop UI

## Architecture

```text
Browser
↓
Ticket Clock API
↓
Provider
↓
Sampling
↓
Offset Estimator
↓
Clock Engine
↓
Countdown
```

The browser never sends arbitrary provider URLs. It only sends an allowlisted provider ID to:

```text
GET /api/time/[provider]
```

The server resolves that ID through the provider registry and performs multiple HTTP samples against the configured provider endpoint.

## Accuracy Limitation

Ticket Clock uses the HTTP `Date` response header as the basis for the provider clock estimate.

HTTP `Date` is serialized with one-second precision. The milliseconds shown in the UI are not milliseconds provided by the ticket provider. They are display precision advanced from the latest estimated server-time reference using monotonic elapsed time.

Ticket Clock does not guarantee millisecond-level accuracy for the actual ticket transaction server clock. Treat the display as an estimated provider clock, not an exact transaction-server clock.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Start the production build locally:

```bash
npm run build
npx next start
```

## Testing

Run type checking:

```bash
npm run lint
```

Run unit tests:

```bash
npm test
```

Run production build validation:

```bash
npm run build
```

Run dependency audit:

```bash
npm audit
```

Current tests cover provider registry behavior, sampling, offset estimation, clock reference behavior, countdown calculations, and UI state logic.

## Deployment

The app is a Next.js App Router project and can be deployed to Vercel.

No API keys or secrets are required. The server-side time API performs outbound HTTP requests only to allowlisted provider endpoints.

## Roadmap

Validated future improvements:

- Longer staging observation across different traffic windows
- Optional sync result caching to reduce provider request volume
- Offset delta smoothing if production re-sync jumps become visible
- Provider-specific reliability monitoring
- Manual sleep/resume QA on real devices
