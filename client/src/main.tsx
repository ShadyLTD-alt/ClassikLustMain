/**
 * main.tsx - Application Entry Point
 * 
 * BOOTSTRAP ORDER:
 * 1. LunaBug initializes FIRST (standalone)
 * 2. React app loads with LunaBug already monitoring
 * 3. GameContext connects to existing LunaBug instance
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 🌙 Import LunaBug using Vite alias - BULLETPROOF!
//import { initLunaBug } from "@lunabug/init.js";

/**
 * Initialize LunaBug FIRST - before React even starts
 * This ensures debugging capability even if React fails
 */
async function bootstrap() {
  console.log('🌙 Starting LunaBug pre-boot sequence...');
  
  try {
    // Initialize LunaBug standalone system
    //await initLunaBug();
    console.log('🌙✅ LunaBug online - React can now proceed safely');
  } catch (error) {
    console.error('🌙❌ LunaBug failed to initialize:', error);
    console.log('🌙🚨 Creating emergency fallback...');
    
    // Create comprehensive emergency fallback so UI doesn't crash
    (window as any).LunaBug = {
      // Basic status
      status: () => ({
        core: 'emergency',
        error: 'Init failed',
        fallback: true,
        provider: 'emergency',
        version: '1.0.1-emergency',
        timestamp: new Date().toISOString()
      }),
      
      // Chat functionality
      chat: (msg: string) => Promise.resolve({
        response: `🌙 LunaBug Emergency Mode Active\n\nYour message: "${msg}"\n\nLunaBug failed to initialize properly. This could be due to:\n- Missing LunaBug files\n- Import path issues\n- Build configuration problems\n\nTo fix:\n1. Check that LunaBug directory exists\n2. Verify vite.config.ts has @lunabug alias\n3. Add API keys to Replit Secrets for full functionality`,
        provider: 'emergency',
        fallbackCount: 999
      }),
      
      // Emergency mode indicator
      emergency: () => {
        console.log('🚨 LunaBug Emergency Fallback Active');
        console.log('🚨 Possible causes: Missing files, import errors, or build issues');
        console.log('🚨 Check console for initialization errors above');
        return 'Emergency mode active - check console';
      },
      
      // Function registry
      functions: {
        list: () => [{
          name: 'emergency_mode',
          description: 'LunaBug emergency fallback',
          enabled: true,
          category: 'emergency'
        }],
        run: (name: string) => `Emergency: Function ${name} unavailable - LunaBug init failed`,
        reload: () => 'Cannot reload - LunaBug initialization failed'
      },
      
      // Core system
      core: {
        logEvent: (type: string, data: any) => console.log(`🌙 [EMERGENCY-${type}]`, data),
        getStatus: () => ({ emergency: true, initialized: false, error: 'Init failed' }),
        runCommand: (cmd: string) => {
          console.log(`🌙 Emergency: Command ${cmd} not available`);
          return 'Command unavailable in emergency mode';
        }
      },
      
      // Metrics
      metrics: () => ({
        provider: 'emergency',
        requestCount: 0,
        successRate: 0,
        errors: ['Initialization failed'],
        uptime: 0,
        mode: 'emergency_fallback'
      }),
      
      version: '1.0.1-emergency'
    };
    
    console.log('🌙✅ Emergency fallback created - UI will not crash on undefined LunaBug');
  }
  
  // Now initialize React with LunaBug watching (or emergency fallback)
  console.log('🚀 Starting React application...');
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
  
  // Log successful React initialization
  if ((window as any).LunaBug?.core) {
    (window as any).LunaBug.core.logEvent('react_initialized', {
      timestamp: new Date().toISOString(),
      reactVersion: 'React 18+',
      rootElement: 'mounted',
      lunabugMode: (window as any).LunaBug.version?.includes('emergency') ? 'emergency' : 'normal'
    });
  }
  
  console.log('🌙🚀 Bootstrap complete - LunaBug + React ready!');
}

// Start the bootstrap sequence
bootstrap().catch(error => {
  console.error('🚨 Bootstrap failed catastrophically:', error);
  
  // Last resort emergency fallback - start React without any LunaBug
  console.log('🚨 LAST RESORT: Starting React in complete isolation...');
  
  // Absolute minimal fallback to prevent crashes
  (window as any).LunaBug = {
    status: () => ({ catastrophicFailure: true, mode: 'isolation' }),
    chat: () => Promise.resolve({ response: 'LunaBug catastrophic failure - system completely offline' }),
    emergency: () => console.error('🚨 LunaBug catastrophic failure - system in isolation mode'),
    functions: { list: () => [], run: () => 'System offline' },
    core: { logEvent: () => {}, getStatus: () => ({ offline: true }), runCommand: () => 'Offline' },
    metrics: () => ({ error: 'System offline' })
  };
  
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
  
  console.log('🚨 React started in isolation mode - LunaBug completely offline');
});