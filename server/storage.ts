import { bots, pingLogs, type Bot, type InsertBot, type UpdateBot, type PingLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getAllBots(): Promise<Bot[]>;
  getBot(id: string): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: string, bot: UpdateBot): Promise<Bot | undefined>;
  deleteBot(id: string): Promise<void>;
  updateBotStatus(id: string, status: string, responseTime?: number): Promise<void>;
  createPingLog(botId: string, status: string, responseTime?: number, errorMessage?: string): Promise<PingLog>;
  getRecentLogs(limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllBots(): Promise<Bot[]> {
    return await db.select().from(bots).orderBy(desc(bots.createdAt));
  }

  async getBot(id: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot || undefined;
  }

  async createBot(insertBot: InsertBot): Promise<Bot> {
    const [bot] = await db
      .insert(bots)
      .values(insertBot)
      .returning();
    return bot;
  }

  async updateBot(id: string, updateData: UpdateBot): Promise<Bot | undefined> {
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(cleanedData).length === 0) {
      return this.getBot(id);
    }
    
    const [bot] = await db
      .update(bots)
      .set(cleanedData)
      .where(eq(bots.id, id))
      .returning();
    return bot || undefined;
  }

  async deleteBot(id: string): Promise<void> {
    await db.delete(bots).where(eq(bots.id, id));
  }

  async updateBotStatus(id: string, status: string, responseTime?: number): Promise<void> {
    await db
      .update(bots)
      .set({
        status,
        lastPing: new Date(),
        responseTime: responseTime || null,
      })
      .where(eq(bots.id, id));
  }

  async createPingLog(
    botId: string,
    status: string,
    responseTime?: number,
    errorMessage?: string
  ): Promise<PingLog> {
    const [log] = await db
      .insert(pingLogs)
      .values({
        botId,
        status,
        responseTime: responseTime || null,
        errorMessage: errorMessage || null,
      })
      .returning();
    return log;
  }

  async getRecentLogs(limit: number = 50): Promise<any[]> {
    const logs = await db
      .select({
        id: pingLogs.id,
        botId: pingLogs.botId,
        status: pingLogs.status,
        responseTime: pingLogs.responseTime,
        errorMessage: pingLogs.errorMessage,
        timestamp: pingLogs.timestamp,
        bot: bots,
      })
      .from(pingLogs)
      .innerJoin(bots, eq(pingLogs.botId, bots.id))
      .orderBy(desc(pingLogs.timestamp))
      .limit(limit);
    
    return logs;
  }
}

export const storage = new DatabaseStorage();
