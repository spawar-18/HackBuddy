import React, { useState, useEffect } from 'react';
import { analyzeTeam, getTeamAnalysis, regenerateTeamAnalysis } from '../services/teamService';
import { toast } from 'react-hot-toast';
import { 
  Brain, Sparkles, RefreshCw, AlertTriangle, CheckCircle, 
  ArrowRight, ListTodo, Gauge, Clock, Milestone
} from 'lucide-react';

const TeamAnalysis = ({ teamId }) => {
  const [analysis, setAnalysis] = useState(null);
  const [analysisGeneratedAt, setAnalysisGeneratedAt] = useState(null);
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Checking cache...');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getTeamAnalysis(teamId);
        if (res.success && res.analysis) {
          setAnalysis(res.analysis);
          setAnalysisGeneratedAt(res.analysisGeneratedAt);
          setAnalysisVersion(res.analysisVersion || 0);
        }
      } catch (err) {
        console.error('Failed to load cached analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) {
      fetchAnalysis();
    }
  }, [teamId]);

  const handleGenerate = async () => {
    setActionLoading(true);
    setLoadingText('Generating Analysis...');
    setError('');
    try {
      const res = await analyzeTeam(teamId);
      if (res.success && res.analysis) {
        setAnalysis(res.analysis);
        setAnalysisGeneratedAt(res.analysisGeneratedAt);
        setAnalysisVersion(res.analysisVersion || 0);
        toast.success('Analysis generated successfully.');
      } else {
        throw new Error('Invalid response structure from server.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to generate AI analysis.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setActionLoading(true);
    setLoadingText('Regenerating Analysis...');
    setError('');
    try {
      const res = await regenerateTeamAnalysis(teamId);
      if (res.success && res.analysis) {
        setAnalysis(res.analysis);
        setAnalysisGeneratedAt(res.analysisGeneratedAt);
        setAnalysisVersion(res.analysisVersion || 0);
        toast.success('Analysis regenerated successfully.');
      } else {
        throw new Error('Invalid response structure from server.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to regenerate AI analysis.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between pb-3" style={{borderBottom:'1px solid var(--border-color)'}}>
        <div className="flex items-center gap-3">
          <div className="icon-box w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase" style={{color:'var(--text-muted)'}}>AI Team Analysis</h2>
            <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>Skill gaps & recommended roles report</p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-alert">
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <strong className="block text-xs font-bold text-red-900 mb-0.5">Analysis Generation Failed</strong>
            <span className="text-xs">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State / Action Loading / Empty State / Results */}
      {loading ? (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-4 w-full">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-xs" style={{background:'var(--tab-active-bg)',color:'var(--text-accent)'}}>
            <RefreshCw className="animate-spin" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{color:'var(--text-heading)'}}>Checking Analysis...</h3>
            <p className="text-xs mt-1 max-w-[280px] mx-auto leading-relaxed" style={{color:'var(--text-muted)'}}>
              Checking for cached team assessment reports.
            </p>
          </div>
        </div>
      ) : actionLoading ? (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-4 w-full animate-pulse">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-xs" style={{background:'var(--tab-active-bg)',color:'var(--text-accent)'}}>
            <RefreshCw className="animate-spin" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{color:'var(--text-heading)'}}>{loadingText}</h3>
            <p className="text-xs mt-1 max-w-[280px] mx-auto leading-relaxed" style={{color:'var(--text-muted)'}}>
              AI Copilot is executing skill assessment mapping. Please hold on.
            </p>
          </div>
          <button className="btn-primary w-full" disabled>
            <RefreshCw className="animate-spin" size={14} />
            {loadingText}
          </button>
        </div>
      ) : !analysis ? (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-4 w-full">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-xs" style={{background:'var(--tab-active-bg)',color:'var(--text-accent)'}}>
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{color:'var(--text-heading)'}}>Generate Skill Assessment</h3>
            <p className="text-xs mt-1 max-w-[300px] mx-auto leading-relaxed" style={{color:'var(--text-muted)'}}>
              Analyze your squad's technical profile to receive role recommendation mappings and success strategies.
            </p>
          </div>
          <button 
            className="btn-primary w-full" 
            onClick={handleGenerate}
            disabled={actionLoading}
          >
            <Brain size={15} />
            Generate Analysis
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-slide-up">
          {/* 1. Readiness Score */}
          <div className="rounded-xl p-4 flex flex-col gap-2" style={{background:'var(--bg-input)',border:'1px solid var(--border-color)'}}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-1.5" style={{color:'var(--text-muted)'}}>
                <Gauge size={14} style={{color:'var(--text-accent)'}} />
                Team Readiness Score
              </span>
              <span className="text-xs font-bold font-mono" style={{color:'var(--text-accent)'}}>{analysis.readinessScore} / 10</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--bg-elevated)',border:'1px solid var(--border-color)'}}>
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(analysis.readinessScore * 10, 0), 100)}%`, background:'var(--text-accent)' }}
              />
            </div>
          </div>

          {/* 2. Strengths and Skill Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{background:'var(--bg-input)',border:'1px solid var(--border-color)'}}>
              <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 pb-2" style={{color:'var(--color-success)',borderBottom:'1px solid var(--border-color)'}}>
                <CheckCircle size={14} />
                Team Strengths
              </h3>
              <ul className="flex flex-col gap-2 text-xs">
                {analysis.strengths && analysis.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed" style={{color:'var(--text-body)'}}>
                    <span className="font-bold" style={{color:'var(--color-success)'}}>✓</span>
                    <span>{str}</span>
                  </li>
                ))}
                {(!analysis.strengths || analysis.strengths.length === 0) && (
                  <li className="italic" style={{color:'var(--text-muted)'}}>No notable strengths detected.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl p-4 flex flex-col gap-3" style={{background:'var(--bg-input)',border:'1px solid var(--border-color)'}}>
              <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 pb-2" style={{color:'var(--color-error)',borderBottom:'1px solid var(--border-color)'}}>
                <AlertTriangle size={14} />
                Skill Gaps
              </h3>
              <ul className="flex flex-col gap-2 text-xs">
                {analysis.skillGaps && analysis.skillGaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed" style={{color:'var(--text-body)'}}>
                    <span className="font-bold" style={{color:'var(--color-error)'}}>⚠</span>
                    <span>{gap}</span>
                  </li>
                ))}
                {(!analysis.skillGaps || analysis.skillGaps.length === 0) && (
                  <li className="italic" style={{color:'var(--text-muted)'}}>No major skill gaps identified.</li>
                )}
              </ul>
            </div>
          </div>

          {/* 3. Recommended Roles */}
          <div className="flex flex-col gap-2">
            <span className="input-label">Recommended Roles</span>
            <div className="flex flex-col gap-2">
              {analysis.recommendedRoles && analysis.recommendedRoles.map((roleObj, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl" style={{background:'var(--bg-input)',border:'1px solid var(--border-color)'}}>
                  <span className="text-xs font-bold" style={{color:'var(--text-heading)'}}>{roleObj.member}</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowRight size={12} style={{color:'var(--text-muted)'}} />
                    <span className="status-badge badge-active">{roleObj.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata section */}
          <div className="pt-4 flex flex-col gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{borderTop:'1px solid var(--border-color)',color:'var(--text-muted)'}}>
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>Generated on: {formatTimestamp(analysisGeneratedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Milestone size={12} />
              <span>Analysis Version: v{analysisVersion}</span>
            </div>
          </div>

          {/* Regenerate Trigger */}
          <button 
            className="btn-secondary w-full text-xs mt-3 flex items-center justify-center gap-1.5 py-2.5" 
            onClick={handleRegenerate}
            disabled={actionLoading}
          >
            <RefreshCw size={13} className={actionLoading ? "animate-spin" : ""} />
            Regenerate Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamAnalysis;
