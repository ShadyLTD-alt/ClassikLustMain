import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

// 🔧 UTILITY: Port management for development
export class PortManager {
  static async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      
      server.listen(port);
    });
  }
  
  static async findAvailablePort(startPort: number = 5000, endPort: number = 5020): Promise<number> {
    for (let port = startPort; port <= endPort; port++) {
      const inUse = await this.isPortInUse(port);
      if (!inUse) {
        return port;
      }
    }
    throw new Error(`No available ports found in range ${startPort}-${endPort}`);
  }
  
  static async killProcessOnPort(port: number): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        // Windows
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.split('\n').filter(line => line.includes(`LISTENING`));
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(parseInt(pid))) {
            await execAsync(`taskkill /PID ${pid} /F`);
            console.log(`☠️ Killed process ${pid} on port ${port}`);
            return true;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not kill process on port ${port} (Windows):`, error);
      }
    } else {
      try {
        // Unix-like (Linux, macOS)
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        for (const pid of pids) {
          if (pid && !isNaN(parseInt(pid))) {
            await execAsync(`kill -9 ${pid}`);
            console.log(`☠️ Killed process ${pid} on port ${port}`);
            return true;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not kill process on port ${port} (Unix):`, error);
      }
    }
    return false;
  }
  
  static async resolvePortConflict(preferredPort: number): Promise<number> {
    const isInUse = await this.isPortInUse(preferredPort);
    
    if (!isInUse) {
      return preferredPort;
    }
    
    console.log(`⚠️ Port ${preferredPort} is in use`);
    
    // In development, try to kill the process
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Attempting to free port ${preferredPort}...`);
      const killed = await this.killProcessOnPort(preferredPort);
      
      if (killed) {
        // Wait a moment for port to be freed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const nowFree = !(await this.isPortInUse(preferredPort));
        if (nowFree) {
          console.log(`✅ Port ${preferredPort} freed successfully`);
          return preferredPort;
        }
      }
    }
    
    // Find alternative port
    console.log(`🔍 Searching for alternative port...`);
    return await this.findAvailablePort(preferredPort + 1);
  }
}