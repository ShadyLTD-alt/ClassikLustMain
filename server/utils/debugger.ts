// Game Debugger Module
// This will be expanded later for comprehensive debugging functionality

import { storage } from "../storage";
import { syncAllGameData } from "./dataLoader";

interface DebugCommand {
  name: string;
  description: string;
  execute: (args: string[]) => Promise<any>;
}

class GameDebugger {
  private commands: Map<string, DebugCommand> = new Map();
  private isEnabled: boolean = false;

  constructor() {
    this.initializeCommands();
  }

  private initializeCommands() {
    // System commands
    this.addCommand({
      name: 'help',
      description: 'Show available debug commands',
      execute: async () => {
        const commands = Array.from(this.commands.values());
        return commands.map(cmd => `${cmd.name}: ${cmd.description}`).join('\n');
      }
    });

    this.addCommand({
      name: 'sync',
      description: 'Sync all game data from JSON files',
      execute: async () => {
        await syncAllGameData();
        return 'Game data synchronized successfully';
      }
    });

    this.addCommand({
      name: 'status',
      description: 'Show server status',
      execute: async () => {
        return {
          timestamp: new Date().toISOString(),
          debugger: this.isEnabled ? 'enabled' : 'disabled',
          environment: process.env.NODE_ENV || 'development'
        };
      }
    });

    // Player commands (for development)
    this.addCommand({
      name: 'player',
      description: 'Get player info by telegram ID (usage: player <telegramId>)',
      execute: async (args) => {
        if (args.length === 0) {
          throw new Error('Please provide a telegram ID');
        }
        const telegramId = args[0];
        const player = await storage.getPlayerByTelegramId(telegramId);
        return player || 'Player not found';
      }
    });

    // Database commands
    this.addCommand({
      name: 'db-stats',
      description: 'Show database statistics',
      execute: async () => {
        // This would need to be implemented in storage.ts
        // For now, return placeholder
        return {
          message: 'Database statistics not implemented yet',
          suggestion: 'Add getStats() method to storage class'
        };
      }
    });
  }

  addCommand(command: DebugCommand) {
    this.commands.set(command.name.toLowerCase(), command);
  }

  async executeCommand(commandLine: string): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('Debugger is not enabled');
    }

    const parts = commandLine.trim().split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Unknown command: ${commandName}. Type 'help' for available commands.`);
    }

    try {
      return await command.execute(args);
    } catch (error) {
      throw new Error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  enable() {
    this.isEnabled = true;
    console.log('🐛 Game debugger enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('🐛 Game debugger disabled');
  }

  isDebuggerEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const gameDebugger = new GameDebugger();

// Enable debugger in development mode
if (process.env.NODE_ENV !== 'production') {
  gameDebugger.enable();
}

// Debug route helper
export function createDebugRoutes(app: any) {
  // Only in development
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  app.post('/api/debug', async (req: any, res: any) => {
    try {
      const { command } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      const result = await gameDebugger.executeCommand(command);
      res.json({ success: true, result });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get('/api/debug/status', (_req: any, res: any) => {
    res.json({
      enabled: gameDebugger.isDebuggerEnabled(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  console.log('🐛 Debug routes registered (development mode)');
}