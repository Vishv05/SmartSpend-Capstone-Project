import client from "./client";

export const fetchAdminSettings = async () => {
  const response = await client.get("/admin-settings/current/");
  return response.data;
};

export const updateAdminSettings = async (payload) => {
  const response = await client.patch("/admin-settings/current/", payload);
  return response.data;
};

export const resetAdminSettings = async () => {
  const response = await client.post("/admin-settings/reset_defaults/");
  return response.data;
};

export const sendSettingsTestEmail = async (recipient) => {
  const response = await client.post("/admin-settings/test_email/", { recipient });
  return response.data;
};
