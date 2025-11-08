// utils/safeJson.ts
import stringify from 'fast-safe-stringify';
import safeParse from 'safe-json-parse';

export const safeStringify = (data: any): string => {
  try {
    if (data === null || data === undefined) return '{}';
    if (typeof data === 'string') {
      const testParse = safeParse(data);
      return (testParse as any).error ? '{}' : data;
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
    const result = safeParse(jsonString) as any;
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

/**
 * ✅ FIXED: prepareFormDataForAPI no longer double-stringifies arrays/objects
 * Arrays and objects are kept as native types - they'll be stringified ONCE 
 * when the entire payload is sent via fetch()
 */
export const prepareFormDataForAPI = (formData: any): any => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(formData)) {
    // Skip null/undefined/empty strings
    if (value === null || value === undefined || value === '') continue;
    
    // ✅ CRITICAL FIX: Keep arrays and objects as-is
    // They will be stringified ONCE when the whole payload is sent
    // Previously, this was stringifying them here, causing double-stringify
    cleaned[key] = value;
  }
  return cleaned;
};

export const debugJSON = (data: any, label: string = 'DEBUG') => {
  console.log(`🐛 ${label}:`, {
    type: typeof data,
    isArray: Array.isArray(data),
    keys: typeof data === 'object' && data !== null ? Object.keys(data) : null,
    value: data
  });
};

export const validateFormData = (formData: any): { isValid: boolean, errors: string[] } => {
  const errors: string[] = [];
  if (!formData.name || formData.name.trim() === '') errors.push('Name is required');
  if (formData.maxLevel && isNaN(Number(formData.maxLevel))) errors.push('Max Level must be a valid number');
  if (formData.baseCost && isNaN(Number(formData.baseCost))) errors.push('Base Cost must be a valid number');
  if (formData.costMultiplier && isNaN(Number(formData.costMultiplier))) errors.push('Cost Multiplier must be a valid number');
  return { isValid: errors.length === 0, errors };
};

export const safeApiRequest = async (url: string, data: any, method: string = 'POST') => {
  try {
    debugJSON(data, `API REQUEST ${method} ${url}`);
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: safeStringify(data)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const responseText = await response.text();
    const result = safeParseJson(responseText);
    debugJSON(result, `API RESPONSE ${method} ${url}`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`🔥 API Request Error (${method} ${url}):`, error);
    return { success: false, error: error.message };
  }
};
