// src/services/aggregator.ts

import axios from "axios";
import { cacheTokenData, getCachedToken } from "./cache";
import {
  normalizeDexScreener,
  normalizeJupiter,
  normalizeGeckoTerminal,
  NormalizedTokenData
} from "./normalizer";
import { dexScreenerLimiter, jupiterLimiter, geckoTerminalLimiter } from "./rateLimiter";

// -------------- API BASE URLS --------------
const DEX_API = "https://api.dexscreener.com/latest/dex/tokens/";
const JUP_API = "https://price.jup.ag/v4/price?ids=";
const GT_BASE = "https://api.geckoterminal.com/api/v2/simple/networks";

/* ----------------------------------------------------------
   RETRY WITH EXPONENTIAL BACKOFF
----------------------------------------------------------- */
async function fetchWithRetry(url: string, retries = 3) {
  try {
    return (await axios.get(url)).data;
  } catch (err) {
    if (retries === 0) throw err;

    const delay = Math.pow(2, 3 - retries) * 300; // 300ms, 600ms, 1200ms
    await new Promise((res) => setTimeout(res, delay));

    return fetchWithRetry(url, retries - 1);
  }
}

/* ----------------------------------------------------------
   FETCHERS
----------------------------------------------------------- */

// 1️⃣ DexScreener
async function fetchDexScreener(tokenAddress: string) {
  await dexScreenerLimiter.checkLimit("dexscreener");
  const url = `${DEX_API}${tokenAddress}`;
  const raw = await fetchWithRetry(url);
  return normalizeDexScreener(raw, tokenAddress);
}

// 2️⃣ Jupiter
async function fetchJupiter(tokenAddress: string) {
  await jupiterLimiter.checkLimit("jupiter");
  const url = `${JUP_API}${tokenAddress}`;
  const raw = await fetchWithRetry(url);

  const price = raw?.data?.[tokenAddress]?.price;
  if (!price) return null;

  return normalizeJupiter({ price }, tokenAddress);
}

// 3️⃣ GeckoTerminal
async function fetchGeckoTerminal(tokenAddress: string) {
  const chains = ["solana", "ethereum", "base"]; // Add more if needed

  for (const chain of chains) {
    await geckoTerminalLimiter.checkLimit("geckoterminal");
    const url = `${GT_BASE}/${chain}/tokens/${tokenAddress}`;
    try {
      const raw = await fetchWithRetry(url);
      const normalized = normalizeGeckoTerminal(raw, chain, tokenAddress);
      if (normalized) return normalized;
    } catch {
      continue; // token not on this chain → try next
    }
  }
  return null;
}

/* ----------------------------------------------------------
   MERGING LOGIC - Combine data from multiple sources intelligently
----------------------------------------------------------- */
function mergeResults(results: (NormalizedTokenData | null)[]): NormalizedTokenData | null {
  const valid = results.filter((r) => r !== null) as NormalizedTokenData[];

  if (valid.length === 0) return null;

  // If only one source, return it
  if (valid.length === 1) return valid[0];

  // Merge all data sources, preferring more complete data
  const merged: NormalizedTokenData = {
    tokenAddress: valid[0].tokenAddress,
    chain: valid[0].chain,
    priceUsd: null,
    liquidityUsd: null,
    volume24hUsd: null,
    source: valid.map((v) => v.source).join("+"),
    fetchedAt: Date.now(),
  };

  // Merge strategy: prefer DexScreener for most fields (most complete data)
  // Use Jupiter/Gecko for price verification
  for (const result of valid) {
    // Always prefer non-null values
    merged.tokenName = merged.tokenName || result.tokenName;
    merged.tokenSymbol = merged.tokenSymbol || result.tokenSymbol;
    merged.pairAddress = merged.pairAddress || result.pairAddress;
    merged.dexName = merged.dexName || result.dexName;

    // For numeric fields, prefer DexScreener, then GeckoTerminal, then Jupiter
    if (result.source === "dexscreener") {
      merged.priceUsd = result.priceUsd || merged.priceUsd;
      merged.priceSol = result.priceSol || merged.priceSol;
      merged.marketCapUsd = result.marketCapUsd || merged.marketCapUsd;
      merged.liquidityUsd = result.liquidityUsd || merged.liquidityUsd;
      merged.volume24hUsd = result.volume24hUsd || merged.volume24hUsd;
      merged.priceChange1h = result.priceChange1h || merged.priceChange1h;
      merged.priceChange24h = result.priceChange24h || merged.priceChange24h;
      merged.priceChange7d = result.priceChange7d || merged.priceChange7d;
      merged.transactionCount24h = result.transactionCount24h || merged.transactionCount24h;
    } else {
      // Fill in missing data from other sources
      merged.priceUsd = merged.priceUsd || result.priceUsd;
      merged.marketCapUsd = merged.marketCapUsd || result.marketCapUsd;
      merged.liquidityUsd = merged.liquidityUsd || result.liquidityUsd;
      merged.volume24hUsd = merged.volume24hUsd || result.volume24hUsd;
      merged.priceChange1h = merged.priceChange1h || result.priceChange1h;
      merged.priceChange24h = merged.priceChange24h || result.priceChange24h;
    }
  }

  return merged;
}

/* ----------------------------------------------------------
   MAIN FUNCTION: GET TOKEN DATA
----------------------------------------------------------- */
export async function getTokenData(tokenAddress: string) {
  try {
    // Validate token address
    if (!tokenAddress || tokenAddress.trim().length === 0) {
      throw new Error("Invalid token address");
    }

    // Step 1: Check cache
    const cached = await getCachedToken(tokenAddress);
    if (cached) {
      console.log(`✅ Cache hit for ${tokenAddress}`);
      return cached;
    }

    console.log(`🔍 Fetching data for ${tokenAddress} from APIs...`);

    // Step 2: Fetch from all 3 APIs in parallel with individual error handling
    const [ds, jup, gt] = await Promise.allSettled([
      fetchDexScreener(tokenAddress).catch((err) => {
        console.error(`❌ DexScreener error for ${tokenAddress}:`, err.message);
        return null;
      }),
      fetchJupiter(tokenAddress).catch((err) => {
        console.error(`❌ Jupiter error for ${tokenAddress}:`, err.message);
        return null;
      }),
      fetchGeckoTerminal(tokenAddress).catch((err) => {
        console.error(`❌ GeckoTerminal error for ${tokenAddress}:`, err.message);
        return null;
      }),
    ]);

    // Extract values from settled promises
    const results = [
      ds.status === "fulfilled" ? ds.value : null,
      jup.status === "fulfilled" ? jup.value : null,
      gt.status === "fulfilled" ? gt.value : null,
    ];

    // Step 3: Merge
    const merged = mergeResults(results);

    if (!merged) {
      console.log(`⚠️ No data found for ${tokenAddress}`);
      return null;
    }

    console.log(`✅ Successfully fetched and merged data for ${tokenAddress}`);

    // Step 4: Cache result (TTL 30s)
    await cacheTokenData(tokenAddress, merged);

    return merged;
  } catch (err: any) {
    console.error(`❌ Error in getTokenData for ${tokenAddress}:`, err.message);
    throw err;
  }
}
