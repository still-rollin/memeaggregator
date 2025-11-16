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
      const raw = await redis.get(key);
      if (!raw) continue;

      const token = JSON.parse(raw);

      const payload: LiveUpdate = {
        tokenAddress: token.tokenAddress,
        priceUsd: token.priceUsd,
        volume24hUsd: token.volume24hUsd,
        liquidityUsd: token.liquidityUsd,
        updatedAt: Date.now(),
      };

      const prev = lastValues[token.tokenAddress];

      if (!prev) {
        // First time seeing this token → store and broadcast
        lastValues[token.tokenAddress] = payload;
        broadcastUpdate(payload);
        continue;
      }

      // Significant price or volume change?
      const priceChanged =
        Math.abs((payload.priceUsd || 0) - (prev.priceUsd || 0)) > 0.000001;

      const volumeChanged =
        Math.abs((payload.volume24hUsd || 0) - (prev.volume24hUsd || 0)) > 5;

      if (priceChanged || volumeChanged) {
        lastValues[token.tokenAddress] = payload;
        broadcastUpdate(payload);
      }
    }
  }, 2000); // every 2 seconds
}

/* --------------------------------------------------
   BROADCAST TO ALL CONNECTED CLIENTS
--------------------------------------------------- */
function broadcastUpdate(update: LiveUpdate) {
  if (!io) return;
  io.emit("token_update", update);
}
