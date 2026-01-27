import { QueryClient, QueryFunction } from "@tanstack/react-query";

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Get API base URL from environment or use proxy (defaults to relative path for dev proxy)
export const getApiUrl = (path: string): string => {
  // In development, vite proxy handles /api routes
  // In production, use VITE_API_URL if set, otherwise use relative path
  const apiBase = import.meta.env.VITE_API_URL || '';
  // Remove leading slash from path if apiBase already has trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return apiBase ? `${apiBase}${cleanPath}` : cleanPath;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // If we can't read the response, use status text
    }
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).response = errorMessage;
    throw error;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(getApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
      return data.data.accessToken;
    }
    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const apiUrl = url.startsWith('http') ? url : getApiUrl(url);
  let res = await fetch(apiUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If 401, try to refresh token and retry
  if (res.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/refresh')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(apiUrl, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    } else {
      // Refresh failed, redirect to login
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const apiUrl = url.startsWith('http') ? url : getApiUrl(url);
    const headers = getAuthHeaders();

    let res = await fetch(apiUrl, {
      headers,
      credentials: "include",
    });

    // If 401, try to refresh token and retry
    if (res.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/refresh')) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(apiUrl, {
          headers,
          credentials: "include",
        });
      } else {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
