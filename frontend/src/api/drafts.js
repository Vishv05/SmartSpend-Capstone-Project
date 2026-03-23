import client from "./client";

/**
 * Fetch all drafts for current user
 */
export const fetchDrafts = async () => {
  const response = await client.get("/drafts/");
  return response.data.results || response.data;
};

/**
 * Create a new draft
 */
export const createDraft = async (draftData) => {
  const response = await client.post("/drafts/", draftData);
  return response.data;
};

/**
 * Update an existing draft
 */
export const updateDraft = async (draftId, draftData) => {
  const response = await client.patch(`/drafts/${draftId}/`, draftData);
  return response.data;
};

/**
 * Delete a draft
 */
export const deleteDraft = async (draftId) => {
  const response = await client.delete(`/drafts/${draftId}/`);
  return response.data;
};

/**
 * Convert draft to expense
 */
export const convertDraftToExpense = async (draftId) => {
  const response = await client.post(`/drafts/${draftId}/convert_to_expense/`);
  return response.data;
};
