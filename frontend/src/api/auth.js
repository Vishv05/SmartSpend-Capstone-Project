import client from "./client";
import { setTokens, setUser } from "./storage";

export const login = async (payload) => {
  const { data } = await client.post("/auth/login/", payload);
  setTokens({ access: data.access, refresh: data.refresh });
  setUser(data.user);
  return data.user;
};

export const register = async (payload) => {
  const { data } = await client.post("/auth/register/", payload);
  setTokens({ access: data.access, refresh: data.refresh });
  setUser(data.user);
  return data.user;
};

export const registerWithoutLogin = async (payload) => {
  const { data } = await client.post("/auth/register/", payload);
  // Don't auto-login, just return user data
  return data.user;
};

export const profile = async () => {
  const { data } = await client.get("/auth/profile/");
  setUser(data);
  return data;
};
