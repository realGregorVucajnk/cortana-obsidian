---
date: 2026-02-10
type: pattern
domain: work
status: active
project: "acme-api"
tags:
  - knowledge
  - pattern
summary: "Token bucket rate limiter with Redis + in-memory fallback"
source_sessions:
  - "[[2026-02-10_1643_add-rate-limiting-middleware]]"
category: "backend"
---

# Token bucket rate limiter with Redis + in-memory fallback

## Context

APIs need rate limiting in production (distributed, multi-pod) but developers shouldn't need Redis running locally just to work on unrelated features.

## Pattern

Use a token bucket algorithm with a pluggable backing store:

- **Production:** Redis store shared across all pods. Consistent rate limiting regardless of which pod handles the request.
- **Local dev:** In-memory `Map` store. Zero external dependencies. Automatically selected when `REDIS_URL` is not set.

The store interface is simple — `get(key)`, `set(key, tokens, ttl)` — so swapping implementations is trivial.

## When to Use

- Any Express/Fastify API that needs per-client rate limiting
- Distributed deployments where rate state must be shared
- Projects where local dev simplicity matters (most projects)

## When NOT to Use

- If you only have a single instance, in-memory is sufficient — skip the abstraction
- If you need sub-millisecond precision (use a dedicated rate limiting service instead)

## Implementation Notes

```typescript
interface RateLimitStore {
  get(key: string): Promise<{ tokens: number; timestamp: number } | null>;
  set(key: string, tokens: number, ttl: number): Promise<void>;
}
```

The middleware reads `X-API-Key` header (or falls back to IP) and checks/decrements the bucket on every request. On 429, it sets `Retry-After` header with seconds until next token.
