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

// Import LunaBug bootstrap - USE ABSOLUTE PATH FROM PROJECT ROOT
import { initLunaBug } from "/LunaBug/init.js";

/**
 * Initialize LunaBug FIRST - before React even starts
 * This ensures debugging capability even if React fails
 */
async function bootstrap() {
  console.log('🌙 Starting LunaBug pre-boot sequence...');
  
  try {
    // Initialize LunaBug standalone system
    await initLunaBug();
    console.log('🌙✅ LunaBug online - React can now proceed safely');
  } catch (error) {
    console.error('🌙❌ LunaBug failed to initialize:', error);
    console.log('🌙🚨 Creating emergency fallback...');
    
    // Create minimal emergency fallback so UI doesn't crash
    (window as any).LunaBug = {
      status: () => ({ error: 'Init failed', fallback: true, provider: 'emergency' }),
      chat: (msg: string) => Promise.resolve({ response: `🌙 LunaBug Emergency Mode: "${msg}" received, but AI is unavailable. Add API keys to Secrets.`, provider: 'emergency' }),
      emergency: () => console.log('🚨 LunaBug Emergency Fallback Active - Add MISTRAL_API_KEY or PERPLEXITY_API_KEY'),
      functions: { 
        list: () => [], 
        run: (name: string) => `Function ${name} unavailable - LunaBug init failed`,
        reload: () => 'Cannot reload - LunaBug init failed'
      },
      core: {
        logEvent: (type: string, data: any) => console.log(`🌙 [${type}]`, data),
        getStatus: () => ({ emergency: true, initialized: false }),
        runCommand: (cmd: string) => console.log(`🌙 Emergency: ${cmd} not available`)
      },
      metrics: () => ({ provider: 'emergency', requestCount: 0, successRate: 0 }),
      version: '1.0.1-emergency'
    };
    
    console.log('🌙✅ Emergency fallback created - UI will not crash');
  }
  
  // Now initialize React with LunaBug watching (or emergency fallback)
  console.log('🚀 Starting React application...');
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
  
  // Log successful React initialization to LunaBug
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
  console.log('🚨 LAST RESORT: Starting React in isolation...');
  
  // Ensure we don't crash on undefined LunaBug calls
  (window as any).LunaBug = {
    status: () => ({ catastrophicFailure: true }),
    chat: () => Promise.resolve({ response: 'LunaBug catastrophic failure - system offline' }),
    emergency: () => console.error('🚨 LunaBug catastrophic failure mode'),
    functions: { list: () => [], run: () => 'System offline' }
  };
  
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
  
  console.log('🚨 React started in emergency mode - LunaBug offline');
});