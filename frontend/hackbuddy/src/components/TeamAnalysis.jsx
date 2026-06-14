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
      <style>{`
        .team-analysis-card {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .analysis-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 1rem;
          margin-bottom: 1.25rem;
        }

        .header-title-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ai-badge {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--primary);
          background: var(--primary-glow);
          border: 1px solid var(--primary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .analysis-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2.5rem 1rem;
          gap: 1.25rem;
        }

        .analysis-icon-container {
          background: var(--primary-glow);
          color: var(--primary);
          padding: 1.25rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px var(--primary-glow);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .generate-btn {
          width: 100%;
          padding: 0.85rem;
          background: var(--primary);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-default);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .generate-btn:hover:not(:disabled) {
          background: var(--primary-hover);
          box-shadow: 0 0 15px var(--primary-glow);
        }

        .generate-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spin-icon {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-container {
          background: var(--danger-glow);
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 1rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .results-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .score-section {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .score-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .score-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .score-value {
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary);
        }

        .score-bar-bg {
          height: 10px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .score-bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          background: linear-gradient(90deg, var(--primary) 0%, var(--tertiary) 100%);
          transition: width 1s ease-out;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }

        @media (min-width: 576px) {
          .analysis-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .grid-card {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }

        .grid-card-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }

        .list-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .list-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.9rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }

        .roles-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .role-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-default);
        }

        .role-member {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .role-assignment {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
        }

        .role-title-badge {
          background: var(--success-glow);
          color: var(--success);
          border: 1px solid var(--success);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .recommendations-box {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .rec-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 0.75rem 1rem;
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          font-size: 0.9rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }

        .meta-footer {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>

      <div className="analysis-header">
        <div className="header-title-container">
          <div className="icon-box" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <Brain size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>AI Team Analysis</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Skill gaps & recommended roles report</p>
          </div>
        </div>
        <span className="ai-badge">Qwen 35B</span>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-container">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '2px' }}>Analysis Generation Failed</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading State / Action Loading / Empty State / Results */}
      {loading ? (
        <div className="analysis-empty-state">
          <div className="analysis-icon-container" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <RefreshCw className="spin-icon" size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>Checking Analysis...</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto' }}>
              Checking for cached team assessment reports.
            </p>
          </div>
        </div>
      ) : actionLoading ? (
        <div className="analysis-empty-state">
          <div className="analysis-icon-container" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <RefreshCw className="spin-icon" size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>{loadingText}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto' }}>
              Qwen is executing skill assessment mapping. Please hold on.
            </p>
          </div>
          <button className="generate-btn" disabled>
            <RefreshCw className="spin-icon" size={16} />
            {loadingText}
          </button>
        </div>
      ) : !analysis ? (
        <div className="analysis-empty-state">
          <div className="analysis-icon-container">
            <Sparkles size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>Generate Skill Assessment</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '320px', margin: '0 auto' }}>
              Analyze your squad's technical profile to receive role recommendation mappings and success strategies.
            </p>
          </div>
          <button 
            className="generate-btn" 
            onClick={handleGenerate}
            disabled={actionLoading}
          >
            <Brain size={16} />
            Generate Analysis
          </button>
        </div>
      ) : (
        <div className="results-container">
          {/* 1. Readiness Score */}
          <div className="score-section">
            <div className="score-header">
              <span className="score-title">
                <Gauge size={16} style={{ color: 'var(--primary)' }} />
                Team Readiness Score
              </span>
              <span className="score-value">{analysis.readinessScore} / 10</span>
            </div>
            <div className="score-bar-bg">
              <div 
                className="score-bar-fill" 
                style={{ width: `${Math.min(Math.max(analysis.readinessScore * 10, 0), 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Strengths and Skill Gaps */}
          <div className="analysis-grid">
            <div className="grid-card">
              <h3 className="grid-card-title" style={{ color: 'var(--success)' }}>
                <CheckCircle size={16} />
                Team Strengths
              </h3>
              <ul className="list-items">
                {analysis.strengths && analysis.strengths.map((str, idx) => (
                  <li key={idx} className="list-item">
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>
                    <span>{str}</span>
                  </li>
                ))}
                {(!analysis.strengths || analysis.strengths.length === 0) && (
                  <li className="list-item" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No notable strengths detected.</li>
                )}
              </ul>
            </div>

            <div className="grid-card">
              <h3 className="grid-card-title" style={{ color: 'var(--danger)' }}>
                <AlertTriangle size={16} />
                Skill Gaps
              </h3>
              <ul className="list-items">
                {analysis.skillGaps && analysis.skillGaps.map((gap, idx) => (
                  <li key={idx} className="list-item">
                    <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>⚠</span>
                    <span>{gap}</span>
                  </li>
                ))}
                {(!analysis.skillGaps || analysis.skillGaps.length === 0) && (
                  <li className="list-item" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No major skill gaps identified.</li>
                )}
              </ul>
            </div>
          </div>

          {/* 3. Recommended Roles */}
          <div>
            <span className="detail-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Recommended Roles</span>
            <div className="roles-list">
              {analysis.recommendedRoles && analysis.recommendedRoles.map((roleObj, idx) => (
                <div key={idx} className="role-row">
                  <span className="role-member">{roleObj.member}</span>
                  <div className="role-assignment">
                    <ArrowRight size={14} />
                    <span className="role-title-badge">{roleObj.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* Metadata section */}
          <div className="meta-footer">
            <div className="meta-item">
              <Clock size={12} />
              <span>Generated on: {formatTimestamp(analysisGeneratedAt)}</span>
            </div>
            <div className="meta-item">
              <Milestone size={12} />
              <span>Analysis Version: v{analysisVersion}</span>
            </div>
          </div>

          {/* Regenerate Trigger */}
          <button 
            className="generate-btn" 
            onClick={handleRegenerate}
            disabled={actionLoading}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', marginTop: '0.5rem' }}
          >
            <RefreshCw size={14} className={actionLoading ? "spin-icon" : ""} />
            Regenerate Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamAnalysis;
