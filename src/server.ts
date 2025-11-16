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
