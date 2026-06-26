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
    <div className="details-card team-analysis-card">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-neutral-500 tracking-wider uppercase">AI Team Analysis</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Skill gaps & recommended roles report</p>
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
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shadow-xs">
            <RefreshCw className="animate-spin" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Checking Analysis...</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
              Checking for cached team assessment reports.
            </p>
          </div>
        </div>
      ) : actionLoading ? (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-4 w-full animate-pulse">
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shadow-xs">
            <RefreshCw className="animate-spin" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{loadingText}</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
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
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shadow-xs">
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Generate Skill Assessment</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-[300px] mx-auto leading-relaxed">
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
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-neutral-500 tracking-wider uppercase flex items-center gap-1.5">
                <Gauge size={14} className="text-brand-500" />
                Team Readiness Score
              </span>
              <span className="text-xs font-bold text-brand-700 font-mono">{analysis.readinessScore} / 10</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(analysis.readinessScore * 10, 0), 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Strengths and Skill Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-emerald-700 tracking-wider uppercase flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                <CheckCircle size={14} />
                Team Strengths
              </h3>
              <ul className="flex flex-col gap-2 text-xs">
                {analysis.strengths && analysis.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-neutral-600 leading-relaxed">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
                {(!analysis.strengths || analysis.strengths.length === 0) && (
                  <li className="text-neutral-400 italic">No notable strengths detected.</li>
                )}
              </ul>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-red-700 tracking-wider uppercase flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                <AlertTriangle size={14} />
                Skill Gaps
              </h3>
              <ul className="flex flex-col gap-2 text-xs">
                {analysis.skillGaps && analysis.skillGaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-neutral-600 leading-relaxed">
                    <span className="text-red-500 font-bold">⚠</span>
                    <span>{gap}</span>
                  </li>
                ))}
                {(!analysis.skillGaps || analysis.skillGaps.length === 0) && (
                  <li className="text-neutral-400 italic">No major skill gaps identified.</li>
                )}
              </ul>
            </div>
          </div>

          {/* 3. Recommended Roles */}
          <div className="flex flex-col gap-2">
            <span className="input-label">Recommended Roles</span>
            <div className="flex flex-col gap-2">
              {analysis.recommendedRoles && analysis.recommendedRoles.map((roleObj, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <span className="text-xs font-bold text-neutral-800">{roleObj.member}</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowRight size={12} className="text-neutral-400" />
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 uppercase tracking-wider">{roleObj.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata section */}
          <div className="border-t border-neutral-100 pt-4 flex flex-col gap-2 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
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
