import client from "./client";

/**
 * Get admin notification summary
 * Returns pending approvals, budget alerts, and recent activity
 */
export const getAdminNotifications = async () => {
  const response = await client.get("/notifications/admin_summary/");
  return response.data;
};

/**
 * Get user's personal notifications
 */
export const getMyNotifications = async () => {
  const response = await client.get("/notifications/my_notifications/");
  return response.data;
};

/**
 * Get all notifications (admin only)
 */
export const getAllNotifications = async () => {
  const response = await client.get("/notifications/");
  return response.data;
};
