import { createContext, useCallback, useContext, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const persist = (nextToken, nextUser) => {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = useCallback(async (email, password) => {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const { data } = await client.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    persist(data.access_token, data.user);
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await client.post("/auth/register", { username, email, password });
    persist(data.access_token, data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  // Used after an OAuth redirect (Google/GitHub) hands back a bare token —
  // fetch the profile it belongs to before storing the session.
  const completeOAuthLogin = useCallback(async (nextToken) => {
    localStorage.setItem("token", nextToken);
    setToken(nextToken);
    const { data } = await client.get("/auth/me");
    persist(nextToken, data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, completeOAuthLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
