import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bots = pgTable("bots", {
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
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const pingLogs = pgTable("ping_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  botId: varchar("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  responseTime: integer("response_time"),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const insertBotSchema = createInsertSchema(bots).omit({
  id: true,
  status: true,
  lastPing: true,
  responseTime: true,
  createdAt: true,
}).extend({
  url: z.string().url("URL inválida. Use formato: https://seubot.onrender.com/health"),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  guildId: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  pingInterval: z.number().int().min(1, "Intervalo mínimo é 1 minuto").max(60, "Intervalo máximo é 60 minutos").optional().default(5),
  isActive: z.boolean().optional().default(true),
});

export const updateBotSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo").optional(),
  url: z.string().url("URL inválida. Use formato: https://seubot.onrender.com/health").optional(),
  guildId: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  pingInterval: z.number().int().min(1, "Intervalo mínimo é 1 minuto").max(60, "Intervalo máximo é 60 minutos").optional(),
  isActive: z.boolean().optional(),
});

export type InsertBot = z.infer<typeof insertBotSchema>;
export type UpdateBot = z.infer<typeof updateBotSchema>;
export type Bot = typeof bots.$inferSelect;
export type PingLog = typeof pingLogs.$inferSelect;
