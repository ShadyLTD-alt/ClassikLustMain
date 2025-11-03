// 🔧 FIX: Suppress ResizeObserver loop errors in browser console
// These are harmless but spam the console during development

if (typeof window !== 'undefined') {
  // Store original error handler
  const originalError = console.error;
  
  console.error = (...args: any[]) => {
    // Filter out ResizeObserver errors
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('ResizeObserver loop completed with undelivered notifications') ||
       args[0].includes('ResizeObserver loop limit exceeded'))
    ) {
      return; // Suppress these specific errors
    }
    
    // Let through all other errors
    originalError(...args);
  };
  
  // Also handle errors thrown by ResizeObserver
  window.addEventListener('error', (event) => {
    if (
      event.error?.message?.includes('ResizeObserver') ||
      event.message?.includes('ResizeObserver')
    ) {
      event.preventDefault();
      return false;
    }
  });
  
  console.log('🔇 ResizeObserver error suppression active');
}

export {}; // Make this a module