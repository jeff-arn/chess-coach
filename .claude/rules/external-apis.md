# External APIs rules

Conventions for integrating with the chess.com Published-Data API and the Anthropic API.

## chess.com Published-Data API

### Overview

The chess.com Published-Data API is **public, read-only, and requires no authentication**. There is no API token to manage. Every call is an unauthenticated GET.

### Required User-Agent

Every request **must** include a descriptive `User-Agent` header. chess.com blocks or throttles requests without one.

```ts
const CHESSCOM_USER_AGENT = 'chess-coach/1.0 (https://github.com/your-org/chess-coach; contact@example.com)';
```

Set this header on every outbound call in the chess.com client module. Never omit it.

### Endpoints used

- **Monthly game archive**: `https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}`
  - Returns JSON with a `games` array. Each element has at minimum: `url`, `pgn`, `time_control`, `end_time`, `white`, `black`.
- **Player stats**: `https://api.chess.com/pub/player/{username}/stats`
  - e.g. `chess_rapid.last.rating` for the user's rapid rating.

### Username validation

Validate usernames client-side and server-side before including them in a URL:

```ts
const CHESSCOM_USERNAME_RE = /^[A-Za-z0-9_-]{1,32}$/;
```

Reject invalid usernames with a 400 before making any outbound call.

### Rate limits and backoff

- Honor `Retry-After` headers. Back off exponentially on 429 responses.
- Do not poll automatically. Sync is a user-triggered action; do not schedule background syncs without explicit user opt-in.
- Never hammer the API in a tight loop. Fetch one month at a time and pause between requests if fetching many months.

### Error handling

- `404` for unknown usernames: surface "Username not found on chess.com."
- `429` Too Many Requests: back off and retry; if retries exhausted, show "chess.com rate limit reached — try again in a moment."
- `503` / `502` (chess.com downtime): show "chess.com is temporarily unavailable — try again shortly." Do not show raw HTTP status codes to users.
- Network errors: show "Could not connect to chess.com." with a retry button.
- Never expose chess.com API response bodies directly in the UI.

### Data storage

- The game **`url`** field is the stable primary key for the games table. Do not generate surrogate IDs for games — the chess.com URL is globally unique and stable.
- Responses are validated with **zod** at the API boundary before any field is read. Unexpected shapes are treated as errors.

## Anthropic API

See `llm-coach.md` for prompt structure, model selection, streaming, and fallback behavior. This section covers transport and error handling only.

### Transport

- All Anthropic API calls are made **server-side** from `app/api/` route handlers. The browser never contacts `api.anthropic.com` directly.
- Use the official `@anthropic-ai/sdk` TypeScript SDK. Do not hand-roll `fetch` calls to the Anthropic endpoint.
- Set a request timeout of 30 seconds on every call. Long-running streaming responses should be chunked to the client as they arrive; the timeout applies to time-to-first-chunk, not total response time.

### Error handling

- `401 Unauthorized`: API key is invalid or missing. Log server-side. Return a non-revealing error to the client; activate the fallback coach.
- `429 Too Many Requests`: back off with exponential retry (max 3 attempts, starting at 1 second). If all retries fail, activate the fallback coach.
- `500` / `529` (Anthropic overload): activate the fallback coach. Log the error with the request ID from the response header for debugging.
- Never surface Anthropic error messages, request IDs, or model names in the client-facing error UI.

### Caching

- Cache Anthropic responses by `(gameId, ply, promptHash)` in SQLite. A cache hit skips the API call entirely.
- The prompt hash is a SHA-256 of the serialized prompt inputs (FEN, SAN, bestSan, cpLoss, moveClass, tags). If the prompt content changes (e.g., system prompt update), the hash changes and the cache is effectively invalidated.
- Cache TTL: indefinite. Coach explanations for a fixed position do not become stale; only a deliberate cache clear or a schema migration clears them.

## Client module design and mock seam

Both the chess.com client and the Claude client are **behind interfaces**. There is exactly **one mock seam** per client — the module itself — so tests never reach the real network.

```ts
// src/lib/chesscom/client.ts  — the single seam for chess.com
export interface ChesscomClient {
  getMonthlyGames(username: string, year: number, month: number): Promise<ChesscomGame[]>;
  getPlayerStats(username: string): Promise<ChesscomStats>;
}

// src/lib/coach/client.ts  — the single seam for the Anthropic SDK
export interface CoachClient {
  streamExplanation(prompt: CoachPrompt): AsyncIterable<string>;
}
```

In unit and component tests, mock these modules with `vi.mock(...)`. In Playwright E2E tests, intercept at the network layer with `page.route(...)`. Never mock `fetch` directly.

## Calling external services — where it is allowed

- **Only from `app/api/` route handlers** (Next.js API routes) or Server Actions.
- **Never from Client Components** — they run in the browser and must not call chess.com or Anthropic directly.
- Server Components may read from the database but must delegate external HTTP to API routes or server utilities.

## Shared conventions for all external HTTP

- **Typed responses.** Parse all API responses with zod schemas at the boundary. Treat unexpected shapes as errors, not unknowns.
- **Structured logging.** Log outbound request (method, URL without query params, timestamp) and inbound response (status, latency, error code if any). Never log request bodies that may contain tokens or personal data.
- **Timeouts on every call.** Every outbound HTTP call has an explicit timeout. No call relies on the default (often infinite) timeout.
- **No `any` in API response types.** Even underdocumented APIs get a typed schema — derive it from the actual response shape, mark uncertain fields as `unknown`, and narrow at use sites.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
