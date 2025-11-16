// src/scheduler/scheduler.ts

import { redis } from "../../utils/redisClient";
import { fetchTopDexPairs, fetchJupiterPrice } from "../dexscreener";
import { fetchGeckoPrice } from "../geckoterminal";
import axios from "axios";


export class Scheduler {
  static async refreshTokenList() {
    try {
      console.log("🔄 Refreshing token list...");

      // Use the working fetchTopDexPairs function
      const tokens = await fetchTopDexPairs();
      await redis.set("token:list", JSON.stringify(tokens));

      console.log(`✅ Token list refreshed: ${tokens.length} tokens`);
    } catch (err) {
      console.error("❌ Error refreshing token list", err);
    }
  }

  static async preWarmTopTokens() {
    try {
      console.log("🔥 Pre-warming top tokens cache...");

      const topPairs = await fetchTopDexPairs();
      for (const pair of topPairs) {
        const redisKey = `token:${pair.baseToken.address}`;
        // Set with 30 second TTL to match aggregator caching
        await redis.setex(redisKey, 30, JSON.stringify(pair));
      }

      console.log(`🔥 Pre-warm complete: ${topPairs.length} tokens cached`);
    } catch (err) {
      console.error("❌ Error in preWarmTopTokens()", err);
    }
  }

  static async autoUpdateRedis() {
    try {
      console.log("⚙️ Updating Redis with latest prices...");

      // Refresh top tokens to trigger WebSocket updates
      const topPairs = await fetchTopDexPairs();

      for (const pair of topPairs.slice(0, 30)) {
        const mint = pair?.baseToken?.address;
        if (!mint) continue;

        // Update the token cache (this will trigger WebSocket watcher)
        const redisKey = `token:${mint}`;
        await redis.setex(redisKey, 30, JSON.stringify(pair));
      }

      console.log("🟢 Live prices updated.");
    } catch (err) {
      console.error("❌ Error in autoUpdateRedis()", err);
    }
  }

  static start() {
    console.log("🚀 Scheduler started.");

    // Refresh token list every 5 minutes
    setInterval(this.refreshTokenList, 5 * 60 * 1000);

    // Pre-warm high-volume tokens every 2 minutes
    setInterval(this.preWarmTopTokens, 2 * 60 * 1000);

    // Update live price cache every 15 seconds
    setInterval(this.autoUpdateRedis, 15 * 1000);

    // Run once at start
    this.refreshTokenList();
    this.preWarmTopTokens();
    this.autoUpdateRedis();
  }
}
