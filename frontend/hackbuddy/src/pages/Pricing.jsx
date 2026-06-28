import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createRazorpayOrder, verifyPaymentDetails } from '../services/subscriptionService';
import { toast } from 'react-hot-toast';
import {
  CheckCircle, Zap, Users, ArrowLeft, Shield, Star,
  Brain, GitBranch, Bell, ShoppingBag, RefreshCw, Handshake
} from 'lucide-react';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '₹0',
    period: '',
    tagline: 'Get started for free',
    highlight: null,
    color: '#6b7280',
    bgColor: 'rgba(107,114,128,0.05)',
    borderColor: 'rgba(107,114,128,0.2)',
    features: [
      { icon: Brain, text: 'AI Mentor' },
      { icon: Brain, text: 'AI Project Review' },
      { icon: Brain, text: 'AI Task Splitter' },
      { icon: Shield, text: 'Google & GitHub Auth' },
      { icon: Users, text: 'Team Management' },
      { icon: Zap, text: 'Feature Management' },
      { icon: Users, text: 'Max 2 Teams (Pro Trial inside)' }
    ],
    buttonLabel: 'Current Plan',
    buttonDisabled: true
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '₹299',
    period: '/month',
    tagline: 'For serious hackers',
    highlight: '⭐ Most Popular',
    color: '#00f0ff',
    bgColor: 'rgba(0,240,255,0.04)',
    borderColor: 'rgba(0,240,255,0.25)',
    features: [
      { icon: CheckCircle, text: 'Everything in Free' },
      { icon: Bell, text: 'Smart Alerts' },
      { icon: Zap, text: 'AI Command Center' },
      { icon: GitBranch, text: 'GitHub Intelligence' },
      { icon: Users, text: 'Unlimited Team Creation' }
    ],
    buttonLabel: 'Upgrade to Pro',
    buttonDisabled: false
  },
  {
    id: 'TEAM',
    name: 'Team',
    price: '₹999',
    period: '/month',
    tagline: 'For full-stack teams',
    highlight: '🚀 All Features',
    color: '#a855f7',
    bgColor: 'rgba(168,85,247,0.04)',
    borderColor: 'rgba(168,85,247,0.25)',
    features: [
      { icon: CheckCircle, text: 'Everything in Pro' },
      { icon: ShoppingBag, text: 'AI Marketplace' },
      { icon: RefreshCw, text: 'Task Swapping' },
      { icon: Handshake, text: 'Collaboration Requests' },
      { icon: Brain, text: 'All AI Features' },
      { icon: Users, text: 'Unlimited Team Creation' }
    ],
    buttonLabel: 'Upgrade to Team',
    buttonDisabled: false
  }
];

const FAQ = [
  {
    q: 'What happens after 2 teams on Free?',
    a: 'You get full AI access inside your first 2 teams as a trial. Creating a 3rd team requires upgrading to Pro or Team.'
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. You can upgrade from Free → Pro → Team anytime. Downgrades take effect at the next billing cycle.'
  },
  {
    q: 'Is Razorpay safe?',
    a: 'Razorpay is a PCI-DSS Level 1 certified payment gateway. We never store your card details.'
  },
  {
    q: 'Do I need a Team plan for just GitHub Intelligence?',
    a: 'No. GitHub Intelligence is included in the Pro plan (₹299/month).'
  }
];

