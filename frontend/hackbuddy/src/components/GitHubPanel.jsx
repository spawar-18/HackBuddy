import React, { useState, useEffect, useCallback } from 'react';
import {
  GitMerge, GitBranch, GitCommitHorizontal, GitPullRequest, AlertCircle, Users,
  RefreshCw, Link2, Link2Off, Sparkles, Activity, Code2, BookOpen,
  TestTube, Rocket, AlertTriangle, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, ExternalLink, Shield, Zap, Eye, Lock,
  BarChart3, TrendingUp, CircleDot
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  connectGitHubRepository,
  disconnectGitHubRepository,
  getRepositoryAnalytics,
  manualSyncRepository,
  triggerGitHubAIAnalysis
} from '../services/projectService';
import UpgradeGate from './UpgradeGate';

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color = 'text-neutral-400', sub }) => (
  <div 
    className="flex flex-col gap-1.5 p-3.5 rounded-xl border shadow-3xs"
    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
  >
    <div className="flex items-center gap-1.5 text-neutral-500">
      <Icon size={13} className={color} />
      <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{label}</div>
    </div>
    <div className={`text-xl font-extrabold font-mono leading-none ${color}`}>{value}</div>
    {sub && <div className="text-[9px] font-medium text-neutral-500">{sub}</div>}
  </div>
);

