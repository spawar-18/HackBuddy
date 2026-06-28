import api from './api';

export const getSubscriptionStatus = async () => {
  const response = await api.get('/subscription/status');
  return response.data;
};

export const createRazorpayOrder = async (plan) => {
  const response = await api.post('/subscription/create-order', { plan });
  return response.data;
};

export const verifyPaymentDetails = async (paymentData) => {
  const response = await api.post('/subscription/verify-payment', paymentData);
  return response.data;
};

export const cancelSubscription = async () => {
  const response = await api.post('/subscription/cancel');
  return response.data;
};

export const getAdminAnalytics = async () => {
  const response = await api.get('/subscription/admin-analytics');
  return response.data;
};