const Pricing = () => {
  const navigate = useNavigate();
  const { subscription, refreshSubscription } = useAuth();
  const currentPlan = subscription?.plan || 'FREE';
  const [paying, setPaying] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const handleUpgrade = async (planId) => {
    if (planId === 'FREE') return;
    setPaying(planId);
    try {
      const orderData = await createRazorpayOrder(planId);
      if (!orderData.success) {
        toast.error(orderData.message || 'Could not create payment order.');
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HackBuddy',
        description: `${planId} Workspace Subscription`,
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
            } else {
              toast.error(verifyData.message || 'Payment verification failed.');
            }
          } catch {
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

  const getButtonLabel = (plan) => {
    if (plan.id === currentPlan) return 'Current Plan ✓';
    if (plan.buttonDisabled) return plan.buttonLabel;
    return paying === plan.id ? 'Processing...' : plan.buttonLabel;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020817 0%, #0a0f1e 60%, #020817 100%)' }}>
      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00f0ff 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors bg-transparent border-0 cursor-pointer mb-8"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-300 bg-brand-300/10 border border-brand-300/20 px-3 py-1 rounded-full mb-4">
            Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Start Free.<br />
            <span style={{ color: '#00f0ff' }}>Scale when you're ready.</span>
          </h1>
          <p className="mt-4 text-neutral-400 text-base max-w-xl mx-auto">
            Every new user gets two free teams with full AI access — no credit card required. Upgrade when you need more.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isHighlighted = plan.id === 'PRO';

            return (
              <div
                key={plan.id}
                className="relative flex flex-col rounded-2xl border p-6 gap-5 transition-all duration-300"
                style={{
                  borderColor: isCurrent ? plan.color : plan.borderColor,
                  background: isCurrent ? `${plan.color}08` : plan.bgColor,
                  boxShadow: isCurrent || isHighlighted ? `0 0 30px ${plan.color}20` : 'none',
                  transform: isHighlighted ? 'scale(1.03)' : 'scale(1)'
                }}
              >
                {/* Badge */}
                {plan.highlight && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ background: plan.color, color: '#020817' }}
                  >
                    {plan.highlight}
                  </div>
                )}

                {isCurrent && (
                  <div
                    className="absolute -top-3.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: '#10b981', color: '#fff' }}
                  >
                    ✓ Your Plan
                  </div>
                )}

                {/* Plan name & price */}
                <div>
                  <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: plan.color }}>
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    {plan.period && <span className="text-sm text-neutral-500 mb-1">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{plan.tagline}</p>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: `${plan.color}20` }} />

                {/* Features */}
                <ul className="flex flex-col gap-2.5 flex-1">
                  {plan.features.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-xs text-neutral-300">
                      <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || plan.buttonDisabled || paying !== null}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={
                    isCurrent || plan.buttonDisabled
                      ? { background: 'rgba(107,114,128,0.15)', color: '#6b7280' }
                      : { background: plan.color, color: '#020817' }
                  }
                >
                  {getButtonLabel(plan)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h2 className="text-xl font-black text-white text-center mb-6">Full Feature Comparison</h2>
          <div className="rounded-2xl border border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left px-6 py-3 text-neutral-500 font-bold uppercase text-xs tracking-wider">Feature</th>
                  <th className="text-center px-4 py-3 text-neutral-500 font-bold uppercase text-xs tracking-wider">Free</th>
                  <th className="text-center px-4 py-3 font-bold uppercase text-xs tracking-wider" style={{ color: '#00f0ff' }}>Pro</th>
                  <th className="text-center px-4 py-3 font-bold uppercase text-xs tracking-wider" style={{ color: '#a855f7' }}>Team</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI Mentor', true, true, true],
                  ['AI Project Review', true, true, true],
                  ['AI Task Splitter', true, true, true],
                  ['Team Management', true, true, true],
                  ['Feature Management', true, true, true],
                  ['Max Teams', '2', '∞', '∞'],
                  ['Smart Alerts', false, true, true],
                  ['AI Command Center', false, true, true],
                  ['GitHub Intelligence', false, true, true],
                  ['AI Marketplace', false, false, true],
                  ['Task Swapping', false, false, true],
                  ['Collaboration Requests', false, false, true]
                ].map(([feature, free, pro, team], i) => (
                  <tr key={feature} className={`border-b border-neutral-800/50 ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                    <td className="px-6 py-3 text-neutral-300 text-xs font-medium">{feature}</td>
                    {[free, pro, team].map((val, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        {val === true ? (
                          <CheckCircle size={15} className="mx-auto text-emerald-400" />
                        ) : val === false ? (
                          <span className="text-neutral-700 text-lg leading-none">—</span>
                        ) : (
                          <span className="text-xs font-bold text-neutral-300">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-white text-center mb-6">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center bg-transparent border-0 cursor-pointer"
                >
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  <span className="text-neutral-500 text-lg">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-xs text-neutral-400 leading-relaxed border-t border-neutral-800">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
