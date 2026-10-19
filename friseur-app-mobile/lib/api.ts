import axios from "axios";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  "https://frisuer-app-1.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});