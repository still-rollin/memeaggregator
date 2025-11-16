// src/sockets/socket.ts

import { Server } from "socket.io";
import { redis } from "../utils/redisClient";

interface LiveUpdate {
  tokenAddress: string;
  priceUsd: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  updatedAt: number;
}

let io: Server | null = null;

// Store last sent values to detect changes
const lastValues: Record<string, LiveUpdate> = {};

/* --------------------------------------------------
   INITIALIZE SOCKET.IO
--------------------------------------------------- */
export function initSocket(httpServer: any) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  console.log("⚡ WebSocket server running");

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  startRedisWatcher();
}

/* --------------------------------------------------
   WATCHER: POLLS REDIS EVERY 2 SECONDS
   Detects price + volume updates and pushes to clients
--------------------------------------------------- */
async function startRedisWatcher() {
  console.log("👀 Starting live update watcher...");

  setInterval(async () => {
    const keys = await redis.keys("token:*");

    for (const key of keys) {
      // Skip the token:list key
      if (key === "token:list") continue;

      const raw = await redis.get(key);
      if (!raw) continue;

      const token = JSON.parse(raw);

      // Handle both DexScreener format and normalized format
      const tokenAddress = token.baseToken?.address || token.tokenAddress || key.replace("token:", "");
      const priceUsd = parseFloat(token.priceUsd) || 0;
      const volume24hUsd = token.volume?.h24 || token.volume24hUsd || 0;
      const liquidityUsd = token.liquidity?.usd || token.liquidityUsd || 0;

      const payload: LiveUpdate = {
        tokenAddress: tokenAddress,
        priceUsd: priceUsd,
        volume24hUsd: volume24hUsd,
        liquidityUsd: liquidityUsd,
        updatedAt: Date.now(),
      };

      const prev = lastValues[tokenAddress];

      if (!prev) {
        // First time seeing this token → store and broadcast
        lastValues[tokenAddress] = payload;
        broadcastUpdate(payload);
        console.log(`📊 Broadcasting new token: ${tokenAddress.slice(0, 8)}...`);
        continue;
      }

      // Significant price or volume change?
      const priceChanged =
        Math.abs((payload.priceUsd || 0) - (prev.priceUsd || 0)) > 0.000001;

      const volumeChanged =
        Math.abs((payload.volume24hUsd || 0) - (prev.volume24hUsd || 0)) > 5;

      if (priceChanged || volumeChanged) {
        lastValues[tokenAddress] = payload;
        broadcastUpdate(payload);
        console.log(`📊 Broadcasting update: ${tokenAddress.slice(0, 8)}...`);
      }
    }
  }, 2000); // every 2 seconds
}


function broadcastUpdate(update: LiveUpdate) {
  if (!io) return;
  io.emit("token_update", update);
}
