import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  MessageSquare, Star, BarChart3, Sparkles, Send, ArrowLeft,
  TrendingUp, AlertTriangle, ThumbsUp, ThumbsDown, Minus,
  CheckCircle2, Clock, Eye, XCircle, Loader2, RefreshCw,
  Bug, Lightbulb, Heart, HelpCircle, Zap, ChevronDown,
  Award, Target, PieChart, Activity
} from 'lucide-react';
import {
  submitFeedback,
  getAllFeedback,
  getFeedbackSummary,
  getFeedbackStats,
  updateFeedbackStatus
} from '../services/feedbackService';

// ─── Constants ───
const FEATURES = [
  'Dashboard', 'Team Chat', 'Project Workspace', 'Tech Stack Consensus',
  'Task Marketplace', 'AI Mentor', 'Hackathon Command Center',
  'GitHub Integration', 'Team Analysis', 'Profile', 'Task Verification', 'Other'
];

const CATEGORIES = [
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: '#a78bfa' },
  { value: 'bug', label: 'Bug Report', icon: Bug, color: '#f87171' },
  { value: 'improvement', label: 'Improvement', icon: TrendingUp, color: '#34d399' },
  { value: 'praise', label: 'Praise', icon: Heart, color: '#fb923c' },
  { value: 'other', label: 'Other', icon: HelpCircle, color: '#60a5fa' }
];