const HealthBadge = ({ status, score }) => {
  const styles = {
    'Excellent': { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
    'Healthy': { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
    'Needs Attention': { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
    'Critical': { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
    'Unknown': { bg: 'rgba(156, 163, 175, 0.08)', border: 'rgba(156, 163, 175, 0.3)', text: '#9ca3af' }
  };
  const icons = {
    'Excellent': <CheckCircle2 size={12} className="text-emerald-400" />,
    'Healthy': <Shield size={12} className="text-blue-400" />,
    'Needs Attention': <AlertTriangle size={12} className="text-amber-400" />,
    'Critical': <XCircle size={12} className="text-red-400 animate-pulse" />,
    'Unknown': <CircleDot size={12} className="text-neutral-400" />
  };
  const config = styles[status] || styles['Unknown'];
  const icon = icons[status] || icons['Unknown'];
  
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status === 'Critical' ? 'animate-pulse' : ''}`}
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
        color: config.text
      }}
    >
      {icon}
      <span>{status} {score !== undefined && `(${score}/100)`}</span>
    </div>
  );
};

const VerdictBadge = ({ verdict }) => {
  const map = {
    'Verified':    { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399', icon: <CheckCircle2 size={10} className="text-emerald-400 shrink-0" /> },
    'Warning':     { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24', icon: <AlertTriangle size={10} className="text-amber-400 shrink-0" /> },
    'Active':      { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa', icon: <Activity size={10} className="text-blue-400 shrink-0" /> },
    'No Activity': { bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.3)', text: '#ff781f', icon: <AlertCircle size={10} className="text-orange-400 shrink-0" /> },
    'Not Started': { bg: 'rgba(156, 163, 175, 0.08)', border: 'rgba(156, 163, 175, 0.3)', text: '#9ca3af', icon: <CircleDot size={10} className="text-neutral-400 shrink-0" /> },
    'Ahead':       { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.3)', text: '#c084fc', icon: <TrendingUp size={10} className="text-purple-400 shrink-0" /> },
    'No Data':     { bg: 'rgba(156, 163, 175, 0.08)', border: 'rgba(156, 163, 175, 0.3)', text: '#9ca3af', icon: <CircleDot size={10} className="text-neutral-400 shrink-0" /> }
  };
  const config = map[verdict] || map['No Data'];
  return (
    <div 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
        color: config.text
      }}
    >
      {config.icon}
      <span>{verdict}</span>
    </div>
  );
};

// ─── Connect Form ─────────────────────────────────────────────────────────────

const ConnectForm = ({ projectId, isOwner, onConnected }) => {
  const [form, setForm] = useState({ owner: '', repository: '', defaultBranch: 'main', repositoryUrl: '' });
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.owner.trim() || !form.repository.trim()) {
      toast.error('Owner and repository name are required');
      return;
    }
    try {
      setLoading(true);
      const res = await connectGitHubRepository(projectId, form);
      if (res.success) {
        toast.success('Repository connected! Initial sync in progress...');
        onConnected();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect repository');
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center border border-neutral-200">
          <Lock size={24} className="text-neutral-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-700">Repository Not Connected</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">Only the Team Owner can connect a GitHub repository.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="form-group">
          <label className="input-label">Repository Owner *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. octocat"
            value={form.owner}
            onChange={e => setForm({ ...form, owner: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label className="input-label">Repository Name *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. my-hackathon-project"
            value={form.repository}
            onChange={e => setForm({ ...form, repository: e.target.value })}
            required
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-800 font-semibold self-start"
      >
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Advanced Settings
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="form-group">
            <label className="input-label">Default Branch</label>
            <input
              type="text"
              className="form-input"
              placeholder="main"
              value={form.defaultBranch}
              onChange={e => setForm({ ...form, defaultBranch: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="input-label">Repository URL (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://github.com/..."
              value={form.repositoryUrl}
              onChange={e => setForm({ ...form, repositoryUrl: e.target.value })}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary cursor-pointer py-2 shadow-xs self-start flex items-center gap-2"
        id="github-connect-btn"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Link2 size={14} />}
        <span>{loading ? 'Connecting...' : 'Connect Repository'}</span>
      </button>
    </form>
  );
};

// ─── Language Bar ─────────────────────────────────────────────────────────────

const LanguageBar = ({ languages }) => {
  const entries = Object.entries(languages || {});
  if (entries.length === 0) return <div className="text-xs italic text-neutral-500">No language data</div>;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500'];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {entries.map(([lang, bytes], i) => (
          <div
            key={lang}
            className={`${colors[i % colors.length]} transition-all`}
            style={{ width: `${(bytes / total * 100).toFixed(1)}%` }}
            title={`${lang}: ${(bytes / total * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.slice(0, 7).map(([lang, bytes], i) => (
          <div key={lang} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
            <div className="text-[9px] font-semibold text-neutral-600">{lang} {(bytes / total * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const GitHubPanel = ({ projectId, isOwner, initialTab }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchAnalytics = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await getRepositoryAnalytics(projectId);
      setAnalytics(res);
      if (res.connected) setShowConnectForm(false);
    } catch (err) {
      if (err?.response?.status === 403) {
        setBlocked(true);
      } else {
        console.error('GitHub analytics error:', err);
        if (!quiet) toast.error('Failed to load GitHub analytics');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleManualSync = async () => {
    try {
      setSyncLoading(true);
      await manualSyncRepository(projectId);
      toast.success('Repository synced successfully!');
      await fetchAnalytics(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      toast.loading('Running AI analysis...', { id: 'github-ai' });
      const res = await triggerGitHubAIAnalysis(projectId);
      if (res.success) {
        toast.success('AI analysis complete!', { id: 'github-ai' });
        await fetchAnalytics(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI analysis failed', { id: 'github-ai' });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect this repository? Sync data will be preserved.')) return;
    try {
      setDisconnectLoading(true);
      await disconnectGitHubRepository(projectId);
      toast.success('Repository disconnected');
      setAnalytics(null);
      setShowConnectForm(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect');
    } finally {
      setDisconnectLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-20 gap-3 border rounded-2xl shadow-xs"
        style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
      >
        <RefreshCw size={28} className="animate-spin text-brand-500" />
        <div className="text-xs font-semibold text-neutral-500">Loading GitHub analytics...</div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="border rounded-2xl shadow-xs" style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}>
        <UpgradeGate
          feature="GitHub Intelligence"
          requiredPlan="PRO"
          description="GitHub Intelligence is a Pro feature. Connect your repository and unlock AI-powered commit analytics, health scoring, and reality checks."
        />
      </div>
    );
  }

  // Not Connected State
  if (!analytics?.connected) {
    return (
      <div 
        className="border rounded-2xl shadow-xs overflow-hidden animate-slide-up"
        style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            background: 'linear-gradient(to right, var(--color-neutral-100), var(--color-neutral-200))',
            borderColor: 'var(--color-neutral-200)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'var(--color-neutral-200)' }}
            >
              <GitMerge size={18} className="text-neutral-800" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest block text-neutral-500">Repository Integration</div>
              <div className="text-sm font-bold leading-tight text-neutral-800">GitHub Copilot</div>
            </div>
          </div>
          <div 
            className="px-2.5 py-1 rounded-full text-[9px] font-bold border"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'var(--color-neutral-200)',
              color: 'var(--color-neutral-600)'
            }}
          >
            Not Connected
          </div>
        </div>

        <div className="p-6">
          {/* Feature preview */}
          <div 
            className="border rounded-xl p-5 mb-6"
            style={{
              background: 'linear-gradient(to bottom right, rgba(0, 240, 255, 0.03), rgba(168, 85, 247, 0.03))',
              borderColor: 'var(--color-neutral-200)'
            }}
          >
            <div className="text-xs font-bold mb-3 flex items-center gap-2 text-neutral-800">
              <Sparkles size={14} className="text-brand-500" />
              Connect GitHub to unlock AI-powered insights
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: GitCommitHorizontal, label: 'Live commit tracking' },
                { icon: Activity, label: 'Development velocity' },
                { icon: Users, label: 'Contributor analytics' },
                { icon: Shield, label: 'Repository health score' },
                { icon: Zap, label: 'AI reality checks' },
                { icon: GitBranch, label: 'Branch activity' }
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-neutral-500">
                  <Icon size={12} className="text-brand-500 shrink-0" />
                  <div>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect form */}
          {(isOwner || showConnectForm) ? (
            <ConnectForm projectId={projectId} isOwner={isOwner} onConnected={() => fetchAnalytics()} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <Lock size={28} className="text-neutral-500" />
              <div className="text-xs text-neutral-500">Ask the Team Owner to connect a GitHub repository.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const a = analytics;
  const stats = a.stats || {};
  const aiAnalysis = a.aiAnalysis;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'commits', label: 'Commits', icon: GitCommitHorizontal },
    { id: 'contributors', label: 'Contributors', icon: Users },
    { id: 'ai', label: 'AI Analysis', icon: Sparkles }
  ];

  return (
    <div 
      className="border rounded-2xl shadow-xs overflow-hidden animate-slide-up"
      style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
    >
      {/* ── Header ── */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b gap-3"
        style={{
          background: 'linear-gradient(to right, var(--color-neutral-100), var(--color-neutral-200))',
          borderColor: 'var(--color-neutral-200)'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'var(--color-neutral-200)' }}
          >
            <GitMerge size={18} className="text-neutral-800" />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest block text-neutral-500">GitHub Repository</div>
            <div className="text-sm font-bold leading-tight flex items-center gap-2 text-neutral-800">
              <a
                href={a.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-300 transition-colors flex items-center gap-1 text-neutral-800"
              >
                {a.owner}/{a.repository}
                <ExternalLink size={11} className="opacity-70 text-cyan-400" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <HealthBadge status={a.healthStatus || 'Unknown'} score={a.healthScore} />

          {isOwner && (
            <>
              <button
                id="github-sync-btn"
                onClick={handleManualSync}
                disabled={syncLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-semibold rounded-xl border border-neutral-300 cursor-pointer transition-all"
              >
                <RefreshCw size={12} className={syncLoading ? 'animate-spin text-neutral-800' : 'text-neutral-800'} />
                <span className="hidden sm:inline text-neutral-800">Sync</span>
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnectLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-xl border border-red-500/30 cursor-pointer transition-all"
              >
                <Link2Off size={12} className="text-red-500" />
                <span className="hidden sm:inline text-red-500">Disconnect</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Last synced banner */}
      <div 
        className="px-5 py-2 text-[9px] font-mono flex items-center justify-between border-b"
        style={{
          backgroundColor: 'var(--color-brand-100)',
          borderColor: 'var(--color-neutral-200)'
        }}
      >
        <div style={{ color: 'var(--color-neutral-500)' }}>Branch: <span style={{ color: 'var(--color-neutral-800)' }}>{a.defaultBranch}</span></div>
        <div style={{ color: 'var(--color-neutral-500)' }}>Last synced: <span style={{ color: 'var(--color-neutral-800)' }}>{a.lastSyncedAt ? new Date(a.lastSyncedAt).toLocaleTimeString() : 'Never'}</span></div>
        <div style={{ color: 'var(--color-neutral-500)' }}>Visibility: <span style={{ color: 'var(--color-neutral-800)' }} className="capitalize">{a.repositoryVisibility || 'unknown'}</span></div>
      </div>

      {/* Repository Alerts */}
      {a.repositoryAlerts && a.repositoryAlerts.length > 0 && (
        <div className="px-5 pt-4 flex flex-col gap-2">
          {a.repositoryAlerts.map((alert, i) => {
            const isHigh = alert.severity === 'High';
            return (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl text-xs border"
                style={{
                  backgroundColor: isHigh ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  borderColor: isHigh ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'
                }}
              >
                <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: isHigh ? '#f87171' : '#fbbf24' }} />
                <div className="font-semibold" style={{ color: isHigh ? '#f87171' : '#fbbf24' }}>
                  {alert.message}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div 
        className="flex gap-1 border-b px-4 pt-4 overflow-x-auto"
        style={{ borderColor: 'var(--tab-border-color, rgba(0, 240, 255, 0.15))' }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap border-t border-x rounded-t-xl"
              style={{
                backgroundColor: isActive ? 'var(--tab-active-bg, rgba(0, 240, 255, 0.08))' : 'transparent',
                borderColor: isActive ? 'var(--tab-active-border, rgba(0, 240, 255, 0.3))' : 'transparent',
                color: isActive ? 'var(--tab-active-text, #ffffff)' : 'var(--tab-inactive-text, rgba(0, 240, 255, 0.55))',
                borderBottom: isActive ? '1px solid var(--tab-active-bottom-border, #040817)' : '1px solid transparent',
                marginBottom: '-1px',
                zIndex: isActive ? 10 : 1
              }}
            >
              <tab.icon size={13} style={{ color: isActive ? 'var(--tab-active-icon, #00f0ff)' : 'var(--tab-inactive-icon, rgba(0, 240, 255, 0.45))' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-5">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5">
            {/* Quick stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={GitCommitHorizontal}
                label="Commits Today"
                value={stats.commitsToday ?? '—'}
                color="text-brand-400"
              />
              <StatCard
                icon={Users}
                label="Contributors"
                value={stats.contributorCount ?? '—'}
                color="text-purple-400"
              />
              <StatCard
                icon={GitPullRequest}
                label="Open PRs"
                value={stats.openPRCount ?? '—'}
                color="text-emerald-400"
              />
              <StatCard
                icon={AlertCircle}
                label="Open Issues"
                value={stats.openIssueCount ?? '—'}
                color="text-orange-400"
              />
            </div>

            {/* Commit info + languages in a row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Last commit */}
              <div 
                className="flex flex-col gap-3 p-4 border rounded-xl"
                style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
              >
                <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-neutral-500">
                  <GitCommitHorizontal size={11} className="text-brand-300" /> Last Commit
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-semibold leading-snug line-clamp-2 text-neutral-800">
                    {a.commitSummary?.lastCommitMessage || 'No commits yet'}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    by <span className="font-semibold text-neutral-800">{a.commitSummary?.lastCommitAuthor || '—'}</span>
                    {a.commitSummary?.lastCommitAt && ` · ${new Date(a.commitSummary.lastCommitAt).toLocaleString()}`}
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-neutral-500">
                  <span className="font-semibold">{a.commitSummary?.last7Days || 0} commits last 7 days</span>
                  <span>·</span>
                  <span className="font-semibold">{stats.branchCount || 0} branches</span>
                </div>
              </div>

              {/* Languages */}
              <div 
                className="flex flex-col gap-3 p-4 border rounded-xl"
                style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
              >
                <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-neutral-500">
                  <Code2 size={11} className="text-purple-500" /> Languages
                </div>
                <LanguageBar languages={a.languages} />
              </div>
            </div>

            {/* Health Indicators */}
            <div 
              className="flex flex-col gap-3 p-4 border rounded-xl"
              style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
            >
              <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-neutral-500">
                <Shield size={11} className="text-brand-300" /> Health Indicators
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(a.healthIndicators || {}).map(([key, value]) => {
                  const isGood = value && !String(value).toLowerCase().includes('missing') && !String(value).toLowerCase().includes('no ') && !String(value).toLowerCase().includes('none');
                  return (
                    <div 
                      key={key} 
                      className="flex items-start gap-2 p-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: isGood ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        borderColor: isGood ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'
                      }}
                    >
                      {isGood ? (
                        <CheckCircle2 size={12} className="shrink-0 mt-0.5 text-emerald-500" />
                      ) : (
                        <XCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                      )}
                      <div className={`font-medium ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Open PRs / Issues */}
            {(a.openPullRequests?.length > 0 || a.openIssues?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {a.openPullRequests?.length > 0 && (
                  <div 
                    className="flex flex-col gap-2 p-4 border rounded-xl"
                    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-neutral-500">
                      <GitPullRequest size={11} className="text-emerald-500" /> Open Pull Requests ({a.openPullRequests.length})
                    </div>
                    {a.openPullRequests.slice(0, 5).map(pr => (
                      <a 
                        key={pr.number} 
                        href={pr.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs hover:text-brand-300 transition-colors text-neutral-800"
                      >
                        <GitPullRequest size={11} className="text-emerald-500 shrink-0" />
                        <span className="truncate">#{pr.number} {pr.title}</span>
                      </a>
                    ))}
                  </div>
                )}
                {a.openIssues?.length > 0 && (
                  <div 
                    className="flex flex-col gap-2 p-4 border rounded-xl"
                    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-neutral-500">
                      <AlertCircle size={11} className="text-orange-500" /> Open Issues ({a.openIssues.length})
                    </div>
                    {a.openIssues.slice(0, 5).map(issue => (
                      <a 
                        key={issue.number} 
                        href={issue.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs hover:text-brand-300 transition-colors text-neutral-800"
                      >
                        <AlertCircle size={11} className="text-orange-500 shrink-0" />
                        <span className="truncate">#{issue.number} {issue.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── COMMITS TAB ── */}
        {activeTab === 'commits' && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-neutral-800">Recent Commits</div>
              <div className="text-[9px] font-semibold text-neutral-500">{a.recentCommits?.length || 0} shown</div>
            </div>
            {!a.recentCommits || a.recentCommits.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-500">No commits found in repository.</div>
            ) : (
              <div 
                className="flex flex-col gap-0 border rounded-xl overflow-hidden divide-y"
                style={{ borderColor: 'var(--color-neutral-200)', divideColor: 'var(--color-neutral-200)' }}
              >
                {a.recentCommits.map((commit, i) => (
                  <div 
                    key={commit.sha || i} 
                    className="flex items-start gap-3 p-3 transition-colors hover:bg-neutral-100/5"
                  >
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center border shrink-0 mt-0.5"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'var(--color-neutral-200)' }}
                    >
                      <GitCommitHorizontal size={10} className="text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate text-neutral-800">{commit.message}</div>
                      <div className="text-[10px] mt-0.5 text-neutral-500">
                        <span className="font-semibold text-neutral-600">{commit.author}</span>
                        {commit.date && ` · ${new Date(commit.date).toLocaleDateString()}`}
                        {commit.sha && (
                          <a 
                            href={commit.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 font-mono hover:underline text-brand-300"
                          >
                            {commit.sha.substring(0, 7)}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONTRIBUTORS TAB ── */}
        {activeTab === 'contributors' && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <div className="text-xs font-bold text-neutral-800">Contributor Activity</div>
            {!a.contributors || a.contributors.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-500">No contributor data available.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {a.contributors.map((c, i) => {
                  const isActive = c.isActive;
                  return (
                    <div 
                      key={c.login || i} 
                      className="flex items-center gap-3 p-3.5 rounded-xl border"
                      style={{
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.04)' : 'var(--color-neutral-100)',
                        borderColor: isActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--color-neutral-200)'
                      }}
                    >
                      {c.avatar ? (
                        <img 
                          src={c.avatar} 
                          alt={c.login} 
                          className="w-9 h-9 rounded-full shrink-0 border" 
                          style={{ borderColor: 'var(--color-neutral-200)' }}
                        />
                      ) : (
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'var(--color-neutral-200)' }}
                        >
                          <Users size={16} className="text-neutral-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a 
                            href={c.profileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold truncate hover:text-brand-300 transition-colors text-neutral-800"
                          >
                            {c.login}
                          </a>
                          {isActive && (
                            <div 
                              className="px-1.5 py-0.5 rounded-full text-[8px] font-bold border shrink-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                            >
                              Active
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-neutral-500">
                          <span className="font-semibold">{c.commits} commits</span>
                          {c.recentCommits > 0 && (
                            <span className="font-semibold text-emerald-650">
                              +{c.recentCommits} today
                            </span>
                          )}
                        </div>
                        {c.lastActive && (
                          <div className="text-[9px] mt-0.5 text-neutral-500">
                            Last active: {new Date(c.lastActive).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AI ANALYSIS TAB ── */}
        {activeTab === 'ai' && (
          <div className="flex flex-col gap-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-neutral-800">AI Repository Intelligence</div>
                {a.aiAnalysisGeneratedAt && (
                  <div className="text-[9px] mt-0.5 text-neutral-500">
                    Generated: {new Date(a.aiAnalysisGeneratedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                id="github-ai-analyze-btn"
                onClick={handleAIAnalysis}
                disabled={analysisLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
              >
                {analysisLoading ? <RefreshCw size={12} className="animate-spin text-white" /> : <Sparkles size={12} className="text-white" />}
                <span className="text-white">{aiAnalysis ? 'Re-Analyze' : 'Run Analysis'}</span>
              </button>
            </div>

            {!aiAnalysis ? (
              <div 
                className="flex flex-col items-center justify-center py-12 gap-4 text-center border rounded-xl"
                style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
              >
                <Sparkles size={28} className="text-brand-500" />
                <div>
                  <div className="text-xs font-bold text-neutral-800">No AI Analysis Yet</div>
                  <div className="text-[11px] mt-1 max-w-xs text-neutral-500">
                    Run the AI analysis to get deep repository insights, detect risks, and compare planned vs actual work.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">

                {/* Health + Status + Strongest Contributor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div 
                    className="p-4 border rounded-xl flex flex-col justify-between"
                    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest block mb-2 text-neutral-500">Repository Health</div>
                    <HealthBadge status={aiAnalysis.repositoryHealth} />
                  </div>
                  <div 
                    className="p-4 border rounded-xl flex flex-col justify-between"
                    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest block mb-2 text-neutral-500">Development Status</div>
                    <div className="text-xs font-black text-neutral-800">{aiAnalysis.developmentStatus || '—'}</div>
                  </div>
                  <div 
                    className="p-4 border rounded-xl flex flex-col justify-between"
                    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest block mb-2 text-neutral-500">Strongest Contributor</div>
                    <div className="text-xs font-black" style={{ color: 'var(--color-brand-300)' }}>{aiAnalysis.strongestContributor || 'None Detected'}</div>
                  </div>
                </div>

                {/* Executive Summary */}
                {aiAnalysis.executiveSummary && (
                  <div 
                    className="p-4 border rounded-xl"
                    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 text-neutral-500">
                      <Sparkles size={11} className="text-brand-300" /> Executive Summary
                    </div>
                    <div className="text-xs leading-relaxed text-neutral-800">{aiAnalysis.executiveSummary}</div>
                  </div>
                )}

                {/* Repository Summary */}
                {aiAnalysis.repositorySummary && (
                  <div 
                    className="p-4 border rounded-xl"
                    style={{ backgroundColor: 'var(--color-neutral-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 text-neutral-500">
                      <BookOpen size={11} className="text-blue-500" /> Repository Summary
                    </div>
                    <div className="text-xs leading-relaxed text-neutral-800">{aiAnalysis.repositorySummary}</div>
                  </div>
                )}

                {/* Top Risks */}
                {aiAnalysis.topRisks?.length > 0 && (
                  <div 
                    className="p-4 border rounded-xl"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 text-red-500">
                      <AlertTriangle size={11} className="text-red-500" /> Top Risks Detected
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {aiAnalysis.topRisks.map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-red-600 leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5"></span>
                          <div>{risk}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Repository Bottlenecks */}
                {aiAnalysis.repositoryBottlenecks?.length > 0 && (
                  <div 
                    className="p-4 border rounded-xl"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 text-amber-600">
                      <AlertTriangle size={11} className="text-amber-500" /> Repository Bottlenecks
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {aiAnalysis.repositoryBottlenecks.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-amber-700 leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5"></span>
                          <div>{b}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Recommended Action */}
                {aiAnalysis.nextRecommendedAction && (
                  <div 
                    className="p-4 border rounded-xl"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 text-emerald-600">
                      <Rocket size={11} className="text-emerald-500" /> Next Recommended Action
                    </div>
                    <div className="text-xs font-semibold leading-relaxed text-emerald-800">{aiAnalysis.nextRecommendedAction}</div>
                  </div>
                )}

                {/* Improvement Suggestions */}
                {aiAnalysis.improvementSuggestions?.length > 0 && (
                  <div 
                    className="p-4 border rounded-xl"
                    style={{ backgroundColor: 'var(--color-brand-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-brand-300">
                      <Zap size={11} className="text-brand-300" /> Improvement Suggestions
                    </div>
                    <ul className="flex flex-col gap-2">
                      {aiAnalysis.improvementSuggestions.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs leading-snug text-neutral-800">
                          <Zap size={11} className="shrink-0 mt-0.5 text-brand-500" />
                          <div>{s}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fallback: legacy recommendations */}
                {!aiAnalysis.improvementSuggestions?.length && aiAnalysis.recommendations?.length > 0 && (
                  <div 
                    className="p-4 border rounded-xl"
                    style={{ backgroundColor: 'var(--color-brand-100)', borderColor: 'var(--color-neutral-200)' }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-brand-300">
                      <Zap size={11} className="text-brand-300" /> AI Recommendations
                    </div>
                    <ul className="flex flex-col gap-2">
                      {aiAnalysis.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-snug text-neutral-800">
                          <Zap size={11} className="shrink-0 mt-0.5 text-brand-500" />
                          <div>{r}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
};

export default GitHubPanel;
