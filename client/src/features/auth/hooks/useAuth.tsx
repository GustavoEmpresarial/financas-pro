import { useState, useEffect, createContext, useContext } from "react";
import { AuthAPI, getToken, setToken as saveToken, removeToken } from "@/shared/services/api";

interface User {
  id: string;
  email: string;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodePayload(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.userId) return null;
    return { id: payload.userId, email: payload.email, displayName: payload.displayName || null };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const decoded = decodePayload(token);
      setUser(decoded);
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const data = await AuthAPI.register(email, password, displayName);
      saveToken(data.token);
      setUser(data.user);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await AuthAPI.login(email, password);
      saveToken(data.token);
      setUser(data.user);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  };

  const signOut = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
