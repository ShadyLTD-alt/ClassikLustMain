import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  endpoint: string,
  options?: RequestInit,
): Promise<Response> {
  const sessionToken = localStorage.getItem('sessionToken');

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('playerData');
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }

    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const sessionToken = localStorage.getItem('sessionToken');

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
      },
    });

    if (res.status === 401) {
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('playerData');
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});