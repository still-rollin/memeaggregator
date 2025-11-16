import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import tokenRoutes from "./routes/tokenRoutes";
import { Scheduler } from "./services/scheduler/scheduler";
import { initSocket } from "./sockets/socket";

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server
initSocket(httpServer);

// Start cron-like background jobs
Scheduler.start();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", tokenRoutes);

// Root route - Welcome message
app.get("/", (req, res) => {
  res.json({
    name: "Meme Coin Aggregator API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      singleToken: "/api/token/:address",
      tokenList: "/api/tokens?limit=20&sortBy=volume24hUsd&minVolume=10000",
      search: "/api/tokens/search?q=<query>",
    },
    websocket: "ws://localhost:10000",
    docs: "https://github.com/still-rollin/memeaggregator",
  });
});

// Health route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⚡ WebSocket available at ws://localhost:${PORT}`);
});
