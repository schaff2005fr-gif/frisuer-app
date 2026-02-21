const RAW =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://frisuer-app.onrender.com";

// trailing slash entfernen
const API_URL = RAW.replace(/\/+$/, "");

export type MeResponse = {
  id: number;
  email: string;
  role: "CUSTOMER" | "BARBER";
  customer: null | { id: number; name: string; phone: string | null };
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export const api = {
  register: (body: { email: string; password: string; name: string; phone?: string }) =>
    request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request<MeResponse>("/me"),

  services: () =>
    request<{ services: Array<{ key: string; name: string; durationMin: number }> }>("/services"),

  availableTimes: (date: string, serviceKey: string) =>
    request<{
      date: string;
      service: { key: string; name: string; durationMin: number };
      activeWindowHHMM: { start: string; end: string };
      timesHHMM: string[];
    }>(`/available-times?date=${encodeURIComponent(date)}&serviceKey=${encodeURIComponent(serviceKey)}`),

  createBooking: (body: { date: string; serviceKey: string; exactTime: string; note?: string }) =>
    request<any>("/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  myBookings: () => request<any>("/my-bookings"),
};