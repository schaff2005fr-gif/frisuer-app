"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Role = "CUSTOMER" | "BARBER";
type User = { id: number; email: string; role: Role; customer?: any; barber?: any };

type AuthContextType = {
  token: string | null;
  user: User | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<User>;
  registerCustomer: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  registerBarber: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;

  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE = "http://localhost:3001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function saveSession(t: string, u: User) {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  async function fetchMe(t: string) {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });

    if (!res.ok) throw new Error("Nicht eingeloggt / Token ungültig");
    return (await res.json()) as User;
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Login-Antwort war kein JSON: " + text.slice(0, 80));
    }

    if (!res.ok) throw new Error(data?.error || data?.message || "Login fehlgeschlagen");

    const t = data?.token;
    if (!t) throw new Error("Login OK, aber kein token in Response gefunden");

    const me = await fetchMe(t);
    saveSession(t, me);
    return me;
  }

  async function registerCustomer(input: { name: string; email: string; password: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: input.password,
        phone: input.phone ?? null,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Registrierung fehlgeschlagen");

    const t = data?.token;
    if (!t) throw new Error("Register OK, aber kein token in Response gefunden");

    const me = await fetchMe(t);
    saveSession(t, me);
    return me;
  }

  async function registerBarber(input: { name: string; email: string; password: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/auth/register-barber`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: input.password,
        phone: input.phone ?? null,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Registrierung fehlgeschlagen");

    const t = data?.token;
    if (!t) throw new Error("Register OK, aber kein token in Response gefunden");

    const me = await fetchMe(t);
    saveSession(t, me);
    return me;
  }

  function logout() {
    clearSession();
  }

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setLoading(false);
      return;
    }

    fetchMe(t)
      .then((me) => {
        saveSession(t, me);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setLoading(false));
  }, []);

  return <AuthContext.Provider value={{ token, user, loading, login, registerCustomer, registerBarber, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
