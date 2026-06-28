import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, Users, Sparkles, ArrowRight, Check } from 'lucide-react';

/**
 * UpgradeGate — shown when a FREE user tries to access a PRO or TEAM feature.
 * 
 * Props:
 *  feature    - name of the feature (e.g. "AI Command Center")
 *  requiredPlan  - 'PRO' | 'TEAM'
 *  description   - optional one-liner about the feature
 */
const UpgradeGate = ({ feature = 'This Feature', requiredPlan = 'PRO', description }) => {
  const navigate = useNavigate();

  const isPro  = requiredPlan === 'PRO';
  const planLabel = isPro ? 'Pro' : 'Team';
  const planPrice = isPro ? '₹299 / mo' : '₹999 / mo';
  const planColor = isPro
    ? { from: '#6366f1', to: '#8b5cf6', badge: '#6366f1', badgeBg: 'rgba(99,102,241,0.12)', badgeBorder: 'rgba(99,102,241,0.35)' }
    : { from: '#0ea5e9', to: '#06b6d4', badge: '#0ea5e9', badgeBg: 'rgba(14,165,233,0.12)', badgeBorder: 'rgba(14,165,233,0.35)' };

  const features = isPro
    ? [
        'AI Command Center with live HUD',
        'GitHub Intelligence & analytics',
        'AI repository health scoring',
        'Smart alerts & milestone tracking',
        'Unlimited teams',
      ]
    : [
        'Everything in Pro plan',
        'AI Task Marketplace',
        'Cross-team task swaps',
        'Collaboration request system',
        'Priority AI model access',
      ];

  const defaultDesc = isPro
    ? `${feature} is available on the Pro plan. Upgrade to unlock AI-powered project management.`
    : `${feature} is available exclusively on the Team plan for advanced collaboration features.`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] py-10 px-6 text-center animate-slide-up">
      {/* Glow orb */}
      <div
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${planColor.from}, ${planColor.to})`,
          boxShadow: `0 8px 32px ${planColor.from}40`,
        }}
      >
        <Lock size={26} className="text-white" />
        {/* sparkle ping */}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
          <Sparkles size={8} className="text-yellow-900" />
        </span>
      </div>

      {/* Plan badge */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-3"
        style={{
          backgroundColor: planColor.badgeBg,
          borderColor: planColor.badgeBorder,
          color: planColor.badge,
        }}
      >
        {isPro ? <Zap size={10} /> : <Users size={10} />}
        {planLabel} Plan Required
      </div>

      {/* Headline */}
      <h2 className="text-xl font-black text-neutral-900 mb-2 leading-tight">
        Unlock{' '}
        <span style={{ color: planColor.from }}>{feature}</span>
      </h2>
      <p className="text-xs text-neutral-500 max-w-sm leading-relaxed mb-6">
        {description || defaultDesc}
      </p>

      {/* Feature bullets */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 mb-6 w-full max-w-sm text-left">
        <div className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-3">
          {planLabel} plan includes
        </div>
        <div className="flex flex-col gap-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-neutral-700">
              <Check
                size={13}
                className="shrink-0 mt-0.5"
                style={{ color: planColor.from }}
              />
              {f}
            </div>
          ))}
        </div>
        <div
          className="mt-4 text-[11px] font-black"
          style={{ color: planColor.from }}
        >
          Starting at {planPrice}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer border-0 transition-all hover:opacity-90 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${planColor.from}, ${planColor.to})`,
            boxShadow: `0 4px 16px ${planColor.from}40`,
          }}
        >
          <Zap size={14} />
          Upgrade to {planLabel}
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 hover:border-neutral-300 cursor-pointer transition-all"
        >
          View Plans
        </button>
      </div>
    </div>
  );
};

export default UpgradeGate;
