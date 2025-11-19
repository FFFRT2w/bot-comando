var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bots: () => bots,
  insertBotSchema: () => insertBotSchema,
  pingLogs: () => pingLogs,
  updateBotSchema: () => updateBotSchema
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var bots = pgTable("bots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  guildId: text("guild_id"),
  clientId: text("client_id"),
  notes: text("notes"),
  pingInterval: integer("ping_interval").notNull().default(5),
  status: text("status").notNull().default("pending"),
  lastPing: timestamp("last_ping"),
  responseTime: integer("response_time"),
  latency: integer("latency"),
  health: integer("health").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var pingLogs = pgTable("ping_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  botId: varchar("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  responseTime: integer("response_time"),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`)
});
var insertBotSchema = createInsertSchema(bots).omit({
  id: true,
  status: true,
  lastPing: true,
  responseTime: true,
  createdAt: true
}).extend({
  url: z.string().url("URL inv\xE1lida. Use formato: https://seubot.onrender.com/health"),
  name: z.string().min(1, "Nome \xE9 obrigat\xF3rio").max(100, "Nome muito longo"),
  guildId: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  pingInterval: z.number().int().min(1, "Intervalo m\xEDnimo \xE9 1 minuto").max(60, "Intervalo m\xE1ximo \xE9 60 minutos").optional().default(5),
  isActive: z.boolean().optional().default(true)
});
var updateBotSchema = z.object({
  name: z.string().min(1, "Nome \xE9 obrigat\xF3rio").max(100, "Nome muito longo").optional(),
  url: z.string().url("URL inv\xE1lida. Use formato: https://seubot.onrender.com/health").optional(),
  guildId: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  pingInterval: z.number().int().min(1, "Intervalo m\xEDnimo \xE9 1 minuto").max(60, "Intervalo m\xE1ximo \xE9 60 minutos").optional(),
  isActive: z.boolean().optional()
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var DatabaseStorage = class {
  async getAllBots() {
    return await db.select().from(bots).orderBy(desc(bots.createdAt));
  }
  async getBot(id) {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot || void 0;
  }
  async createBot(insertBot) {
    const [bot] = await db.insert(bots).values(insertBot).returning();
    return bot;
  }
  async updateBot(id, updateData) {
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== void 0)
    );
    if (Object.keys(cleanedData).length === 0) {
      return this.getBot(id);
    }
    const [bot] = await db.update(bots).set(cleanedData).where(eq(bots.id, id)).returning();
    return bot || void 0;
  }
  async deleteBot(id) {
    await db.delete(bots).where(eq(bots.id, id));
  }
  async updateBotStatus(id, status, responseTime) {
    await db.update(bots).set({
      status,
      lastPing: /* @__PURE__ */ new Date(),
      responseTime: responseTime || null
    }).where(eq(bots.id, id));
  }
  async createPingLog(botId, status, responseTime, errorMessage) {
    const [log2] = await db.insert(pingLogs).values({
      botId,
      status,
      responseTime: responseTime || null,
      errorMessage: errorMessage || null
    }).returning();
    return log2;
  }
  async getRecentLogs(limit = 50) {
    const logs = await db.select({
      id: pingLogs.id,
      botId: pingLogs.botId,
      status: pingLogs.status,
      responseTime: pingLogs.responseTime,
      errorMessage: pingLogs.errorMessage,
      timestamp: pingLogs.timestamp,
      bot: bots
    }).from(pingLogs).innerJoin(bots, eq(pingLogs.botId, bots.id)).orderBy(desc(pingLogs.timestamp)).limit(limit);
    return logs;
  }
};
var storage = new DatabaseStorage();

// server/ping-service.ts
import axios from "axios";
import cron from "node-cron";
var PingService = class {
  cronJobs = /* @__PURE__ */ new Map();
  isInitialized = false;
  async pingBot(bot) {
    const startTime = Date.now();
    try {
      const response = await axios.get(bot.url, {
        timeout: 3e4,
        validateStatus: (status) => status >= 200 && status < 300
      });
      const responseTime = Date.now() - startTime;
      await storage.updateBotStatus(bot.id, "online", responseTime);
      await storage.createPingLog(bot.id, "online", responseTime);
      console.log(`\u2713 Ping successful: ${bot.name} (${responseTime}ms)`);
      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error.message || "Unknown error";
      await storage.updateBotStatus(bot.id, "offline");
      await storage.createPingLog(bot.id, "offline", responseTime, errorMessage);
      console.log(`\u2717 Ping failed: ${bot.name} - ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
  async pingAllBots() {
    try {
      const bots2 = await storage.getAllBots();
      const activeBots = bots2.filter((bot) => bot.isActive);
      if (activeBots.length === 0) {
        console.log("No active bots to ping");
        return;
      }
      console.log(`
\u{1F504} Starting ping cycle for ${activeBots.length} bot(s)...`);
      const promises = activeBots.map((bot) => this.pingBot(bot));
      await Promise.all(promises);
      console.log("\u2705 Ping cycle completed\n");
    } catch (error) {
      console.error("Error during ping cycle:", error);
    }
  }
  scheduleBotPing(bot) {
    if (this.cronJobs.has(bot.id)) {
      this.cronJobs.get(bot.id)?.stop();
      this.cronJobs.delete(bot.id);
    }
    if (!bot.isActive) {
      return;
    }
    const cronExpression = `*/${bot.pingInterval} * * * *`;
    const task = cron.schedule(cronExpression, async () => {
      await this.pingBot(bot);
    });
    this.cronJobs.set(bot.id, task);
    console.log(`\u{1F4C5} Scheduled ping for ${bot.name} every ${bot.pingInterval} minute(s)`);
  }
  async initializeScheduler() {
    if (this.isInitialized) {
      console.log("Ping scheduler already initialized");
      return;
    }
    try {
      const bots2 = await storage.getAllBots();
      const activeBots = bots2.filter((bot) => bot.isActive);
      console.log("\n\u{1F680} Initializing ping scheduler...");
      console.log(`Found ${activeBots.length} active bot(s)`);
      for (const bot of activeBots) {
        this.scheduleBotPing(bot);
      }
      this.isInitialized = true;
      console.log("\u2705 Ping scheduler initialized successfully\n");
    } catch (error) {
      console.error("Error initializing ping scheduler:", error);
      throw error;
    }
  }
  removeBotSchedule(botId) {
    const task = this.cronJobs.get(botId);
    if (task) {
      task.stop();
      this.cronJobs.delete(botId);
      console.log(`\u{1F5D1}\uFE0F  Removed ping schedule for bot ${botId}`);
    }
  }
  async refreshScheduler() {
    console.log("\n\u{1F504} Refreshing ping scheduler...");
    for (const [botId, task] of this.cronJobs) {
      task.stop();
      this.cronJobs.delete(botId);
    }
    this.isInitialized = false;
    await this.initializeScheduler();
  }
};
var pingService = new PingService();

// server/routes.ts
import { eq as eq2 } from "drizzle-orm";
async function registerRoutes(app2) {
  app2.get("/health", async (req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.get("/api/bots", async (req, res) => {
    try {
      const bots2 = await storage.getAllBots();
      res.json(bots2);
    } catch (error) {
      console.error("Error fetching bots:", error);
      res.status(500).json({ error: "Failed to fetch bots" });
    }
  });
  app2.get("/api/bots/:id", async (req, res) => {
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
  app2.post("/api/bots", async (req, res) => {
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
    } catch (error) {
      console.error("Error creating bot:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bot" });
    }
  });
  app2.put("/api/bots/:id", async (req, res) => {
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
    } catch (error) {
      console.error("Error updating bot:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update bot" });
    }
  });
  app2.delete("/api/bots/:id", async (req, res) => {
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
  app2.get("/api/stats", async (req, res) => {
    try {
      const bots2 = await storage.getAllBots();
      const totalBots = bots2.length;
      const onlineBots = bots2.filter((bot) => bot.status === "online").length;
      const offlineBots = bots2.filter((bot) => bot.status === "offline").length;
      const responseTimes = bots2.filter((bot) => bot.responseTime !== null && bot.responseTime !== void 0).map((bot) => bot.responseTime);
      const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
      res.json({
        totalBots,
        onlineBots,
        offlineBots,
        avgResponseTime
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  app2.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const logs = await storage.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });
  app2.post("/api/bots/search", async (req, res) => {
    try {
      const { nome, url, clientId } = req.body;
      let result;
      if (nome) {
        result = await db.select().from(bots).where(eq2(bots.name, nome)).limit(1);
      } else if (url) {
        result = await db.select().from(bots).where(eq2(bots.url, url)).limit(1);
      } else if (clientId) {
        result = await db.select().from(bots).where(eq2(bots.clientId, clientId)).limit(1);
      }
      if (!result || !result.length) {
        return res.status(404).json({ error: "Bot n\xE3o encontrado" });
      }
      res.json(result[0]);
    } catch (error) {
      console.error("Erro ao buscar bot:", error);
      res.status(500).json({ error: "Erro ao buscar bot" });
    }
  });
  app2.post("/api/bots/:botId/ping", async (req, res) => {
    try {
      const { botId } = req.params;
      const bot = await db.select().from(bots).where(eq2(bots.id, botId)).limit(1);
      if (!bot.length) {
        return res.status(404).json({ error: "Bot n\xE3o encontrado" });
      }
      const startTime = Date.now();
      try {
        const response = await fetch(bot[0].url, { method: "GET", timeout: 5e3 });
        const latency = Date.now() - startTime;
        let health = response.ok ? latency > 2e3 ? 70 : 100 : 30;
        await db.update(bots).set({
          health,
          lastPing: /* @__PURE__ */ new Date(),
          responseTime: latency,
          latency
        }).where(eq2(bots.id, botId));
        res.json({ health, latency, status: response.ok ? "online" : "error" });
      } catch {
        await db.update(bots).set({
          health: 0,
          lastPing: /* @__PURE__ */ new Date()
        }).where(eq2(bots.id, botId));
        res.json({ health: 0, latency: 0, status: "offline" });
      }
    } catch (error) {
      console.error("Erro ao fazer ping:", error);
      res.status(500).json({ error: "Erro ao fazer ping" });
    }
  });
  const httpServer = createServer(app2);
  pingService.initializeScheduler().catch((error) => {
    console.error("Failed to initialize ping scheduler:", error);
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/discord-bot.ts
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN n\xE3o definido nas vari\xE1veis de ambiente");
}
var client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});
client.on("ready", () => {
  console.log(`\u2705 Bot conectado como ${client.user?.tag}`);
  client.user?.setActivity("bots saud\xE1veis \u{1F7E2}", { type: "WATCHING" });
  registerCommands();
});
async function registerCommands() {
  try {
    const commands = [
      new SlashCommandBuilder().setName("pinger").setDescription("Verificar sa\xFAde dos bots").setDefaultMemberPermissions(8)
      // Apenas admins
    ];
    await client.application?.commands.set(commands);
    console.log("\u2705 Slash commands registrados");
  } catch (error) {
    console.error("\u274C Erro ao registrar comandos:", error);
  }
}
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isCommand()) {
      if (interaction.commandName === "pinger") {
        if (!interaction.member?.permissions.has("ADMINISTRATOR")) {
          await interaction.reply({
            content: "\u274C Apenas administradores podem usar este comando!",
            ephemeral: true
          });
          return;
        }
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("abrir_modal_verificacao").setLabel("\u2705 Verificar Sa\xFAde do Meu Bot").setStyle(ButtonStyle.Success)
        );
        const embed = new EmbedBuilder().setColor("#00AA00").setTitle("\u{1F50D} Verificador de Sa\xFAde de Bots").setDescription("Clique no bot\xE3o abaixo para verificar a sa\xFAde do seu bot!").setFooter({ text: `Requisitado por ${interaction.user.username}` }).setTimestamp();
        await interaction.reply({ embeds: [embed], components: [row] });
      }
    }
    if (interaction.isButton()) {
      if (interaction.customId === "abrir_modal_verificacao") {
        const modal = new ModalBuilder().setCustomId("modal_busca_bot").setTitle("\u{1F50D} Buscar Bot");
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("input_nome").setLabel("Nome do Bot (opcional)").setStyle(TextInputStyle.Short).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("input_url").setLabel("URL do Bot (opcional)").setStyle(TextInputStyle.Short).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("input_client_id").setLabel("Client ID do Bot (opcional)").setStyle(TextInputStyle.Short).setRequired(false)
          )
        );
        await interaction.showModal(modal);
      }
      if (interaction.customId.startsWith("atualizar_saude_")) {
        await interaction.deferReply({ ephemeral: true });
        const botId = interaction.customId.replace("atualizar_saude_", "");
        const novoStatus = await atualizarSaudeBot(botId);
        const embed = new EmbedBuilder().setColor("#00AA00").setTitle("\u2705 Bot Atualizado com Sucesso!").addFields(
          { name: "Nova Sa\xFAde", value: `${novoStatus.health}%`, inline: true },
          { name: "Status", value: "\u{1F7E2} Online", inline: true },
          { name: "Lat\xEAncia", value: `${novoStatus.latency}ms`, inline: true }
        ).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      }
    }
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "modal_busca_bot") {
        await interaction.deferReply({ ephemeral: true });
        const nome = interaction.fields.getTextInputValue("input_nome");
        const url = interaction.fields.getTextInputValue("input_url");
        const clientId = interaction.fields.getTextInputValue("input_client_id");
        if (!nome && !url && !clientId) {
          await interaction.editReply({
            content: "\u274C Preencha pelo menos um campo!"
          });
          return;
        }
        const bot = await buscarBot({
          nome: nome || void 0,
          url: url || void 0,
          clientId: clientId || void 0
        });
        if (!bot) {
          await interaction.editReply({
            content: "\u274C Bot n\xE3o encontrado. Verifique os dados e tente novamente."
          });
          return;
        }
        const cor = bot.health >= 50 ? "#00AA00" : "#FF5500";
        const statusEmbed = new EmbedBuilder().setColor(cor).setTitle(`\u{1F4CA} Sa\xFAde do Bot: ${bot.nome}`).addFields(
          {
            name: "Sa\xFAde",
            value: `${bot.health}%`,
            inline: true
          },
          {
            name: "Status",
            value: bot.health >= 50 ? "\u{1F7E2} Saud\xE1vel" : "\u{1F534} Cr\xEDtico",
            inline: true
          },
          {
            name: "Lat\xEAncia",
            value: `${bot.latency}ms`,
            inline: true
          },
          {
            name: "URL",
            value: bot.url,
            inline: false
          },
          {
            name: "Client ID",
            value: bot.clientId,
            inline: false
          },
          {
            name: "\xDAltimo Ping",
            value: new Date(bot.lastPing).toLocaleString("pt-BR"),
            inline: false
          }
        ).setTimestamp();
        const row = new ActionRowBuilder();
        if (bot.health < 50) {
          row.addComponents(
            new ButtonBuilder().setCustomId(`atualizar_saude_${bot.id}`).setLabel("\u{1F504} Atualizar Sa\xFAde").setStyle(ButtonStyle.Danger)
          );
        }
        await interaction.editReply({
          embeds: [statusEmbed],
          components: row.components.length > 0 ? [row] : []
        });
      }
    }
  } catch (error) {
    console.error("\u274C Erro na intera\xE7\xE3o:", error);
    if (!interaction.replied) {
      await interaction.reply({
        content: "\u274C Ocorreu um erro!",
        ephemeral: true
      }).catch(() => {
      });
    }
  }
});
async function buscarBot(filtros) {
  try {
    const response = await fetch("http://localhost:3000/api/bots/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filtros)
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("\u274C Erro ao buscar bot:", error);
    return null;
  }
}
async function atualizarSaudeBot(botId) {
  try {
    const response = await fetch(`http://localhost:3000/api/bots/${botId}/ping`, {
      method: "POST"
    });
    if (!response.ok) {
      return { health: 0, latency: 0 };
    }
    return await response.json();
  } catch (error) {
    console.error("\u274C Erro ao atualizar sa\xFAde:", error);
    return { health: 0, latency: 0 };
  }
}
client.login(process.env.BOT_TOKEN);

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  if (!process.env.BOT_TOKEN) {
    log("\u26A0\uFE0F  WARNING: BOT_TOKEN environment variable is not set!");
  } else {
    log("\u2705 BOT_TOKEN is configured");
  }
  const httpServer = await registerRoutes(app);
  const PORT = process.env.PORT || 5e3;
  httpServer.listen(PORT, () => {
    console.log(`\u2705 Servidor rodando na porta ${PORT}`);
  });
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }
})();
