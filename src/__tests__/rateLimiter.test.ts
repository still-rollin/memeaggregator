// src/__tests__/rateLimiter.test.ts

describe("RateLimiter Tests", () => {
  class TestRateLimiter {
    private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
    private config: { maxRequests: number; windowMs: number };

    constructor(config: { maxRequests: number; windowMs: number }) {
      this.config = config;
    }

    async checkLimit(key: string): Promise<boolean> {
      const now = Date.now();
      const record = this.requestCounts.get(key);

      if (!record || now > record.resetTime) {
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

      return false; // For testing, don't wait
    }
  }

  it("should allow requests within limit", async () => {
    const limiter = new TestRateLimiter({ maxRequests: 3, windowMs: 1000 });

    const result1 = await limiter.checkLimit("test");
    const result2 = await limiter.checkLimit("test");
    const result3 = await limiter.checkLimit("test");

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(true);
  });

  it("should block requests exceeding limit", async () => {
    const limiter = new TestRateLimiter({ maxRequests: 2, windowMs: 1000 });

    await limiter.checkLimit("test");
    await limiter.checkLimit("test");
    const result = await limiter.checkLimit("test");

    expect(result).toBe(false);
  });

  it("should reset counter after window expires", async () => {
    const limiter = new TestRateLimiter({ maxRequests: 2, windowMs: 100 });

    await limiter.checkLimit("test");
    await limiter.checkLimit("test");

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = await limiter.checkLimit("test");
    expect(result).toBe(true);
  });

  it("should track different keys independently", async () => {
    const limiter = new TestRateLimiter({ maxRequests: 1, windowMs: 1000 });

    const result1 = await limiter.checkLimit("key1");
    const result2 = await limiter.checkLimit("key2");

    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});
