// src/__tests__/normalizer.test.ts

import {
  normalizeDexScreener,
  normalizeJupiter,
  normalizeGeckoTerminal,
} from "../services/normalizer";

describe("Normalizer Tests", () => {
  describe("normalizeDexScreener", () => {
    it("should normalize DexScreener data correctly", () => {
      const mockData = {
        pairs: [
          {
            chainId: "solana",
            priceUsd: "1.50",
            priceNative: "0.00001",
            marketCap: "1000000",
            liquidity: { usd: "500000" },
            volume: { h24: "250000" },
            priceChange: { h1: "5.2", h24: "10.5", h168: "25.3" },
            txns: { h24: { buys: 100, sells: 50 } },
            baseToken: {
              name: "Test Token",
              symbol: "TEST",
            },
            pairAddress: "testPairAddress123",
            dexId: "raydium",
          },
        ],
      };

      const result = normalizeDexScreener(mockData, "testTokenAddress");

      expect(result).not.toBeNull();
      expect(result?.tokenAddress).toBe("testTokenAddress");
      expect(result?.tokenName).toBe("Test Token");
      expect(result?.tokenSymbol).toBe("TEST");
      expect(result?.priceUsd).toBe(1.5);
      expect(result?.liquidityUsd).toBe(500000);
      expect(result?.volume24hUsd).toBe(250000);
      expect(result?.priceChange1h).toBe(5.2);
      expect(result?.priceChange24h).toBe(10.5);
      expect(result?.transactionCount24h).toBe(150);
      expect(result?.source).toBe("dexscreener");
    });

    it("should return null for empty pairs", () => {
      const mockData = { pairs: [] };
      const result = normalizeDexScreener(mockData, "testTokenAddress");
      expect(result).toBeNull();
    });

    it("should handle missing data gracefully", () => {
      const mockData = {
        pairs: [
          {
            chainId: "solana",
            baseToken: {},
          },
        ],
      };

      const result = normalizeDexScreener(mockData, "testTokenAddress");

      expect(result).not.toBeNull();
      expect(result?.priceUsd).toBeNull();
      expect(result?.liquidityUsd).toBeNull();
    });
  });

  describe("normalizeJupiter", () => {
    it("should normalize Jupiter data correctly", () => {
      const mockData = { price: 2.5 };
      const result = normalizeJupiter(mockData, "testMint");

      expect(result).not.toBeNull();
      expect(result?.tokenAddress).toBe("testMint");
      expect(result?.chain).toBe("solana");
      expect(result?.priceUsd).toBe(2.5);
      expect(result?.source).toBe("jupiter");
    });

    it("should return null for null data", () => {
      const result = normalizeJupiter(null, "testMint");
      expect(result).toBeNull();
    });
  });

  describe("normalizeGeckoTerminal", () => {
    it("should normalize GeckoTerminal data correctly", () => {
      const mockData = {
        data: {
          attributes: {
            name: "Gecko Token",
            symbol: "GECK",
            price_usd: "3.75",
            market_cap_usd: "5000000",
            reserve_in_usd: "750000",
            volume_usd: { h24: "150000" },
            price_percent_change: { h1: "2.1", h24: "8.5" },
          },
        },
      };

      const result = normalizeGeckoTerminal(mockData, "ethereum", "testAddress");

      expect(result).not.toBeNull();
      expect(result?.tokenName).toBe("Gecko Token");
      expect(result?.tokenSymbol).toBe("GECK");
      expect(result?.priceUsd).toBe(3.75);
      expect(result?.marketCapUsd).toBe(5000000);
      expect(result?.priceChange1h).toBe(2.1);
      expect(result?.source).toBe("geckoterminal");
    });

    it("should return null for invalid data", () => {
      const result = normalizeGeckoTerminal({}, "ethereum", "testAddress");
      expect(result).toBeNull();
    });
  });
});
