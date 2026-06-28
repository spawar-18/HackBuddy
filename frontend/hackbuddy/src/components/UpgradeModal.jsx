import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createRazorpayOrder, verifyPaymentDetails } from '../services/subscriptionService';
import { toast } from 'react-hot-toast';
import { X, Zap, Users, CheckCircle } from 'lucide-react';

const PLANS = [
  {
    id: 'PRO',
    name: 'Pro Plan',
    price: '₹299',
    period: '/month',
    highlight: 'Most Popular',
    color: '#00f0ff',
    features: [
      'Unlimited Teams',
      'Smart Alerts',
      'AI Command Center',
      'GitHub Intelligence'
    ],
    buttonLabel: 'Upgrade with Razorpay'
  },
  {
    id: 'TEAM',
    name: 'Team Plan',
    price: '₹999',
    period: '/month',
    highlight: 'All Features',
    color: '#a855f7',
    features: [
      'Everything in Pro',
      'AI Marketplace',
      'Task Swapping',
      'Collaboration Requests',
      'All AI Features'
    ],
    buttonLabel: 'Upgrade Now'
  }
];

const UpgradeModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { refreshSubscription } = useAuth();
  const [paying, setPaying] = useState(null); // 'PRO' | 'TEAM' | null

  if (!isOpen) return null;

  const handleUpgrade = async (planId) => {
    setPaying(planId);
    try {
      // 1. Create Razorpay order
      const orderData = await createRazorpayOrder(planId);
      if (!orderData.success) {
        toast.error(orderData.message || 'Could not create payment order.');
        return;
      }

      // 2. Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HackBuddy',
        description: `${planId === 'PRO' ? 'Pro' : 'Team'} Workspace Subscription`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const verifyData = await verifyPaymentDetails({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId
            });
            if (verifyData.success) {
              await refreshSubscription();
              toast.success(`🎉 Welcome to HackBuddy ${planId} Workspace!`);
              onClose();
            } else {
              toast.error(verifyData.message || 'Payment verification failed.');
            }
          } catch (e) {
            toast.error('Payment verification error. Contact support.');
          }
        },
        prefill: {},
        theme: { color: planId === 'PRO' ? '#00f0ff' : '#a855f7' }
      };

      if (typeof window.Razorpay === 'undefined') {
        toast.error('Razorpay SDK not loaded. Please refresh and try again.');
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Payment setup failed.');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-brand-300/30 bg-neutral-950 shadow-2xl animate-slide-up overflow-hidden">
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-brand-400 via-purple-400 to-brand-400 rounded-full" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-300/10 border border-brand-300/30 mb-4">
            <Zap size={22} className="text-brand-300" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            🎉 Congratulations!
          </h2>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
            You've successfully created your first two teams.
            You're now ready to unlock the complete HackBuddy experience.
            <br />
            <span className="text-neutral-300 font-semibold">Upgrade to continue creating unlimited teams and unlock advanced AI features.</span>
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-8 pb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="relative flex flex-col rounded-xl border p-5 gap-4"
              style={{ borderColor: `${plan.color}30`, background: `${plan.color}06` }}
            >
              {/* Popular Badge */}
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: plan.color, color: '#020817' }}
              >
                {plan.highlight}
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: plan.color }}>
                  {plan.name}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-neutral-500 mb-1">{plan.period}</span>
                </div>
              </div>

              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-neutral-300">
                    <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={paying !== null}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: plan.color,
                  color: '#020817'
                }}
              >
                {paying === plan.id ? 'Processing...' : plan.buttonLabel}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 px-8 py-3 flex items-center justify-between">
          <span className="text-[11px] text-neutral-600">Secured by Razorpay · Cancel anytime</span>
          <button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="text-[11px] text-brand-400 hover:underline bg-transparent border-0 cursor-pointer"
          >
            View full pricing →
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
