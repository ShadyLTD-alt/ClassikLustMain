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

// Import LunaBug bootstrap (runs immediately)
import { initLunaBug } from "../LunaBug/init.js";

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
    // Continue anyway - game should still work without LunaBug
  }
  
  // Now initialize React with LunaBug watching
  console.log('🚀 Starting React application...');
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
  
  // Log successful React initialization to LunaBug
  if (window.LunaBug?.core) {
    window.LunaBug.core.logEvent('react_initialized', {
      timestamp: new Date().toISOString(),
      reactVersion: 'React 18+',
      rootElement: 'mounted'
    });
  }
}

// Start the bootstrap sequence
bootstrap().catch(error => {
  console.error('🚨 Bootstrap failed:', error);
  
  // Emergency fallback - start React without LunaBug
  console.log('🚨 Emergency fallback: Starting React without LunaBug...');
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
});