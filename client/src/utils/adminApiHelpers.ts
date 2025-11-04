// 🔧 Admin API Helper Functions with Enhanced Session Management
import { toast } from '@/hooks/use-toast';

// 🔑 Enhanced API request with automatic session refresh
export async function adminApiRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  options: { 
    skipAuth?: boolean,
    retryOnAuth?: boolean 
  } = {}
): Promise<Response> {
  const { skipAuth = false, retryOnAuth = true } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  // Add authentication headers
  if (!skipAuth) {
    const sessionToken = localStorage.getItem('sessionToken');
    const adminToken = localStorage.getItem('adminToken');
    
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }
  }
  
  const requestOptions: RequestInit = {
    method,
    headers,
  };
  
  if (data && ['POST', 'PATCH', 'PUT'].includes(method)) {
    requestOptions.body = JSON.stringify(data);
  }
  
  console.log(`🔧 [ADMIN API] ${method} ${url}`, { 
    hasSessionToken: !!localStorage.getItem('sessionToken'),
    hasAdminToken: !!localStorage.getItem('adminToken'),
    dataKeys: data ? Object.keys(data) : []
  });
  
  try {
    const response = await fetch(url, requestOptions);
    
    // Handle 401 (session expired) with automatic retry
    if (response.status === 401 && retryOnAuth && !skipAuth) {
      console.log('🔄 [ADMIN API] Session expired (401), attempting refresh...');
      
      const refreshed = await refreshSessionIfNeeded();
      if (refreshed) {
        console.log('✅ [ADMIN API] Session refreshed, retrying request...');
        // Retry the request with new session
        return adminApiRequest(method, url, data, { ...options, retryOnAuth: false });
      } else {
        console.log('❌ [ADMIN API] Session refresh failed, redirecting to login');
        handleAuthFailure();
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    // Handle other error responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `${method} ${url} failed: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      console.error(`❌ [ADMIN API] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    console.log(`✅ [ADMIN API] ${method} ${url} success`);
    return response;
    
  } catch (error) {
    console.error(`💥 [ADMIN API] ${method} ${url} error:`, error);
    throw error;
  }
}

// 🔄 Attempt to refresh the session
export async function refreshSessionIfNeeded(): Promise<boolean> {
  try {
    // Check if we have Telegram WebApp data for auto-refresh
    const WebApp = (window as any).Telegram?.WebApp;
    
    if (WebApp?.initData) {
      console.log('🔄 [REFRESH] Attempting Telegram auto-refresh...');
      
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: WebApp.initData })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('sessionToken', data.sessionToken);
        console.log('✅ [REFRESH] Telegram session refreshed successfully');
        return true;
      }
    }
    
    // Try dev auth refresh if in development
    const currentUsername = localStorage.getItem('devUsername');
    if (currentUsername && process.env.NODE_ENV !== 'production') {
      console.log('🔄 [REFRESH] Attempting dev auth refresh...');
      
      const response = await fetch('/api/auth/dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('sessionToken', data.sessionToken);
        console.log('✅ [REFRESH] Dev session refreshed successfully');
        return true;
      }
    }
    
    console.log('❌ [REFRESH] No refresh method available');
    return false;
    
  } catch (error) {
    console.error('💥 [REFRESH] Session refresh failed:', error);
    return false;
  }
}

// 🚨 Handle authentication failure
export function handleAuthFailure() {
  console.log('🚨 [AUTH] Authentication failed, clearing session data');
  
  // Clear all session data
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('adminToken');
  
  // Show user-friendly error
  toast({
    title: 'Session Expired',
    description: 'Your session has expired. Please refresh the page to log in again.',
    variant: 'destructive',
    duration: 10000
  });
  
  // Optionally reload the page after a delay
  setTimeout(() => {
    window.location.reload();
  }, 3000);
}

// 📊 Enhanced admin save function with better error handling
export async function saveAdminData(
  type: 'upgrades' | 'characters' | 'levels',
  data: any,
  isCreate: boolean = false
) {
  try {
    const endpoints = {
      upgrades: isCreate ? '/api/admin/upgrades' : `/api/admin/upgrades/${data.id}`,
      characters: isCreate ? '/api/admin/characters' : `/api/admin/characters/${data.id}`,
      levels: isCreate ? '/api/admin/levels' : `/api/admin/levels/${data.level}`
    };
    
    const method = isCreate ? 'POST' : 'PATCH';
    const url = endpoints[type];
    
    console.log(`💾 [SAVE] ${method} ${url}`, {
      type,
      isCreate,
      dataKeys: Object.keys(data)
    });
    
    const response = await adminApiRequest(method, url, data);
    const result = await response.json();
    
    console.log(`✅ [SAVE] ${type} saved successfully`);
    
    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1, -1)} saved`,
      description: `${data.name || `Level ${data.level}`} saved to JSON and queued for DB sync.`,
      duration: 3000
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ [SAVE] Failed to save ${type}:`, error);
    
    toast({
      title: `Error saving ${type.slice(0, -1)}`,
      description: error instanceof Error ? error.message : 'Unknown error occurred',
      variant: 'destructive',
      duration: 8000
    });
    
    throw error;
  }
}

// 🔍 Check current session validity
export async function checkSessionValid(): Promise<boolean> {
  try {
    const response = await adminApiRequest('GET', '/api/auth/me');
    return response.ok;
  } catch {
    return false;
  }
}

// 🆔 Get current session info
export async function getCurrentSessionInfo(): Promise<any> {
  try {
    const response = await adminApiRequest('GET', '/api/auth/me');
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

// 🛡️ Validate admin permissions
export async function validateAdminAccess(): Promise<boolean> {
  try {
    const sessionInfo = await getCurrentSessionInfo();
    return sessionInfo?.player?.isAdmin === true;
  } catch {
    return false;
  }
}