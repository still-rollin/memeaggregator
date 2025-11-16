import Redis from "ioredis";

// Use REDIS_URL for Render deployment, fallback to host/port for local
const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl
  ? new Redis(redisUrl, {
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
    })
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      db: 0,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });

redis.on("connect", () => {
  console.log("[REDIS] Connected");
});

redis.on("error", (err) => {
  console.error("[REDIS] Error:", err);
});
