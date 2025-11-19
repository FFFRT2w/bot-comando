import axios from "axios";
import cron from "node-cron";
import { storage } from "./storage";
import type { Bot } from "@shared/schema";

class PingService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  async pingBot(bot: Bot): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(bot.url, {
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      
      const responseTime = Date.now() - startTime;
      
      await storage.updateBotStatus(bot.id, "online", responseTime);
      await storage.createPingLog(bot.id, "online", responseTime);
      
      console.log(`✓ Ping successful: ${bot.name} (${responseTime}ms)`);
      
      return { success: true, responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error.message || "Unknown error";
      
      await storage.updateBotStatus(bot.id, "offline");
      await storage.createPingLog(bot.id, "offline", responseTime, errorMessage);
      
      console.log(`✗ Ping failed: ${bot.name} - ${errorMessage}`);
      
      return { success: false, error: errorMessage };
    }
  }

  async pingAllBots(): Promise<void> {
    try {
      const bots = await storage.getAllBots();
      const activeBots = bots.filter((bot) => bot.isActive);
      
      if (activeBots.length === 0) {
        console.log("No active bots to ping");
        return;
      }
      
      console.log(`\n🔄 Starting ping cycle for ${activeBots.length} bot(s)...`);
      
      const promises = activeBots.map((bot) => this.pingBot(bot));
      await Promise.all(promises);
      
      console.log("✅ Ping cycle completed\n");
    } catch (error) {
      console.error("Error during ping cycle:", error);
    }
  }

  scheduleBotPing(bot: Bot): void {
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
    console.log(`📅 Scheduled ping for ${bot.name} every ${bot.pingInterval} minute(s)`);
  }

  async initializeScheduler(): Promise<void> {
    if (this.isInitialized) {
      console.log("Ping scheduler already initialized");
      return;
    }

    try {
      const bots = await storage.getAllBots();
      const activeBots = bots.filter((bot) => bot.isActive);
      
      console.log("\n🚀 Initializing ping scheduler...");
      console.log(`Found ${activeBots.length} active bot(s)`);
      
      for (const bot of activeBots) {
        this.scheduleBotPing(bot);
      }
      
      this.isInitialized = true;
      console.log("✅ Ping scheduler initialized successfully\n");
    } catch (error) {
      console.error("Error initializing ping scheduler:", error);
      throw error;
    }
  }

  removeBotSchedule(botId: string): void {
    const task = this.cronJobs.get(botId);
    if (task) {
      task.stop();
      this.cronJobs.delete(botId);
      console.log(`🗑️  Removed ping schedule for bot ${botId}`);
    }
  }

  async refreshScheduler(): Promise<void> {
    console.log("\n🔄 Refreshing ping scheduler...");
    
    for (const [botId, task] of this.cronJobs) {
      task.stop();
      this.cronJobs.delete(botId);
    }
    
    this.isInitialized = false;
    await this.initializeScheduler();
  }
}

export const pingService = new PingService();
