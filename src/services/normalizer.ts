// src/services/normalizer.ts

export interface NormalizedTokenData {
    tokenAddress: string;
    tokenName?: string | null;
    tokenSymbol?: string | null;
    chain: string;

    priceUsd: number | null;
    priceSol?: number | null;
    marketCapUsd?: number | null;
    liquidityUsd: number | null;
    volume24hUsd: number | null;

    priceChange1h?: number | null;
    priceChange24h?: number | null;
    priceChange7d?: number | null;

    transactionCount24h?: number | null;
    pairAddress?: string | null;
    dexName?: string | null;

    source: string; // "dexscreener" | "jupiter" | "geckoterminal"
    fetchedAt: number;
  }
  
  /* --------------------------------------------------------
     1️⃣ normalizeDexScreener()
     DexScreener returns pairs[]. We take the most liquid pair.
  --------------------------------------------------------- */
  export function normalizeDexScreener(raw: any, tokenAddress: string): NormalizedTokenData | null {
    if (!raw || !raw.pairs || raw.pairs.length === 0) return null;

    const pair = raw.pairs[0]; // DexScreener sorts by liquidity by default
    const baseToken = pair.baseToken || {};

    return {
      tokenAddress,
      tokenName: baseToken.name || null,
      tokenSymbol: baseToken.symbol || null,
      chain: pair.chainId || "unknown",

      priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
      priceSol: pair.priceNative ? Number(pair.priceNative) : null,
      marketCapUsd: pair.marketCap ? Number(pair.marketCap) : null,
      liquidityUsd: pair.liquidity?.usd ? Number(pair.liquidity.usd) : null,
      volume24hUsd: pair.volume?.h24 ? Number(pair.volume.h24) : null,

      priceChange1h: pair.priceChange?.h1 ? Number(pair.priceChange.h1) : null,
      priceChange24h: pair.priceChange?.h24 ? Number(pair.priceChange.h24) : null,
      priceChange7d: pair.priceChange?.h168 ? Number(pair.priceChange.h168) : null,

      transactionCount24h: pair.txns?.h24?.buys && pair.txns?.h24?.sells
        ? Number(pair.txns.h24.buys) + Number(pair.txns.h24.sells)
        : null,

      pairAddress: pair.pairAddress || null,
      dexName: pair.dexId || null,
      source: "dexscreener",

      fetchedAt: Date.now()
    };
  }
  
  /* --------------------------------------------------------
     2️⃣ normalizeJupiter()
     Jupiter only returns price, nothing else.
  --------------------------------------------------------- */
  export function normalizeJupiter(raw: any, tokenMint: string): NormalizedTokenData | null {
    if (!raw) return null;
  
    return {
      tokenAddress: tokenMint,
      chain: "solana",
  
      priceUsd: raw.price ? Number(raw.price) : null,
      liquidityUsd: null,        // Jupiter doesn’t give this
      volume24hUsd: null,        // Jupiter doesn’t give this
  
      pairAddress: null,         // Jupiter is an aggregator, not AMM
      source: "jupiter",
  
      fetchedAt: Date.now()
    };
  }
  
  /* --------------------------------------------------------
     3️⃣ normalizeGeckoTerminal()
     GeckoTerminal gives price, liquidity, volume.
  --------------------------------------------------------- */
  export function normalizeGeckoTerminal(
    raw: any,
    chain: string,
    tokenAddress: string
  ): NormalizedTokenData | null {
    if (!raw || !raw.data || !raw.data.attributes) return null;

    const attr = raw.data.attributes;

    return {
      tokenAddress,
      tokenName: attr.name || null,
      tokenSymbol: attr.symbol || null,
      chain,

      priceUsd: attr.price_usd ? Number(attr.price_usd) : null,
      marketCapUsd: attr.market_cap_usd ? Number(attr.market_cap_usd) : null,
      liquidityUsd: attr.reserve_in_usd ? Number(attr.reserve_in_usd) : null,
      volume24hUsd: attr.volume_usd?.h24 ? Number(attr.volume_usd.h24) : null,

      priceChange1h: attr.price_percent_change?.h1 ? Number(attr.price_percent_change.h1) : null,
      priceChange24h: attr.price_percent_change?.h24 ? Number(attr.price_percent_change.h24) : null,

      pairAddress: null,
      source: "geckoterminal",

      fetchedAt: Date.now()
    };
  }
  