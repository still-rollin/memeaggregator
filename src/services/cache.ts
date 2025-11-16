// src/services/cache.ts
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

redis.on("connect", () => console.log("📦 Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

/* --------------------------------------------------------
   HELPERS FOR JSON CACHING
--------------------------------------------------------- */

export async function cacheSet(key: string, value: any, ttlSeconds: number = 30) {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("❌ Redis SET error:", err);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error("❌ Redis GET error:", err);
    return null;
  }
}

export async function cacheDelete(key: string) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("❌ Redis DEL error:", err);
  }
}

export async function cacheKeys(pattern: string) {
  return redis.keys(pattern);
}

/* --------------------------------------------------------
   TOKEN CACHING HELPERS (specific for this project)
--------------------------------------------------------- */

export async function cacheTokenData(
  tokenAddress: string,
  data: any,
  ttlSeconds = 30
) {
  const key = `token:${tokenAddress}`;
  await cacheSet(key, data, ttlSeconds);
}

export async function getCachedToken(tokenAddress: string) {
  const key = `token:${tokenAddress}`;
  return cacheGet(key);
}

export default redis;
