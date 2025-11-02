// utils/safeJson.ts
import stringify from 'fast-safe-stringify';
// Note: safe-json-parse has a different import syntax
const safeParse = require('safe-json-parse');

export const safeStringify = (data: any): string => {
  try {
    if (data === null || data === undefined) return '{}';
    if (typeof data === 'string') {
      // Test if it's already valid JSON
      const testParse = safeParse(data);
      return testParse.error ? '{}' : data;
    }
    return stringify(data);
  } catch (error) {
    console.error('🔥 SafeStringify Error:', error);
    return '{}';
  }
};

export const safeParseJson = (jsonString: string): any => {
  try {
    if (!jsonString || jsonString.trim() === '') return {};
    
    const result = safeParse(jsonString);
    if (result.error) {
      console.error('🔥 SafeParse Error:', result.error);
      return {};
    }
    return result.value || {};
  } catch (error) {
    console.error('🔥 SafeParse Catch Error:', error);
    return {};
  }
};

// Special handler for form data
export const prepareFormDataForAPI = (formData: any): any => {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (value === null || value === undefined || value === '') {
      // Skip empty values
      continue;
    }
    
    // Handle arrays and objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = safeStringify(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = safeStringify(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

// Debug helper
export const debugJSON = (data: any, label: string = 'DEBUG') => {
  console.log(`🐛 ${label}:`, {
    type: typeof data,
    isArray: Array.isArray(data),
    keys: typeof data === 'object' ? Object.keys(data) : null,
    value: data
  });
};

// Validation helper for admin forms
export const validateFormData = (formData: any): { isValid: boolean, errors: string[] } => {
  const errors: string[] = [];
  
  // Check for required fields based on form type
  if (!formData.name || formData.name.trim() === '') {
    errors.push('Name is required');
  }
  
  // Validate numeric fields
  if (formData.maxLevel && isNaN(Number(formData.maxLevel))) {
    errors.push('Max Level must be a valid number');
  }
  
  if (formData.baseCost && isNaN(Number(formData.baseCost))) {
    errors.push('Base Cost must be a valid number');
  }
  
  if (formData.costMultiplier && isNaN(Number(formData.costMultiplier))) {
    errors.push('Cost Multiplier must be a valid number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Safe API request helper
export const safeApiRequest = async (url: string, data: any, method: string = 'POST') => {
  try {
    debugJSON(data, `API REQUEST ${method} ${url}`);
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: safeStringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    const result = safeParseJson(responseText);
    
    debugJSON(result, `API RESPONSE ${method} ${url}`);
    
    return { success: true, data: result };
  } catch (error) {
    console.error(`🔥 API Request Error (${method} ${url}):`, error);
    return { success: false, error: error.message };
  }
};