// src/services/rateLimiter.ts

interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const record = this.requestCounts.get(key);

    if (!record || now > record.resetTime) {
      // Reset the counter
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (record.count < this.config.maxRequests) {
      record.count++;
      return true;
    }

    // Rate limit exceeded
    const waitTime = record.resetTime - now;
    await this.delay(waitTime);

    // Reset after waiting
    this.requestCounts.set(key, {
      count: 1,
      resetTime: Date.now() + this.config.windowMs,
    });

    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// DexScreener: 300 requests/min
export const dexScreenerLimiter = new RateLimiter({
  maxRequests: 300,
  windowMs: 60 * 1000, // 1 minute
});

// Jupiter: ~300 requests/min (estimated)
export const jupiterLimiter = new RateLimiter({
  maxRequests: 300,
  windowMs: 60 * 1000,
});

// GeckoTerminal: ~30 requests/min (free tier, conservative estimate)
export const geckoTerminalLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
});
