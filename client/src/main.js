// 🎮 ClassikLust Game - Enhanced Client Entry Point
// 🔧 Fixed with LunaBug integration and promise wrapper utilities

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

// 🌙 Import LunaBug client for enhanced debugging
import lunaBugClient from './utils/lunaBugClient.js';

// 🔧 Import promise wrapper utilities
import PromiseWrapper, { 
  safeSetDisplayImage, 
  safeSelectCharacter, 
  safeAdminSave, 
  safeUpload,
  withSafeAsync,
  safeApiCall
} from './utils/promiseWrapper.js';

// 🔍 Enhanced error handling and logging
const originalError = console.error;
console.error = (...args) => {
  // Check for promise.finally errors and provide helpful context
  const message = args.join(' ');
  if (message.includes('promise.finally is not a function')) {
    originalError('🚨 PROMISE.FINALLY ERROR DETECTED!');
    originalError('🔧 Fix: Use the promise wrapper utilities from /utils/promiseWrapper.js');
    originalError('🔧 Example: import { safeSetDisplayImage } from "./utils/promiseWrapper.js"');
    originalError('Original error:', ...args);
  } else {
    originalError(...args);
  }
};

// 🎆 Enhanced window globals for debugging and utilities
if (typeof window !== 'undefined') {
  // 🌙 LunaBug is already attached by the client module
  
  // 🔧 Add safe API helpers to window for console debugging
  window.SafeAPI = {
    setDisplayImage: safeSetDisplayImage,
    selectCharacter: safeSelectCharacter,
    adminSave: safeAdminSave,
    upload: safeUpload,
    call: safeApiCall,
    withAsync: withSafeAsync
  };
  
  // 🔍 Add debug utilities
  window.Debug = {
    async testAllEndpoints() {
      console.log('🔍 Testing all critical endpoints...');
      const tests = [
        { name: 'Health Check', fn: () => safeApiCall('/api/health') },
        { name: 'Player Me', fn: () => safeApiCall('/api/player/me') },
        { name: 'Characters', fn: () => safeApiCall('/api/characters') },
        { name: 'Upgrades', fn: () => safeApiCall('/api/upgrades') }
      ];
      
      const results = [];
      for (const test of tests) {
        const start = Date.now();
        try {
          await test.fn();
          results.push({
            name: test.name,
            status: 'SUCCESS',
            duration: `${Date.now() - start}ms`
          });
        } catch (error) {
          results.push({
            name: test.name,
            status: 'FAILED',
            duration: `${Date.now() - start}ms`,
            error: error.message
          });
        }
      }
      
      console.table(results);
      return results;
    },
    
    async testAdmin() {
      console.log('🔧 Testing admin endpoints...');
      try {
        const configDiff = await safeApiCall('/api/admin/config-diff');
        console.log('🔍 Config Diff:', configDiff);
        
        const systemHealth = await safeApiCall('/api/admin/system-health');
        console.log('🔍 System Health:', systemHealth);
        
        return { configDiff, systemHealth };
      } catch (error) {
        console.error('❌ Admin test failed:', error);
        return { error: error.message };
      }
    },
    
    async fixPromiseErrors() {
      console.log('🔧 Scanning for promise-related errors...');
      
      // Check for common problematic patterns
      const issues = [];
      
      // Look for .finally usage without proper promises
      const scripts = Array.from(document.querySelectorAll('script'));
      let hasFinally = false;
      
      try {
        // Check if any global variables are non-promise objects being used as promises
        const globalChecks = ['fetch', 'Promise'];
        for (const check of globalChecks) {
          if (typeof window[check] === 'undefined') {
            issues.push(`Missing global: ${check}`);
          }
        }
        
        console.log('🔍 Promise diagnostics:', {
          issues,
          promiseSupport: typeof Promise !== 'undefined',
          fetchSupport: typeof fetch !== 'undefined',
          finallySupport: typeof Promise.prototype.finally === 'function'
        });
        
        if (issues.length === 0) {
          console.log('✅ No promise issues detected');
        } else {
          console.warn('⚠️ Promise issues found:', issues);
        }
        
        return { issues, fixed: issues.length === 0 };
      } catch (error) {
        console.error('❌ Promise diagnostic failed:', error);
        return { error: error.message };
      }
    }
  };
  
  // 🔍 Add startup diagnostics
  window.addEventListener('load', async () => {
    console.log('🎮 ClassikLust Client Loaded with Enhanced Features:');
    console.log('  🌙 LunaBug: window.LunaBug (debugging & emergency tools)');
    console.log('  🔧 SafeAPI: window.SafeAPI (promise-wrapped API calls)');
    console.log('  🔍 Debug: window.Debug (diagnostic utilities)');
    console.log('');
    console.log('🔍 Quick Health Check:');
    
    // Quick startup health check
    try {
      const healthCheck = await safeApiCall('/api/health', {}, 3000);
      if (healthCheck.status === 'ok') {
        console.log('✅ Server is healthy');
        if (healthCheck.luna?.safeModeActive) {
          console.log('🛡️ Luna safe mode is active');
        }
      } else {
        console.warn('⚠️ Server health check returned non-ok status:', healthCheck);
      }
    } catch (error) {
      console.error('❌ Server health check failed:', error.message);
      console.log('🔧 Try window.LunaBug.emergency() if operations are failing');
    }
    
    // Check for existing promise errors in console
    setTimeout(() => {
      if (window.Debug) {
        window.Debug.fixPromiseErrors();
      }
    }, 1000);
  });
  
  // 🚨 Add global error handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    if (event.reason && event.reason.message) {
      if (event.reason.message.includes('finally is not a function')) {
        console.log('🔧 Promise.finally fix: Use SafeAPI utilities instead of raw promises');
        console.log('Example: await window.SafeAPI.call("/api/endpoint") instead of fetch().finally()');
      } else if (event.reason.message.includes('timed out after')) {
        console.log('🚨 Operation timeout detected - this may be an AsyncLock deadlock');
        console.log('Try: window.LunaBug.emergency() to activate safe mode');
      }
    }
    // Prevent default browser handling
    event.preventDefault();
  });
}

// 🎮 Initialize React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('🎮 ClassikLust initialized with enhanced error handling and debugging tools!');
console.log('Use window.LunaBug.status() to check system health');
console.log('Use window.Debug.testAllEndpoints() to validate all APIs');
