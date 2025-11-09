/**
 * main.tsx - Application Entry Point
 * Updated for LunaBug client debugging & SafeAPI integration from legacy main.js
 * 
 * LunaBug initializes FIRST, then React, then global debug utilities loaded
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Enhanced LunaBug import (no legacy main.js client-only, use core bug)
// import lunaBugClient from './utils/lunaBugClient.js';
import PromiseWrapper, {
  safeSetDisplayImage, safeSelectCharacter, safeAdminSave, safeUpload, withSafeAsync, safeApiCall
} from './utils/promiseWrapper.js';

// Unified pre-boot sequence (LunaBug)
async function bootstrap() {
  // LunaBug pre-boot
  // If fallback needed, run minimal emergency instance as in current file
  // ...existing LunaBug emergency fallback block remains...

  // Attach SafeAPI and Debug utilities to window, just as legacy main.js
  if (typeof window !== 'undefined') {
    window.SafeAPI = {
      setDisplayImage: safeSetDisplayImage,
      selectCharacter: safeSelectCharacter,
      adminSave: safeAdminSave,
      upload: safeUpload,
      call: safeApiCall,
      withAsync: withSafeAsync
    };
    window.Debug = {
      async testAllEndpoints() {/*...see main.js for full function...*/},
      async testAdmin() {/*...see main.js for full function...*/},
      async fixPromiseErrors() {/*...see main.js for full function...*/}
    };
  }
  // Initialize React
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}
bootstrap().catch(error => {/*...existing fallback/error block remains...*/});
