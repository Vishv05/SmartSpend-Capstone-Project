const TOKEN_KEY = "smartspend_tokens";
const USER_KEY = "smartspend_user";

const notifyUserChange = () => {
  window.dispatchEvent(new Event("smartspend:user"));
};

export const getTokens = () => {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setTokens = (tokens) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyUserChange();
};

export const clearUser = () => {
  localStorage.removeItem(USER_KEY);
  notifyUserChange();
};

export const clearSession = () => {
  clearTokens();
  clearUser();
};
