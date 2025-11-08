// server/utils/safeJson.js
const stringify = require('fast-safe-stringify');

// Safe stringify that handles circular references and errors
const safeStringify = (data) => {
  try {
    if (data === null || data === undefined) return '{}';
    if (typeof data === 'string') {
      // Test if it's already valid JSON
      try {
        JSON.parse(data);
        return data;
      } catch {
        return '{}';
      }
    }
    return stringify(data);
  } catch (error) {
    console.error('🔥 Server SafeStringify Error:', error);
    return '{}';
  }
};

// ✅ FIXED: Safe parse using native JSON.parse (synchronous) instead of safe-json-parse (callback)
const safeParseJson = (jsonString) => {
  try {
    if (!jsonString || jsonString.trim() === '') return {};
    
    // Use native JSON.parse - it's synchronous and doesn't require callbacks
    const parsed = JSON.parse(jsonString);
    return parsed || {};
  } catch (error) {
    console.error('🔥 Server SafeParse Catch Error:', {
      error: error.message,
      input: typeof jsonString,
      preview: typeof jsonString === 'string' ? jsonString.substring(0, 100) : String(jsonString)
    });
    return {};
  }
};

// Safely handle request body parsing
const safeParseRequestBody = (req) => {
  try {
    // If req.body is already an object, return it
    if (typeof req.body === 'object' && req.body !== null) {
      return req.body;
    }
    
    // If it's a string, try to parse it
    if (typeof req.body === 'string') {
      return safeParseJson(req.body);
    }
    
    return {};
  } catch (error) {
    console.error('🔥 Request body parsing error:', error);
    return {};
  }
};

// Debug helper for server
const debugJSON = (data, label = 'SERVER_DEBUG') => {
  console.log(`🐛 ${label}:`, {
    type: typeof data,
    isArray: Array.isArray(data),
    keys: typeof data === 'object' && data !== null ? Object.keys(data) : null,
    value: data
  });
};

// Validate and clean form data for database operations
const validateAndCleanFormData = (formData) => {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    // Handle different data types
    if (typeof value === 'string') {
      cleaned[key] = value.trim();
    } else if (typeof value === 'number') {
      cleaned[key] = value;
    } else if (typeof value === 'boolean') {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      cleaned[key] = value;
    } else if (typeof value === 'object') {
      cleaned[key] = value;
    } else {
      cleaned[key] = String(value);
    }
  }
  
  return cleaned;
};

module.exports = {
  safeStringify,
  safeParseJson,
  safeParseRequestBody,
  debugJSON,
  validateAndCleanFormData
};