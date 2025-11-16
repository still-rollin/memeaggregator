import axios from "axios";

export async function getJupiterPrice(tokenMint: string) {
    const url = `https://price.jup.ag/v4/price?ids=${tokenMint}`;

    try {
        const response = await axios.get(url);
        return response.data.data[tokenMint];
    } catch (err: any) {
        console.error("Jupiter API Error:", err.message);
        return null;
    }
}

export async function fetchJupiterPrice(tokenMint: string) {
    const priceData = await getJupiterPrice(tokenMint);
    return priceData?.price || null;
}

export async function fetchTopDexPairs() {
    const url = "https://api.dexscreener.com/latest/dex/search/?q=solana";

    try {
        const response = await axios.get(url);
        const pairs = response.data.pairs || [];

        // Return top 50 pairs sorted by liquidity
        return pairs
            .filter((pair: any) => pair.liquidity?.usd)
            .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))
            .slice(0, 50);
    } catch (err: any) {
        console.error("DexScreener API Error:", err.message);
        return [];
    }
}
