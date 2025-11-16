 Meme Coin Aggregator

A lightweight real-time aggregation service that collects, merges, and caches meme-coin data from multiple DEX sources. It provides fast REST APIs and WebSocket support for live updates, built around Redis caching and background workers.

## Live Demo

**Base URL:** [https://meme-aggregator-api.onrender.com](https://meme-aggregator-api.onrender.com)

Try the live endpoints:

* Health Check: [https://meme-aggregator-api.onrender.com/health](https://meme-aggregator-api.onrender.com/health)
* Token List: [https://meme-aggregator-api.onrender.com/api/tokens?limit=10](https://meme-aggregator-api.onrender.com/api/tokens?limit=10)
* WebSocket Test: Open `public/websocket-demo.html` and connect to the live server.

> Free hosting may take ~30–60 seconds to wake up on first request.

---

## Features

* Pulls data from DexScreener, Jupiter, and GeckoTerminal
* Merges token data into a single normalized format
* Redis-based caching with auto-refresh
* WebSocket stream for live token updates
* Built-in rate limiter with backoff
* Filtering, sorting, and cursor-based pagination
* Background jobs that pre-warm hot tokens

---

## Tech Stack

* **Node.js + TypeScript**
* **Express** for REST APIs
* **Socket.io** for WebSockets
* **Redis** (ioredis client)
* **Axios** with retry logic
* **Custom scheduler** for background jobs

---

## Project Structure

```
src/
├── __tests__/           # Tests
├── routes/              # Express routes
├── services/            # Core logic & integrations
│   ├── aggregator.ts
│   ├── cache.ts
│   ├── dexscreener.ts
│   ├── geckoterminal.ts
│   ├── normalizer.ts
│   ├── rateLimiter.ts
│   └── scheduler/
├── sockets/             # WebSocket logic
├── utils/               # Helpers (Redis, etc.)
└── server.ts            # Entry point
```

### Important Files

#### `server.ts`

* Starts the Express app & WebSocket server
* Attaches health check routes
* Loads background tasks (token refresh, pre-warming)

#### `routes/tokenRoutes.ts`

* `/api/token/:address` → fetch a single token
* `/api/tokens` → list tokens with sorting, filtering, pagination
* `/api/tokens/search` → name/address search

#### `services/aggregator.ts`

* Fetches data from all sources in parallel
* Applies retries with backoff
* Merges responses into one object
* Stores results in Redis

#### `services/normalizer.ts`

* Converts DexScreener / Jupiter / GeckoTerminal responses into a unified format
* Ensures consistent keys and null handling

#### `services/cache.ts`

* Wrapper around Redis `get/set/delete`
* Handles JSON serialization
* Token-specific helpers

#### `services/rateLimiter.ts`

* Sliding-window rate limiter
* Per-API limits (DexScreener, Jupiter, GeckoTerminal)
* Auto waits when limit is hit

#### `sockets/socket.ts`

* Broadcasts token updates to clients
* Detects price/volume changes compared to last broadcast
* Sends only meaningful deltas

#### `scheduler/scheduler.ts`

* Updates the token list every 5 minutes
* Pre-warms top tokens every 2 minutes
* Refreshes live prices every 15 seconds

---

## Installation

```bash
npm install
```

Redis installation:

**macOS**

```bash
brew install redis
redis-server
```

**Ubuntu**

```bash
sudo apt-get install redis-server
```

---

## Environment Variables

`.env` file:

```
PORT=4000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

## Running the App

```bash
npm run dev       # dev mode
npm run build
npm start         # production
```

---

## API Overview

### Health Check

```
GET /health
```

### Single Token

```
GET /api/token/:address
```

### Token List

```
GET /api/tokens?limit=20&sortBy=volume24hUsd&minVolume=10000
```

### Search

```
GET /api/tokens/search?q=SOL
```

---

## WebSocket Usage

```javascript
const socket = io('https://meme-aggregator-api.onrender.com');

socket.on('token_update', (data) => {
  console.log(data);
});
```

Example payload:

```json
{
  "tokenAddress": "...",
  "priceUsd": 1.52,
  "volume24hUsd": 102000,
  "liquidityUsd": 48000,
  "updatedAt": 1234567890
}
```

---

## Architecture Notes

### Multi-Source Aggregation

Each provider gives different pieces of data. DexScreener has the richest dataset, GeckoTerminal gives multi-chain support, and Jupiter provides highly accurate Solana prices.

Data is fetched in parallel using `Promise.allSettled()` so one failing source doesn't block others.

Priority order during merge:

1. DexScreener
2. GeckoTerminal
3. Jupiter

Missing fields are filled from whichever source has them.

---

### Caching

Redis stores token data for 30 seconds.
This avoids hitting upstream APIs unnecessarily and keeps responses fast.

The scheduler pre-warms the top tokens every 2 minutes so the cache is rarely cold.

---

### Rate Limiting

Each upstream API has different rate limits.
A custom sliding-window limiter ensures we don’t exceed them.
If limits are reached, the system waits instead of erroring.

---

### Real-time Updates

A small watcher checks Redis every 2 seconds, compares values with the previous snapshot, and broadcasts only if something important changed (price/volume jump).

This is very lightweight and works well for live dashboards & bots.

---

### Pagination

Cursor-based pagination is used instead of offset-based to avoid repeating/missing items during real-time updates.

---

## Tests

```bash
npm test
npm test -- --coverage
```

Covers:

* Normalizers
* Rate limiter
* API routes
* Error handling

---

## Deployment

Free-tier friendly:

* Render
* Railway
* Fly.io

Environment variables required:

* PORT
* Redis host/port


