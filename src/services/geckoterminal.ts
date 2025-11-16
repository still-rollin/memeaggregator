import axios from "axios";

export async function getGeckoTerminalData(chain: string, tokenAddress: string) {
    const url = `https://api.geckoterminal.com/api/v2/networks/${chain}/tokens/${tokenAddress}`;

    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err: any) {
        console.error("GeckoTerminal API Error:", err.message);
        return null;
    }
}

export async function fetchGeckoPrice(tokenMint: string) {
    const chains = ["solana", "ethereum", "base"];

    for (const chain of chains) {
        try {
            const data = await getGeckoTerminalData(chain, tokenMint);
            if (data?.data?.attributes?.price_usd) {
                return parseFloat(data.data.attributes.price_usd);
            }
        } catch {
            continue;
        }
    }

    return null;
}
