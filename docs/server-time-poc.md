# Ticket Clock Phase 1 Server Time PoC

## Environment

- Test time: 2026-10-02 22:45:04-22:45:55 KST
- Runtime: Node.js v22.16.0
- OS: Windows, x64
- Test location context: Asia/Seoul client timezone
- Raw data: `data/server-time-poc-results.json`
- Samples: 5 providers x 2 rounds x 12 samples = 120 HTTP samples
- Wait between rounds: 5 seconds
- Timeout: 8 seconds per request
- Clock measurement: request elapsed time uses `performance.now()` monotonic clock

The interval between rounds was intentionally short to avoid delaying the PoC. This gives a quick stability check, not a long-running drift study.

## Target Endpoints

The PoC used allowlisted official service endpoints only. It did not expose or test an arbitrary URL API.

| Provider | Target URL | Official endpoint basis |
|---|---|---|
| Interpark | `https://ticket.interpark.com/` | Search results identify this as the current Interpark/NOL ticket page. |
| YES24 | `https://ticket.yes24.com/` | YES24 Ticket official pages use `ticket.yes24.com`. |
| Ticketlink | `https://www.ticketlink.co.kr/` | Ticketlink company/help pages state `ticketlink.co.kr` as the official domain. |
| Melon Ticket | `https://ticket.melon.com/` | Melon Ticket official pages and public links use `ticket.melon.com`. |
| Weverse | `https://ticket.weverse.io/` | Weverse Ticket official page is hosted at `ticket.weverse.io`. |

Reference pages checked during endpoint selection:

- Interpark: <https://ticket.interpark.com/>
- YES24: <https://ticket.yes24.com/>
- Ticketlink: <https://www.ticketlink.co.kr/>
- Melon Ticket: <https://ticket.melon.com/>
- Weverse Ticket: <https://ticket.weverse.io/>

## Method

For each provider the script sent repeated HTTP requests from the Ticket Clock backend environment.

Each sample records:

- provider and target URL
- request start wall-clock time
- response received wall-clock time
- HTTP status
- final URL and redirect status
- HTTP `Date` response header
- RTT in milliseconds
- estimated offset using midpoint correction
- request error, if any

The offset calculation is:

```text
estimated offset = HTTP Date header - midpoint(local request start, local response received)
```

The PoC compares these practical modes:

- Raw Date: use the HTTP `Date` header as received.
- RTT correction: estimate server time at the local midpoint.
- Multiple samples: use the median offset.
- Outlier filtering: remove high-RTT samples, then use the median offset.

Important: HTTP `Date` is serialized with one-second precision. The script calculates millisecond offsets because local clocks and RTT are measured in milliseconds, but those values must not be interpreted as true millisecond server-time accuracy.

## Provider Results

| Provider | Date Header | Median RTT | Offset Spread | Server Fetch | Stability | Recommendation |
|---|---|---:|---:|---|---|---|
| Interpark | Present, 24/24 | 38.9 ms | 871.5 ms | Yes, HTTP 200 | Stable over short 2-round test | SUPPORTED CANDIDATE for backend edge-time estimate |
| YES24 | Present, 24/24 | 96.4 ms | 956.0 ms | Yes, HTTP 200 | Stable, but highest RTT in this run | SUPPORTED CANDIDATE with conservative accuracy copy |
| Ticketlink | Present, 24/24 | 33.1 ms | 826.0 ms | Yes, HTTP 200 | Stable over short 2-round test | SUPPORTED CANDIDATE for backend edge-time estimate |
| Melon Ticket | Present, 24/24 | 45.1 ms | 843.0 ms | Yes, HTTP 200 | Stable over short 2-round test | SUPPORTED CANDIDATE for backend edge-time estimate |
| Weverse | Present, 24/24 | 36.8 ms | 974.5 ms | Yes, HTTP 200 | Stable over short 2-round test | SUPPORTED CANDIDATE with endpoint caveat |

Detailed stats:

| Provider | Success | Failure | Min RTT | Max RTT | Median Offset | Min Offset | Max Offset | Filtered Median Offset |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Interpark | 24 | 0 | 24.4 ms | 69.9 ms | -689.3 ms | -1111.5 ms | -240.0 ms | -667.0 ms |
| YES24 | 24 | 0 | 72.5 ms | 112.9 ms | -675.0 ms | -1159.5 ms | -203.5 ms | -675.0 ms |
| Ticketlink | 24 | 0 | 13.2 ms | 72.2 ms | -781.0 ms | -1187.0 ms | -361.0 ms | -776.5 ms |
| Melon Ticket | 24 | 0 | 17.4 ms | 62.5 ms | -642.3 ms | -1066.0 ms | -223.0 ms | -642.3 ms |
| Weverse | 24 | 0 | 14.5 ms | 48.5 ms | -729.8 ms | -1216.5 ms | -242.0 ms | -699.0 ms |

All sampled responses returned HTTP 200 and no redirect was observed for the selected URLs.

## Browser vs Backend Structure

### Browser -> Ticket Site

This is not appropriate for the current MVP.

Browser JavaScript cannot reliably read the target `Date` header unless the provider allows the Ticket Clock origin with CORS and exposes the `Date` header via `Access-Control-Expose-Headers`.

Observed CORS probe:

| Provider | ACAO | Exposes Date | Browser can read Date |
|---|---|---|---|
| Interpark | Reflected probe origin | No | No |
| YES24 | Non-matching/truncated value observed | No | No |
| Ticketlink | Different allowed origin | No | No |
| Melon Ticket | None | No | No |
| Weverse | None | No | No |

