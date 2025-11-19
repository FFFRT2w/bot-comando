import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pingService } from "./ping-service";
import { insertBotSchema, updateBotSchema } from "@shared/schema";
import { db } from "./db";
import { bots } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/health", async (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/bots", async (req, res) => {
    try {
      const bots = await storage.getAllBots();
      res.json(bots);
    } catch (error) {
      console.error("Error fetching bots:", error);
      res.status(500).json({ error: "Failed to fetch bots" });
    }
  });

  app.get("/api/bots/:id", async (req, res) => {
    try {
      const bot = await storage.getBot(req.params.id);
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }
      res.json(bot);
    } catch (error) {
      console.error("Error fetching bot:", error);
      res.status(500).json({ error: "Failed to fetch bot" });
    }
  });

  app.post("/api/bots", async (req, res) => {
    try {
      const validatedData = insertBotSchema.parse(req.body);
      const bot = await storage.createBot(validatedData);
      
      pingService.scheduleBotPing(bot);
      
      if (bot.isActive) {
        pingService.pingBot(bot).catch((error) => {
          console.error(`Initial ping failed for bot ${bot.id}:`, error);
        });
      }
      
      res.status(201).json(bot);
    } catch (error: any) {
      console.error("Error creating bot:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bot" });
    }
  });

  app.put("/api/bots/:id", async (req, res) => {
    try {
      const validatedData = updateBotSchema.parse(req.body);
      const bot = await storage.updateBot(req.params.id, validatedData);
      
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }
      
      pingService.scheduleBotPing(bot);
      
      if (bot.isActive) {
        pingService.pingBot(bot).catch((error) => {
          console.error(`Update ping failed for bot ${bot.id}:`, error);
        });
      }
      
      res.json(bot);
    } catch (error: any) {
      console.error("Error updating bot:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update bot" });
    }
  });

  app.delete("/api/bots/:id", async (req, res) => {
    try {
      const bot = await storage.getBot(req.params.id);
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }
      
      pingService.removeBotSchedule(req.params.id);
      await storage.deleteBot(req.params.id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting bot:", error);
      res.status(500).json({ error: "Failed to delete bot" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const bots = await storage.getAllBots();
      
      const totalBots = bots.length;
      const onlineBots = bots.filter((bot) => bot.status === "online").length;
      const offlineBots = bots.filter((bot) => bot.status === "offline").length;
      
      const responseTimes = bots
        .filter((bot) => bot.responseTime !== null && bot.responseTime !== undefined)
        .map((bot) => bot.responseTime as number);
      
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
      
      res.json({
        totalBots,
        onlineBots,
        offlineBots,
        avgResponseTime,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // ✅ Buscar bot por nome, URL ou Client ID (para Discord Bot)
  app.post("/api/bots/search", async (req, res) => {
    try {
      const { nome, url, clientId } = req.body;

      let result;
      if (nome) {
        result = await db.select().from(bots).where(eq(bots.name, nome)).limit(1);
      } else if (url) {
        result = await db.select().from(bots).where(eq(bots.url, url)).limit(1);
      } else if (clientId) {
        result = await db.select().from(bots).where(eq(bots.clientId, clientId)).limit(1);
      }

      if (!result || !result.length) {
        return res.status(404).json({ error: "Bot não encontrado" });
      }

      res.json(result[0]);
    } catch (error) {
      console.error("Erro ao buscar bot:", error);
      res.status(500).json({ error: "Erro ao buscar bot" });
    }
  });

  // ✅ Fazer ping no bot e atualizar saúde (para Discord Bot)
  app.post("/api/bots/:botId/ping", async (req, res) => {
    try {
      const { botId } = req.params;
      const bot = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);

      if (!bot.length) {
        return res.status(404).json({ error: "Bot não encontrado" });
      }

      const startTime = Date.now();
      try {
        const response = await fetch(bot[0].url, { method: "GET", timeout: 5000 });
        const latency = Date.now() - startTime;
        let health = response.ok ? (latency > 2000 ? 70 : 100) : 30;

        await db.update(bots).set({
          health,
          lastPing: new Date(),
          responseTime: latency,
          latency,
        }).where(eq(bots.id, botId));

        res.json({ health, latency, status: response.ok ? "online" : "error" });
      } catch {
        await db.update(bots).set({
          health: 0,
          lastPing: new Date(),
        }).where(eq(bots.id, botId));

        res.json({ health: 0, latency: 0, status: "offline" });
      }
    } catch (error) {
      console.error("Erro ao fazer ping:", error);
      res.status(500).json({ error: "Erro ao fazer ping" });
    }
  });

  const httpServer = createServer(app);

  pingService.initializeScheduler().catch((error) => {
    console.error("Failed to initialize ping scheduler:", error);
  });

  return httpServer;
}
