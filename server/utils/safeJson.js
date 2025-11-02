// server/utils/safeJson.js
const stringify = require('fast-safe-stringify');
const safeParse = require('safe-json-parse');

// Safe stringify that handles circular references and errors
const safeStringify = (data) => {
  try {
    if (data === null || data === undefined) return '{}';
    if (typeof data === 'string') {
      // Test if it's already valid JSON
      const testParse = safeParse(data);
      return testParse.error ? '{}' : data;
    }
    return stringify(data);
  } catch (error) {
    console.error('🔥 Server SafeStringify Error:', error);
    return '{}';
  }
};

// Safe parse that never throws errors
const safeParseJson = (jsonString) => {
  try {
    if (!jsonString || jsonString.trim() === '') return {};
    
    const result = safeParse(jsonString);
    if (result.error) {
      console.error('🔥 Server SafeParse Error:', result.error);
      return {};
    }
    return result.value || {};
  } catch (error) {
    console.error('🔥 Server SafeParse Catch Error:', error);
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