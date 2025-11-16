// src/routes/tokenRoutes.ts

import { Router } from "express";
import { getTokenData } from "../services/aggregator";
import redis, { cacheKeys } from "../services/cache";

const router = Router();

/* --------------------------------------------------------
   1️⃣ GET SINGLE TOKEN
   Example: /token/xxxx
--------------------------------------------------------- */
router.get("/token/:address", async (req, res) => {
  try {
    const token = await getTokenData(req.params.address);

    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }

    return res.json(token);
  } catch (err) {
    console.error("❌ Error /token/:address", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* --------------------------------------------------------
   2️⃣ SEARCH TOKENS (local, cached only)
   Example: /tokens/search?q=pipe
   Later the frontend can combine with Dex Screener search.
--------------------------------------------------------- */
router.get("/tokens/search", async (req, res) => {
  const query = (req.query.q as string)?.toLowerCase() || "";

  if (!query) return res.json([]);

  // List Redis keys
  const keys = await cacheKeys("token:*");

  const results: any[] = [];

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;

    const token = JSON.parse(raw);

    if (
      token.tokenAddress.toLowerCase().includes(query) ||
      token?.tokenName?.toLowerCase().includes(query)
    ) {
      results.push(token);
    }
  }

  return res.json(results.slice(0, 20));
});

/* --------------------------------------------------------
   3️⃣ PAGINATED LIST WITH FILTERING & SORTING
   Example: /tokens?limit=20&sortBy=volume&timeframe=24h
--------------------------------------------------------- */
router.get("/tokens", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);
    const cursor = (req.query.cursor as string) || null;
    const sortBy = (req.query.sortBy as string) || "volume24hUsd"; // volume24hUsd, priceChange24h, marketCapUsd, liquidityUsd
    const timeframe = (req.query.timeframe as string) || "24h"; // 1h, 24h, 7d
    const minVolume = Number(req.query.minVolume || 0);

    const keys = await cacheKeys("token:*");

    // Fetch all tokens
    const allTokens = [];
    for (const key of keys) {
      const raw = await redis.get(key);
      if (raw) {
        const token = JSON.parse(raw);

        // Apply volume filter
        if (minVolume > 0 && (!token.volume24hUsd || token.volume24hUsd < minVolume)) {
          continue;
        }

        allTokens.push(token);
      }
    }

    // Sort tokens based on the sortBy parameter
    allTokens.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      switch (sortBy) {
        case "volume24hUsd":
          aVal = a.volume24hUsd || 0;
          bVal = b.volume24hUsd || 0;
          break;
        case "priceChange1h":
          aVal = a.priceChange1h || 0;
          bVal = b.priceChange1h || 0;
          break;
        case "priceChange24h":
          aVal = a.priceChange24h || 0;
          bVal = b.priceChange24h || 0;
          break;
        case "priceChange7d":
          aVal = a.priceChange7d || 0;
          bVal = b.priceChange7d || 0;
          break;
        case "marketCapUsd":
          aVal = a.marketCapUsd || 0;
          bVal = b.marketCapUsd || 0;
          break;
        case "liquidityUsd":
          aVal = a.liquidityUsd || 0;
          bVal = b.liquidityUsd || 0;
          break;
        default:
          aVal = a.volume24hUsd || 0;
          bVal = b.volume24hUsd || 0;
      }

      return bVal - aVal; // Descending order
    });

    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allTokens.findIndex((t) => `token:${t.tokenAddress}` === cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const paginatedTokens = allTokens.slice(startIndex, startIndex + limit);
    const nextCursor =
      paginatedTokens.length === limit && startIndex + limit < allTokens.length
        ? `token:${paginatedTokens[paginatedTokens.length - 1].tokenAddress}`
        : null;

    return res.json({
      data: paginatedTokens,
      nextCursor,
      total: allTokens.length,
    });
  } catch (err) {
    console.error("❌ Error in /tokens", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