const STATUS_CONFIG = {
  new: { label: 'New', icon: Clock, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  reviewed: { label: 'Reviewed', icon: Eye, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  implemented: { label: 'Implemented', icon: CheckCircle2, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  dismissed: { label: 'Dismissed', icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
};

const CATEGORY_COLORS = {
  feature_request: '#a78bfa',
  bug: '#f87171',
  improvement: '#34d399',
  praise: '#fb923c',
  other: '#60a5fa'
};

// ─── Star Rating Component ───
const StarRating = ({ rating, setRating, interactive = true, size = 28 }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const isFilled = star <= (hovered || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            className="transition-all duration-200 focus:outline-none"
            style={{
              cursor: interactive ? 'pointer' : 'default',
              transform: isFilled ? 'scale(1.15)' : 'scale(1)',
              filter: isFilled ? 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))' : 'none'
            }}
          >
            <Star
              size={size}
              fill={isFilled ? '#fbbf24' : 'transparent'}
              stroke={isFilled ? '#fbbf24' : 'rgba(0, 240, 255, 0.3)'}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
      {interactive && rating > 0 && (
        <span className="ml-2 text-sm font-mono" style={{ color: '#fbbf24' }}>
          {rating}/5
        </span>
      )}
    </div>
  );
};

// ─── Mini Bar Chart (SVG) ───
const MiniBarChart = ({ data, maxVal, barColor = '#00f0ff', height = 120, barWidth = 32 }) => {
  if (!data || data.length === 0) return null;
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  const gap = 8;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <svg width={totalWidth} height={height + 24} className="mx-auto">
      {data.map((d, i) => {
        const barH = (d.value / max) * height;
        const x = i * (barWidth + gap);
        return (
          <g key={i}>
            <rect
              x={x}
              y={height - barH}
              width={barWidth}
              height={barH}
              rx={4}
              fill={d.color || barColor}
              opacity={0.85}
              style={{ filter: `drop-shadow(0 0 4px ${d.color || barColor})` }}
            >
              <animate
                attributeName="height"
                from="0"
                to={barH}
                dur="0.6s"
                fill="freeze"
              />
              <animate
                attributeName="y"
                from={height}
                to={height - barH}
                dur="0.6s"
                fill="freeze"
              />
            </rect>
            <text
              x={x + barWidth / 2}
              y={height - barH - 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {d.value}
            </text>
            <text
              x={x + barWidth / 2}
              y={height + 16}
              textAnchor="middle"
              fill="rgba(0, 240, 255, 0.6)"
              fontSize="10"
              fontFamily="monospace"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ─── Donut Chart (SVG) ───
const DonutChart = ({ data, size = 140 }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 22;
  const innerRadius = radius - strokeWidth / 2;
  let cumAngle = -90;

  return (
    <svg width={size} height={size}>
      {data.map((d, i) => {
        const angle = (d.value / total) * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const largeArc = angle > 180 ? 1 : 0;

        const x1 = cx + innerRadius * Math.cos(startRad);
        const y1 = cy + innerRadius * Math.sin(startRad);
        const x2 = cx + innerRadius * Math.cos(endRad);
        const y2 = cy + innerRadius * Math.sin(endRad);

        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.85}
            style={{ filter: `drop-shadow(0 0 3px ${d.color})` }}
          />
        );
      })}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="white"
        fontSize="20"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill="rgba(0,240,255,0.6)"
        fontSize="10"
        fontFamily="monospace"
      >
        total
      </text>
    </svg>
  );
};

// ─── Sentiment Gauge ───
const SentimentGauge = ({ positive = 0, neutral = 0, negative = 0 }) => {
  const total = positive + neutral + negative;
  if (total === 0) return null;
  const posW = (positive / total) * 100;
  const neuW = (neutral / total) * 100;
  const negW = (negative / total) * 100;

  return (
    <div>
      <div className="flex rounded-lg overflow-hidden h-5 mb-3" style={{ background: 'rgba(0,240,255,0.05)' }}>
        {posW > 0 && (
          <div
            className="h-full transition-all duration-700 flex items-center justify-center text-[9px] font-mono font-bold"
            style={{ width: `${posW}%`, background: 'linear-gradient(90deg, #34d399, #10b981)', color: '#fff' }}
          >
            {Math.round(posW)}%
          </div>
        )}
        {neuW > 0 && (
          <div
            className="h-full transition-all duration-700 flex items-center justify-center text-[9px] font-mono font-bold"
            style={{ width: `${neuW}%`, background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', color: '#fff' }}
          >
            {Math.round(neuW)}%
          </div>
        )}
        {negW > 0 && (
          <div
            className="h-full transition-all duration-700 flex items-center justify-center text-[9px] font-mono font-bold"
            style={{ width: `${negW}%`, background: 'linear-gradient(90deg, #f87171, #ef4444)', color: '#fff' }}
          >
            {Math.round(negW)}%
          </div>
        )}
      </div>
      <div className="flex justify-between text-[11px] font-mono">
        <span className="flex items-center gap-1" style={{ color: '#34d399' }}>
          <ThumbsUp size={12} /> Positive
        </span>
        <span className="flex items-center gap-1" style={{ color: '#60a5fa' }}>
          <Minus size={12} /> Neutral
        </span>
        <span className="flex items-center gap-1" style={{ color: '#f87171' }}>
          <ThumbsDown size={12} /> Negative
        </span>
      </div>
    </div>
  );
};

// ─── Skeleton Loader ───
const SkeletonCard = () => (
  <div className="rounded-xl p-5 animate-pulse" style={{ background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.08)' }}>
    <div className="h-4 rounded w-1/3 mb-3" style={{ background: 'rgba(0,240,255,0.08)' }} />
    <div className="h-3 rounded w-full mb-2" style={{ background: 'rgba(0,240,255,0.06)' }} />
    <div className="h-3 rounded w-2/3 mb-2" style={{ background: 'rgba(0,240,255,0.06)' }} />
    <div className="h-3 rounded w-1/2" style={{ background: 'rgba(0,240,255,0.06)' }} />
  </div>
);

// ─══════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────────────────
// ─══════════════════════════════════════════════════════════════════

const FeedbackCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('submit');

  // Submit form state
  const [formData, setFormData] = useState({
    featureName: '',
    rating: 0,
    comment: '',
    category: 'feature_request'
  });
  const [submitting, setSubmitting] = useState(false);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Dashboard state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [allFeedback, setAllFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Feature dropdown
  const [featureDropdownOpen, setFeatureDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setFeatureDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load stats & feedback when switching to dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
      loadAllFeedback();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getFeedbackStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadAllFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const res = await getAllFeedback({ limit: 50, sort: '-createdAt' });
      if (res.success) setAllFeedback(res.data);
    } catch (err) {
      console.error('Error loading feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // ─── Submit Handler ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.featureName) return toast.error('Please select a feature');
    if (formData.rating === 0) return toast.error('Please give a rating');
    if (!formData.comment.trim()) return toast.error('Please write a comment');

    setSubmitting(true);
    try {
      const res = await submitFeedback(formData);
      if (res.success) {
        toast.success('🎉 Feedback submitted! Thank you!');
        setFormData({ featureName: '', rating: 0, comment: '', category: 'feature_request' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── AI Summary Handler ───
  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await getFeedbackSummary();
      if (res.success) {
        setAiSummary(res.data);
        toast.success('AI summary generated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  // ─── Status Update Handler ───
  const handleStatusUpdate = async (feedbackId, newStatus) => {
    try {
      const res = await updateFeedbackStatus(feedbackId, newStatus);
      if (res.success) {
        toast.success(`Status updated to "${newStatus}"`);
        loadAllFeedback();
        loadStats();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // ─── Tab Config ───
  const tabs = [
    { id: 'submit', label: 'Give Feedback', icon: MessageSquare },
    { id: 'ai-summary', label: 'AI Summary', icon: Sparkles },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 }
  ];

  // ─── Card Styles ───
  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(2,4,15,0.95) 0%, rgba(5,10,36,0.9) 100%)',
    border: '1px solid rgba(0, 240, 255, 0.1)',
    borderRadius: '16px',
    backdropFilter: 'blur(12px)'
  };

  const glowBorderStyle = {
    ...cardStyle,
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.04), inset 0 1px 0 rgba(0, 240, 255, 0.06)'
  };

  return (
    <div className="min-h-screen" style={{ background: '#02040f' }}>
      {/* ─── Header ─── */}
      <div
        className="sticky top-0 z-50 px-6 py-4"
        style={{
          background: 'rgba(2, 4, 15, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0, 240, 255, 0.08)'
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(0, 240, 255, 0.06)',
                border: '1px solid rgba(0, 240, 255, 0.12)',
                color: '#00f0ff'
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #00f0ff, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Feedback Center
              </h1>
              <p className="text-xs font-mono" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>
                Help us build a better HackBuddy
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0, 240, 255, 0.04)', border: '1px solid rgba(0, 240, 255, 0.08)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                  style={{
                    background: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(0, 240, 255, 0.5)',
                    border: isActive ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid transparent',
                    boxShadow: isActive ? '0 0 12px rgba(0, 240, 255, 0.08)' : 'none'
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)' }} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ═══ TAB 1: SUBMIT FEEDBACK ═══ */}
        {activeTab === 'submit' && (
          <div className="max-w-2xl mx-auto">
            <div className="p-8" style={glowBorderStyle}>
              {/* Header */}
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(167,139,250,0.15))',
                    border: '1px solid rgba(0,240,255,0.15)',
                    boxShadow: '0 0 24px rgba(0,240,255,0.08)'
                  }}
                >
                  <MessageSquare size={24} style={{ color: '#00f0ff' }} />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Share Your Feedback</h2>
                <p className="text-sm font-mono" style={{ color: 'rgba(0,240,255,0.5)' }}>
                  Your voice shapes the future of HackBuddy
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Feature Selector */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'rgba(0,240,255,0.6)' }}>
                    Feature
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setFeatureDropdownOpen(!featureDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200"
                      style={{
                        background: 'rgba(0,240,255,0.04)',
                        border: '1px solid rgba(0,240,255,0.12)',
                        color: formData.featureName ? '#ffffff' : 'rgba(0,240,255,0.4)'
                      }}
                    >
                      <span>{formData.featureName || 'Select a feature...'}</span>
                      <ChevronDown size={16} style={{ color: 'rgba(0,240,255,0.4)', transform: featureDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {featureDropdownOpen && (
                      <div
                        className="absolute top-full left-0 right-0 mt-2 py-2 rounded-xl z-50 max-h-60 overflow-y-auto"
                        style={{
                          background: 'rgba(5,10,36,0.98)',
                          border: '1px solid rgba(0,240,255,0.15)',
                          backdropFilter: 'blur(20px)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                        }}
                      >
                        {FEATURES.map(feature => (
                          <button
                            key={feature}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, featureName: feature }));
                              setFeatureDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm transition-all duration-150"
                            style={{
                              color: formData.featureName === feature ? '#00f0ff' : 'rgba(255,255,255,0.7)',
                              background: formData.featureName === feature ? 'rgba(0,240,255,0.08)' : 'transparent'
                            }}
                            onMouseEnter={e => e.target.style.background = 'rgba(0,240,255,0.06)'}
                            onMouseLeave={e => e.target.style.background = formData.featureName === feature ? 'rgba(0,240,255,0.08)' : 'transparent'}
                          >
                            {feature}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'rgba(0,240,255,0.6)' }}>
                    Rating
                  </label>
                  <StarRating rating={formData.rating} setRating={(r) => setFormData(prev => ({ ...prev, rating: r }))} />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'rgba(0,240,255,0.6)' }}>
                    Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200"
                          style={{
                            background: isSelected ? `${cat.color}18` : 'rgba(0,240,255,0.03)',
                            border: `1px solid ${isSelected ? `${cat.color}40` : 'rgba(0,240,255,0.08)'}`,
                            color: isSelected ? cat.color : 'rgba(255,255,255,0.5)',
                            boxShadow: isSelected ? `0 0 12px ${cat.color}15` : 'none'
                          }}
                        >
                          <Icon size={14} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'rgba(0,240,255,0.6)' }}>
                    Your Feedback
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Tell us what's on your mind..."
                    rows={5}
                    maxLength={2000}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all duration-200 focus:outline-none"
                    style={{
                      background: 'rgba(0,240,255,0.04)',
                      border: '1px solid rgba(0,240,255,0.12)',
                      color: '#ffffff',
                      caretColor: '#00f0ff'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,240,255,0.3)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(0,240,255,0.12)'}
                  />
                  <div className="text-right text-[10px] font-mono mt-1" style={{ color: 'rgba(0,240,255,0.3)' }}>
                    {formData.comment.length}/2000
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,240,255,0.2), rgba(167,139,250,0.2))',
                    border: '1px solid rgba(0,240,255,0.25)',
                    color: '#ffffff',
                    boxShadow: '0 0 20px rgba(0,240,255,0.1)'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: AI SUMMARY ═══ */}
        {activeTab === 'ai-summary' && (
          <div className="space-y-6">
            {/* Generate Button */}
            <div className="text-center">
              <button
                onClick={handleGenerateSummary}
                disabled={loadingSummary}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(0,240,255,0.2))',
                  border: '1px solid rgba(167,139,250,0.3)',
                  color: '#ffffff',
                  boxShadow: '0 0 30px rgba(167,139,250,0.1), 0 0 60px rgba(0,240,255,0.05)'
                }}
              >
                {loadingSummary ? (
                  <>
                    <Loader2 size={20} className="animate-spin" style={{ color: '#a78bfa' }} />
                    <span>Analyzing feedback with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} style={{ color: '#a78bfa' }} />
                    <span>Generate AI Summary</span>
                  </>
                )}
              </button>
              <p className="text-xs font-mono mt-3" style={{ color: 'rgba(0,240,255,0.4)' }}>
                Powered by Gemini — analyzes all user feedback
              </p>
            </div>

            {/* Loading Skeletons */}
            {loadingSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            )}

            {/* AI Results */}
            {aiSummary && !loadingSummary && (
              <div className="space-y-6">
                {/* Overall Score & Sentiment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Overall Satisfaction */}
                  <div className="p-5" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <Award size={16} style={{ color: '#fbbf24' }} />
                      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.6)' }}>
                        Overall Satisfaction
                      </span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black font-mono" style={{ color: '#fbbf24', textShadow: '0 0 12px rgba(251,191,36,0.4)' }}>
                        {aiSummary.overallSatisfaction || 'N/A'}
                      </span>
                      <span className="text-sm font-mono mb-1" style={{ color: 'rgba(251,191,36,0.5)' }}>/5</span>
                    </div>
                    <StarRating rating={Math.round(aiSummary.overallSatisfaction || 0)} interactive={false} size={18} />
                  </div>

                  {/* Total Analyzed */}
                  <div className="p-5" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={16} style={{ color: '#00f0ff' }} />
                      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.6)' }}>
                        Total Analyzed
                      </span>
                    </div>
                    <span className="text-4xl font-black font-mono" style={{ color: '#00f0ff', textShadow: '0 0 12px rgba(0,240,255,0.4)' }}>
                      {aiSummary.totalAnalyzed || 0}
                    </span>
                    <p className="text-xs font-mono mt-1" style={{ color: 'rgba(0,240,255,0.4)' }}>feedback entries</p>
                  </div>

                  {/* Sentiment */}
                  <div className="p-5" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <PieChart size={16} style={{ color: '#34d399' }} />
                      <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.6)' }}>
                        Sentiment
                      </span>
                    </div>
                    <SentimentGauge
                      positive={aiSummary.sentimentBreakdown?.positive || 0}
                      neutral={aiSummary.sentimentBreakdown?.neutral || 0}
                      negative={aiSummary.sentimentBreakdown?.negative || 0}
                    />
                  </div>
                </div>

                {/* Top Requested Features */}
                <div className="p-6" style={glowBorderStyle}>
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp size={18} style={{ color: '#34d399' }} />
                    <h3 className="text-base font-bold text-white">Top Requested Features</h3>
                  </div>
                  {aiSummary.topRequestedFeatures?.length > 0 ? (
                    <div className="space-y-3">
                      {aiSummary.topRequestedFeatures.map((feat, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-4 rounded-xl transition-all duration-200"
                          style={{
                            background: 'rgba(52,211,153,0.04)',
                            border: '1px solid rgba(52,211,153,0.1)'
                          }}
                        >
                          <div
                            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black font-mono"
                            style={{
                              background: 'rgba(52,211,153,0.15)',
                              color: '#34d399',
                              textShadow: '0 0 8px rgba(52,211,153,0.5)'
                            }}
                          >
                            #{i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white text-sm">{feat.feature}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                                {feat.requestCount} requests
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{feat.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgba(0,240,255,0.4)' }}>No feature requests found.</p>
                  )}
                </div>

                {/* Common Complaints */}
                <div className="p-6" style={glowBorderStyle}>
                  <div className="flex items-center gap-2 mb-5">
                    <AlertTriangle size={18} style={{ color: '#f87171' }} />
                    <h3 className="text-base font-bold text-white">Common Complaints</h3>
                  </div>
                  {aiSummary.commonComplaints?.length > 0 ? (
                    <div className="space-y-3">
                      {aiSummary.commonComplaints.map((complaint, i) => {
                        const severityColors = { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' };
                        const sevColor = severityColors[complaint.severity] || '#60a5fa';
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-4 p-4 rounded-xl"
                            style={{
                              background: 'rgba(248,113,113,0.03)',
                              border: '1px solid rgba(248,113,113,0.1)'
                            }}
                          >
                            <div
                              className="shrink-0 w-2 h-2 rounded-full mt-2"
                              style={{ background: sevColor, boxShadow: `0 0 8px ${sevColor}` }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-white text-sm">{complaint.issue}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${sevColor}18`, color: sevColor }}>
                                  {complaint.severity}
                                </span>
                                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {complaint.mentionCount} mentions
                                </span>
                              </div>
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{complaint.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgba(0,240,255,0.4)' }}>No complaints found. 🎉</p>
                  )}
                </div>

                {/* Key Themes + Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Key Themes */}
                  <div className="p-6" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-4">
                      <Target size={16} style={{ color: '#60a5fa' }} />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Key Themes</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(aiSummary.keyThemes || []).map((theme, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono"
                          style={{
                            background: 'rgba(96,165,250,0.08)',
                            border: '1px solid rgba(96,165,250,0.15)',
                            color: '#60a5fa'
                          }}
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-6" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap size={16} style={{ color: '#fbbf24' }} />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recommendations</h3>
                    </div>
                    <div className="space-y-2">
                      {(aiSummary.recommendations || []).map((rec, i) => {
                        const prioColors = { high: '#f87171', medium: '#fbbf24', low: '#34d399' };
                        const pc = prioColors[rec.priority] || '#60a5fa';
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <span
                              className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded mt-0.5 uppercase"
                              style={{ background: `${pc}18`, color: pc, border: `1px solid ${pc}30` }}
                            >
                              {rec.priority}
                            </span>
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{rec.action}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!aiSummary && !loadingSummary && (
              <div className="text-center py-16">
                <Sparkles size={48} style={{ color: 'rgba(167,139,250,0.3)', margin: '0 auto 16px' }} />
                <p className="text-sm" style={{ color: 'rgba(0,240,255,0.4)' }}>
                  Click the button above to generate an AI-powered analysis of all feedback
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 3: DASHBOARD ═══ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            ) : stats ? (
              <>
                {/* Top Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Feedback */}
                  <div className="p-5" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={14} style={{ color: '#00f0ff' }} />
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.5)' }}>Total Feedback</span>
                    </div>
                    <span className="text-3xl font-black font-mono text-white">{stats.totalCount}</span>
                  </div>

                  {/* Avg Rating */}
                  <div className="p-5" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-2">
                      <Star size={14} style={{ color: '#fbbf24' }} />
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.5)' }}>Avg Rating</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black font-mono" style={{ color: '#fbbf24' }}>
                        {(stats.avgRating || 0).toFixed(1)}
                      </span>
                      <span className="text-sm font-mono mb-1" style={{ color: 'rgba(251,191,36,0.4)' }}>/5</span>
                    </div>
                  </div>

                  {/* Implemented Count */}
                  <div className="p-5" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.5)' }}>Implemented</span>
                    </div>
                    <span className="text-3xl font-black font-mono" style={{ color: '#34d399' }}>
                      {stats.implementedFeedback?.length || 0}
                    </span>
                  </div>

                  {/* Categories */}
                  <div className="p-5" style={glowBorderStyle}>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 size={14} style={{ color: '#a78bfa' }} />
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.5)' }}>Categories</span>
                    </div>
                    <span className="text-3xl font-black font-mono" style={{ color: '#a78bfa' }}>
                      {stats.categoryDistribution?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Rating Distribution */}
                  <div className="p-6" style={glowBorderStyle}>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-6">
                      <BarChart3 size={16} style={{ color: '#00f0ff' }} />
                      Rating Distribution
                    </h3>
                    <div className="flex justify-center">
                      <MiniBarChart
                        data={[1, 2, 3, 4, 5].map(r => {
                          const found = stats.ratingHistogram?.find(h => h.rating === r);
                          const starColors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#00f0ff'];
                          return { label: `${r}★`, value: found?.count || 0, color: starColors[r - 1] };
                        })}
                        height={100}
                      />
                    </div>
                  </div>

                  {/* Category Distribution */}
                  <div className="p-6" style={glowBorderStyle}>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-6">
                      <PieChart size={16} style={{ color: '#a78bfa' }} />
                      By Category
                    </h3>
                    <div className="flex items-center justify-around">
                      <DonutChart
                        data={(stats.categoryDistribution || []).map(c => ({
                          value: c.count,
                          color: CATEGORY_COLORS[c.category] || '#60a5fa'
                        }))}
                        size={130}
                      />
                      <div className="space-y-2">
                        {(stats.categoryDistribution || []).map(c => (
                          <div key={c.category} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c.category] || '#60a5fa' }} />
                            <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                              {CATEGORIES.find(cat => cat.value === c.category)?.label || c.category}
                            </span>
                            <span className="text-[10px] font-mono font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              ({c.count})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature Ratings */}
                <div className="p-6" style={glowBorderStyle}>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-5">
                    <Star size={16} style={{ color: '#fbbf24' }} />
                    Average Rating per Feature
                  </h3>
                  {(stats.featureRatings || []).length > 0 ? (
                    <div className="space-y-3">
                      {stats.featureRatings.map((feat, i) => {
                        const pct = (feat.avgRating / 5) * 100;
                        return (
                          <div key={i} className="flex items-center gap-4">
                            <span className="w-40 shrink-0 text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {feat.feature}
                            </span>
                            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,240,255,0.06)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 80 ? 'linear-gradient(90deg, #34d399, #00f0ff)' :
                                             pct >= 60 ? 'linear-gradient(90deg, #fbbf24, #fb923c)' :
                                             'linear-gradient(90deg, #f87171, #fb923c)',
                                  boxShadow: `0 0 6px ${pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171'}40`
                                }}
                              />
                            </div>
                            <span className="w-12 text-right text-xs font-mono font-bold" style={{ color: '#fbbf24' }}>
                              {feat.avgRating}
                            </span>
                            <span className="w-12 text-right text-[10px] font-mono" style={{ color: 'rgba(0,240,255,0.4)' }}>
                              ({feat.count})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgba(0,240,255,0.4)' }}>No feature ratings yet.</p>
                  )}
                </div>



                {/* Recent Feedback Timeline */}
                <div className="p-6" style={glowBorderStyle}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <Clock size={16} style={{ color: '#60a5fa' }} />
                      Recent Feedback
                    </h3>
                    <button
                      onClick={() => { loadStats(); loadAllFeedback(); }}
                      className="flex items-center gap-1 text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all duration-200"
                      style={{
                        background: 'rgba(0,240,255,0.06)',
                        border: '1px solid rgba(0,240,255,0.12)',
                        color: '#00f0ff'
                      }}
                    >
                      <RefreshCw size={10} /> Refresh
                    </button>
                  </div>

                  {loadingFeedback ? (
                    <div className="space-y-3">
                      <SkeletonCard /><SkeletonCard />
                    </div>
                  ) : allFeedback.length > 0 ? (
                    <div className="space-y-3">
                      {allFeedback.slice(0, 15).map((fb, i) => {
                        const statusCfg = STATUS_CONFIG[fb.status] || STATUS_CONFIG.new;
                        const StatusIcon = statusCfg.icon;
                        const catObj = CATEGORIES.find(c => c.value === fb.category);
                        const CatIcon = catObj?.icon || HelpCircle;
                        return (
                          <div
                            key={fb._id || i}
                            className="flex items-start gap-3 p-4 rounded-xl transition-all duration-200"
                            style={{
                              background: 'rgba(0,240,255,0.02)',
                              border: '1px solid rgba(0,240,255,0.06)'
                            }}
                          >
                            {/* Category Icon */}
                            <div
                              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{
                                background: `${catObj?.color || '#60a5fa'}12`,
                                border: `1px solid ${catObj?.color || '#60a5fa'}20`
                              }}
                            >
                              <CatIcon size={14} style={{ color: catObj?.color || '#60a5fa' }} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-semibold text-white">{fb.featureName}</span>
                                <StarRating rating={fb.rating} interactive={false} size={11} />
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full"
                                  style={{ background: statusCfg.bg, color: statusCfg.color }}
                                >
                                  <StatusIcon size={9} />
                                  {statusCfg.label}
                                </span>
                              </div>
                              <p className="text-xs mb-1.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {fb.comment}
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono" style={{ color: 'rgba(0,240,255,0.3)' }}>
                                  {fb.userId?.name || 'Anonymous'} · {new Date(fb.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare size={32} style={{ color: 'rgba(0,240,255,0.2)', margin: '0 auto 8px' }} />
                      <p className="text-xs" style={{ color: 'rgba(0,240,255,0.4)' }}>
                        No feedback submitted yet. Be the first!
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <BarChart3 size={48} style={{ color: 'rgba(0,240,255,0.2)', margin: '0 auto 16px' }} />
                <p className="text-sm" style={{ color: 'rgba(0,240,255,0.4)' }}>
                  Loading dashboard data...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackCenter;
