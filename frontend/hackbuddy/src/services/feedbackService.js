import api from './api';

/**
 * Submit new feedback
 */
export const submitFeedback = async ({ featureName, rating, comment, category }) => {
  const response = await api.post('/feedback', {
    featureName,
    rating,
    comment,
    category
  });
  return response.data;
};

/**
 * Get all feedback with optional filters
 */
export const getAllFeedback = async (params = {}) => {
  const response = await api.get('/feedback', { params });
  return response.data;
};

/**
 * Get AI-powered feedback summary
 */
export const getFeedbackSummary = async () => {
  const response = await api.get('/feedback/summary');
  return response.data;
};

/**
 * Get feedback statistics
 */
export const getFeedbackStats = async () => {
  const response = await api.get('/feedback/stats');
  return response.data;
};

/**
 * Update feedback status
 */
export const updateFeedbackStatus = async (feedbackId, status) => {
  const response = await api.patch(`/feedback/${feedbackId}/status`, { status });
  return response.data;
};