### Browser -> Ticket Clock API -> Ticket Site

This is the better structure for Phase 2.

The backend can request allowlisted providers, read `Date`, apply a multi-sample offset algorithm, and return a signed or cached provider clock estimate to the browser.

However, the measured RTT is:

```text
Ticket Clock backend <-> Ticket provider
```

It is not:

```text
User browser <-> Ticket provider
```

Therefore Ticket Clock must not claim to know the user's actual network latency to the ticket provider.

## Accuracy Analysis

The following factors prevent a millisecond-accurate claim:

- HTTP `Date` header has one-second precision.
- RTT correction assumes symmetric request/response latency, which is not guaranteed.
- CDN, reverse proxy, cache, and load balancer layers may generate or forward `Date`.
- The official web endpoint may not be the same system that accepts the final ticket purchase transaction.
- Upstream and edge server clocks may differ.
- Local machine clock correctness was not independently validated with NTP during this PoC.

The observed offset spreads are roughly 0.8-1.0 seconds. This is expected when the remote value is second-granularity HTTP Date and the samples cross second boundaries.

The PoC supports displaying a smooth millisecond-updating estimated clock after synchronization. It does not support claiming that the displayed millisecond digits are the provider's true server milliseconds.

## Provider Classification

| Provider | Classification | Rationale |
|---|---|---|
| Interpark | SUPPORTED CANDIDATE | Official endpoint returned 24/24 Date headers, low RTT, no redirect. Still limited to web edge-time estimate. |
| YES24 | SUPPORTED CANDIDATE | Official endpoint returned 24/24 Date headers, no redirect. RTT was higher than others but stable enough for backend estimate. |
| Ticketlink | SUPPORTED CANDIDATE | Official endpoint returned 24/24 Date headers, low median RTT, no redirect. |
| Melon Ticket | SUPPORTED CANDIDATE | Official endpoint returned 24/24 Date headers, low median RTT, no redirect. |
| Weverse | SUPPORTED CANDIDATE | Official ticket endpoint returned 24/24 Date headers, low RTT, no redirect. Needs extra validation against real sale flow because Weverse ticketing may hand off between services. |

These classifications mean "candidate for conservative backend HTTP Date based clock estimation." They do not mean "exact ticket transaction server time is known."

## Answers

### Q1. 현재 방식으로 Ticket Clock이라는 제품이 기술적으로 성립하는가?

Yes, as a backend-measured estimated provider clock. The core PoC succeeded for all five target providers: server-side requests were possible and all returned usable HTTP `Date` headers.

It does not technically support a stronger product claim such as exact ticketing server time or millisecond-accurate opening time.

### Q2. HTTP Date 기반으로 실제로 주장할 수 있는 정확도 수준은 어느 정도인가?

This PoC can support a conservative claim around second-level HTTP server/edge time estimation with RTT-aware smoothing.

It cannot prove 1 ms, 10 ms, NTP-synchronized, KRISS-synchronized, or exact origin-server accuracy. The wire header itself is second precision, and the observed spread is near one second.

### Q3. 화면에 표시하는 milliseconds는 어떤 의미로 정의해야 하는가?

Milliseconds should mean:

```text
Client-rendered interpolation from the latest backend-estimated provider clock offset.
```

They should not mean:

```text
The provider's actual server milliseconds.
```

UI copy should avoid implying exact milliseconds. A suitable internal term is "estimated provider clock."

### Q4. 어떤 Provider를 MVP에서 지원하는 것이 합리적인가?

All five can be included as MVP candidates if the product copy is conservative:

- Interpark
- YES24
- Ticketlink
- Melon Ticket
- Weverse

For launch risk, Interpark, Ticketlink, Melon Ticket, and Weverse had lower RTT in this run. YES24 is still usable but should be monitored because it had the highest median RTT.

### Q5. 브라우저 직접 측정과 Ticket Clock backend 측정 중 어떤 구조가 더 적절한가?

Ticket Clock backend measurement is more appropriate.

Browser direct measurement is blocked for this purpose because the tested providers did not expose the `Date` header to browser JavaScript through CORS.

### Q6. Clock Engine은 어떤 synchronization algorithm을 사용하는 것이 적절한가?

Recommended Phase 2 algorithm:

1. For each allowlisted provider, collect a small burst of samples.
2. Compute offset using midpoint correction.
3. Filter high-RTT outliers.
4. Use median offset from the remaining samples.
5. Attach confidence metadata: sample count, median RTT, offset spread, last synced time.
6. Refresh periodically and degrade confidence when fetches fail or offset spread grows.

Avoid using a single request as the displayed source of truth.

### Q7. 다음 Phase로 진행하기 전에 해결해야 할 기술적 위험은 무엇인가?

- Validate whether provider homepage Date matches actual booking or queue flow endpoints.
- Decide whether to run the backend in Korea or in the deployment region where users are expected.
- Monitor provider blocking, rate limiting, bot mitigation, and Terms of Service risk.
- Define conservative UI language for millisecond display.
- Add production API allowlist and timeout enforcement.
- Add longer stability testing across minutes/hours and traffic periods.
- Add backend caching so many users do not trigger many provider requests.

## Security Notes

Do not implement:

```text
/api/time?url=https://arbitrary-domain.com
```

Use a provider allowlist:

```text
interpark
yes24
ticketlink
melon
weverse
```

Every outbound request should have a timeout. Provider responses should store headers and timing metadata only, not response bodies.
