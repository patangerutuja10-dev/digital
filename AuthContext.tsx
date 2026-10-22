import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { api, setToken, setUnauthorizedHandler } from "../api/client";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  department?: string | null;
  isDemo?: boolean;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "lw_user";
// Auto sign-out after this much inactivity, so a browser left open on a
// shared/lab PC doesn't stay logged in indefinitely.
const IDLE_LIMIT_MS = 20 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  function logout() {
    api.post("/auth/logout").catch(() => {});
    setToken(null);
    setUser(null);
  }

  // Any 401 from the API (expired/invalid token) clears the session client-side too.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Idle-timeout: reset the timer on any user activity while signed in.
  useEffect(() => {
    if (!user) {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }
    const resetTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        setToken(null);
        setUser(null);
      }, IDLE_LIMIT_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [user]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: CurrentUser }>("/auth/login", { email, password });
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
