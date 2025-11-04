/**
 * 🔧 Promise Wrapper Utility
 * 
 * Fixes "promise.finally is not a function" errors by ensuring
 * all async operations return proper Promises with full thenable support
 */

/**
 * Wraps any value or promise-like object into a proper Promise
 * @param {any} promiseOrValue - The value or promise to wrap
 * @param {number} timeoutMs - Optional timeout in milliseconds
 * @returns {Promise} A proper Promise with full thenable support
 */
export const ensurePromise = (promiseOrValue, timeoutMs = 10000) => {
  // If it's already a proper Promise, return it
  if (promiseOrValue instanceof Promise) {
    return timeoutMs ? addTimeout(promiseOrValue, timeoutMs) : promiseOrValue;
  }
  
  // If it has .then but no .finally, wrap it
  if (promiseOrValue && typeof promiseOrValue.then === 'function') {
    const wrappedPromise = Promise.resolve(promiseOrValue);
    return timeoutMs ? addTimeout(wrappedPromise, timeoutMs) : wrappedPromise;
  }
  
  // If it's a plain value, wrap in resolved Promise
  const resolvedPromise = Promise.resolve(promiseOrValue);
  return timeoutMs ? addTimeout(resolvedPromise, timeoutMs) : resolvedPromise;
};

/**
 * Adds timeout protection to a Promise
 * @param {Promise} promise - The promise to add timeout to
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Promise that rejects on timeout
 */
const addTimeout = (promise, timeoutMs) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Safe async wrapper for operations that might not return proper Promises
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} options - Options object
 * @param {number} options.timeout - Timeout in milliseconds (default: 5000)
 * @param {Function} options.onError - Error handler
 * @param {any} options.fallback - Fallback value on error
 * @returns {Promise} Safe Promise wrapper
 */
export const safeAsync = async (asyncFn, options = {}) => {
  const {
    timeout = 5000,
    onError = console.error,
    fallback = null
  } = options;
  
  try {
    const result = await ensurePromise(asyncFn(), timeout);
    return result;
  } catch (error) {
    if (onError) {
      onError('🔧 SafeAsync Error:', error);
    }
    return fallback;
  }
};

/**
 * API call wrapper that ensures proper Promise handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Request timeout
 * @returns {Promise} Properly wrapped API call
 */
export const safeApiCall = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    const response = await ensurePromise(fetchPromise, timeoutMs);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await ensurePromise(response.json(), 3000);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
};

/**
 * Enhanced async/await helper with proper error handling
 * Use this instead of raw async operations for better reliability
 * @param {Function} asyncOperation - The async function to execute
 * @param {Object} options - Configuration options
 * @returns {Promise} Enhanced promise with proper error handling
 */
export const withSafeAsync = async (asyncOperation, options = {}) => {
  const {
    timeout = 5000,
    retries = 1,
    onStart = () => {},
    onSuccess = () => {},
    onError = console.error,
    onFinally = () => {},
    fallback = null
  } = options;
  
  let lastError = null;
  
  onStart();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await safeAsync(asyncOperation, {
        timeout,
        onError: attempt === retries ? onError : () => {}, // Only log on final attempt
        fallback: undefined // Don't use fallback until final attempt
      });
      
      onSuccess(result);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        console.log(`🔄 Retrying operation (attempt ${attempt + 2}/${retries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    } finally {
      if (attempt === retries) {
        onFinally();
      }
    }
  }
  
  if (onError) {
    onError('Operation failed after all retries:', lastError);
  }
  
  return fallback;
};

// 🔧 SPECIFIC FIXES FOR COMMON ISSUES

/**
 * Fixed setDisplayImage function for the client
 * @param {string} imageUrl - Image URL to set
 * @returns {Promise} Properly wrapped promise
 */
export const safeSetDisplayImage = async (imageUrl) => {
  return withSafeAsync(
    () => safeApiCall('/api/player/set-display-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken') || ''}`
      },
      body: JSON.stringify({ imageUrl })
    }),
    {
      timeout: 3000,
      onStart: () => console.log('🖼️ Setting display image:', imageUrl),
      onSuccess: (result) => console.log('✅ Display image set successfully:', result),
      onError: (error) => console.error('❌ Failed to set display image:', error),
      fallback: { success: false, error: 'Failed to set display image' }
    }
  );
};

/**
 * Fixed character selection function
 * @param {string} characterId - Character ID to select
 * @returns {Promise} Properly wrapped promise
 */
export const safeSelectCharacter = async (characterId) => {
  return withSafeAsync(
    () => safeApiCall('/api/player/select-character', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken') || ''}`
      },
      body: JSON.stringify({ characterId })
    }),
    {
      timeout: 5000,
      retries: 2,
      onStart: () => console.log('🎭 Selecting character:', characterId),
      onSuccess: (result) => console.log('✅ Character selected successfully:', result),
      onError: (error) => console.error('❌ Failed to select character:', error),
      fallback: { success: false, error: 'Failed to select character' }
    }
  );
};

/**
 * Fixed admin save operations
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Data to save
 * @param {string} method - HTTP method (default: POST)
 * @returns {Promise} Properly wrapped promise
 */
export const safeAdminSave = async (endpoint, data, method = 'POST') => {
  return withSafeAsync(
    () => safeApiCall(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sessionToken') || ''}`
      },
      body: JSON.stringify(data)
    }),
    {
      timeout: 8000,
      retries: 1,
      onStart: () => console.log(`🔧 Admin save: ${method} ${endpoint}`),
      onSuccess: (result) => console.log('✅ Admin save successful:', result),
      onError: (error) => {
        console.error('❌ Admin save failed:', error);
        // Enhanced error logging for admin operations
        if (error.message.includes('500')) {
          console.log('🔍 Admin save 500 error - check server logs for detailed error information');
        }
      },
      fallback: { success: false, error: 'Failed to save' }
    }
  );
};

/**
 * Upload wrapper with proper promise handling
 * @param {FormData} formData - Form data to upload
 * @returns {Promise} Properly wrapped upload promise
 */
export const safeUpload = async (formData) => {
  return withSafeAsync(
    () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for uploads
      
      return fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken') || ''}`
        },
        body: formData,
        signal: controller.signal
      }).then(async response => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }
        return response.json();
      }).catch(error => {
        clearTimeout(timeoutId);
        throw error;
      });
    },
    {
      timeout: 35000,
      onStart: () => console.log('📤 Starting upload...'),
      onSuccess: (result) => console.log('✅ Upload successful:', result),
      onError: (error) => console.error('❌ Upload failed:', error),
      fallback: { success: false, error: 'Upload failed' }
    }
  );
};

// Default export for easy importing
export default {
  ensurePromise,
  safeAsync,
  safeApiCall,
  withSafeAsync,
  safeSetDisplayImage,
  safeSelectCharacter,
  safeAdminSave,
  safeUpload
};