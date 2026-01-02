import { createContext, useContext, useState, useEffect } from "react";
import { isAuthenticated, clearAuthCookies, getEmail } from "../../utils/auth";
import { API_BASE } from "../../utils/api";

/**
 * Auth Context for sharing authentication state across components
 */
const AuthContext = createContext(null);

/**
 * Auth Provider component - wrap your app with this
 */
export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(null);

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      setAuthenticated(isAuth);
      if (isAuth) {
        // Try to get email from cookie, or fetch from backend
        const cookieEmail = getEmail();
        if (cookieEmail) {
          setEmail(cookieEmail);
        } else {
          // Fetch email from backend
          try {
            const response = await fetch(`${API_BASE}/auth/me`, {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              setEmail(data.email);
            }
          } catch {
            // Ignore errors
          }
        }
      } else {
        setEmail(null);
      }
      setLoading(false);
    };

    checkAuth();
    
    // Check auth status periodically (every minute) to catch expired sessions
    const interval = setInterval(checkAuth, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const login = async () => {
    const isAuth = await isAuthenticated();
    setAuthenticated(isAuth);
    if (isAuth) {
      const cookieEmail = getEmail();
      if (cookieEmail) {
        setEmail(cookieEmail);
      } else {
        // Fetch email from backend
        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            setEmail(data.email);
          }
        } catch {
          // Ignore errors
        }
      }
    }
  };

  const logout = async () => {
    // Call backend logout endpoint
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore errors
    }
    clearAuthCookies();
    setAuthenticated(false);
    setEmail(null);
  };

  const value = {
    authenticated,
    loading,
    email,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook for accessing authentication state
 * Must be used within an AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

