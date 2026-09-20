import axios from "axios";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, userApi } from "../api/endpoints";
import { tokenStore } from "../api/http";
import type { LoginRequest, RegisterRequest, UserSummary } from "../api/types";

interface AuthContextValue {
  user: UserSummary | null;
  loading: boolean;
  login: (body: LoginRequest) => Promise<UserSummary>;
  register: (body: RegisterRequest) => Promise<UserSummary>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      setLoading(false);
      return;
    }
    userApi
      .me()
      .then(setUser)
      .catch((err) => {
        // Only a confirmed auth failure (interceptor's silent refresh also failed) should sign
        // the user out — a transient network hiccup or a backend restart must not wipe a
        // refresh token that's still good for a month.
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          tokenStore.clear();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (body: LoginRequest) => {
    const auth = await authApi.login(body);
    tokenStore.set(auth);
    const me = await userApi.me();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (body: RegisterRequest) => {
    const auth = await authApi.register(body);
    tokenStore.set(auth);
    const me = await userApi.me();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefresh();
    tokenStore.clear();
    setUser(null);
    if (refreshToken) {
      await authApi.logout({ refreshToken }).catch(() => undefined);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
