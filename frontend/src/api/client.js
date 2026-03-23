import axios from "axios";
import { getTokens, setTokens, clearSession } from "./storage";

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api",
});

let isRefreshing = false;
let pendingRequests = [];

const resolvePending = (error, token = null) => {
  pendingRequests.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  pendingRequests = [];
};

client.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const tokens = getTokens();
      if (!tokens?.refresh) {
        clearSession();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${client.defaults.baseURL}/auth/token/refresh/`,
          { refresh: tokens.refresh }
        );
        const nextTokens = {
          access: data.access,
          refresh: data.refresh || tokens.refresh,
        };
        setTokens(nextTokens);
        resolvePending(null, nextTokens.access);
        originalRequest.headers.Authorization = `Bearer ${nextTokens.access}`;
        return client(originalRequest);
      } catch (refreshError) {
        resolvePending(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);

export default client;
