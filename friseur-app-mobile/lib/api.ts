import axios from "axios";

export const API_BASE = "https://frisuer-app-1.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedHandlingPromise: Promise<void> | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url ?? "");

    const isAuthRequest =
      url.includes("/auth/login") ||
      url.includes("/auth/register");

    if (status === 401 && !isAuthRequest && unauthorizedHandler) {
      if (!unauthorizedHandlingPromise) {
        unauthorizedHandlingPromise = Promise.resolve(unauthorizedHandler()).finally(() => {
          unauthorizedHandlingPromise = null;
        });
      }

      await unauthorizedHandlingPromise;
    }

    return Promise.reject(error);
  }
);
