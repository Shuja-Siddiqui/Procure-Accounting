import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getApiUrl } from '@/lib/queryClient';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'seller' | 'purchaser' | 'accountant';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(getApiUrl('/api/auth/me'), {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.data);
          } else {
            // Try to refresh token
            await refreshToken();
          }
        } else if (response.status === 401) {
          // Try to refresh token
          await refreshToken();
        }
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ identifier, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
    setUser(data.data.user);
  };

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshTokenValue) {
      setUser(null);
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
        
        // Get user info
        const userResponse = await fetch(getApiUrl('/api/auth/me'), {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${data.data.accessToken}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success) {
            setUser(userData.data);
          }
        }
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
    }
  };

  const logout = async () => {
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (refreshTokenValue) {
      try {
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

