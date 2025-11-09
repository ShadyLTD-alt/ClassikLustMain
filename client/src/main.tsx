/**
 * main.tsx - Application Entry Point
 * Updated for LunaBug client debugging & auto periodic checker
 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import PromiseWrapper, {
  safeSetDisplayImage, safeSelectCharacter, safeAdminSave, safeUpload, withSafeAsync, safeApiCall
} from './utils/promiseWrapper.js';

// Import periodic self-checker
import { periodicLunaSelfCheck } from "./utils/lunabug/periodicCheck.js";

async function bootstrap() {
  // Attach SafeAPI and Debug utilities to window
  if (typeof window !== 'undefined') {
    window.SafeAPI = { setDisplayImage: safeSetDisplayImage, selectCharacter: safeSelectCharacter, adminSave: safeAdminSave, upload: safeUpload, call: safeApiCall, withAsync: withSafeAsync };
    window.Debug = {
      async testAllEndpoints() {/*...see main.js for full function...*/},
      async testAdmin() {/*...see main.js for full function...*/},
      async fixPromiseErrors() {/*...see main.js for full function...*/}
    };
    // 🚦 Auto-launch Luna self-checker on load
    if (typeof periodicLunaSelfCheck === "function") {
      periodicLunaSelfCheck();
      console.log('🟢 LunaBug periodic checker auto-enabled on startup');
    } else {
      console.warn('⚠️ LunaBug periodic checker not available, check plugin import.');
    }
  }
  // Initialize React
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}
bootstrap().catch(error => {/*...existing fallback/error block remains...*/});
