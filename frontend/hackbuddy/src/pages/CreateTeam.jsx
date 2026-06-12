import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTeam } from '../services/teamService';
import { ArrowLeft, Copy, Check, Users, Terminal, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

const CreateTeam = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTeam, setCreatedTeam] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await createTeam({
        teamName: teamName.trim(),
        description: description.trim()
      });
      if (result.success) {
        setCreatedTeam(result);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="team-page-container">
      <style>{`
        .team-page-container {
          background-color: var(--bg-deep);
          min-height: 100vh;
          width: 100%;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2.5rem 1rem;
        }

        .team-card {
          width: 100%;
          max-width: 550px;
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .team-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 1.25rem;
        }

        .icon-box {
          background: var(--primary-glow);
          color: var(--primary);
          padding: 10px;
          border-radius: var(--radius-default);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-box.emerald {
          background: var(--success-glow);
          color: var(--success);
        }

        .team-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .team-subtitle {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
          margin-bottom: 0.5rem;
          align-self: flex-start;
          padding: 0;
        }

        .back-btn:hover {
          color: var(--text-primary);
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 1.25rem;
        }

        .input-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-default);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }

        .submit-btn {
          width: 100%;
          padding: 0.75rem;
          background: var(--primary);
          border: none;
          border-radius: var(--radius-default);
          color: #ffffff;
          font-weight: 700;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-btn:hover {
          background: var(--primary-hover);
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .info-alert {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-default);
          font-size: 0.95rem;
          font-weight: 500;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 1.25rem;
        }

        .info-alert.error {
          background: var(--danger-glow);
          border: 1px solid var(--danger);
          color: var(--danger);
        }

        .info-alert.success {
          background: var(--success-glow);
          border: 1px solid var(--success);
          color: var(--success);
        }

        .code-box {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          padding: 1rem 1.25rem;
          border-radius: var(--radius-default);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .code-val {
          font-family: var(--font-mono);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--primary);
        }

        .link-val {
          font-family: var(--font-mono);
          font-size: 0.9rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 250px;
        }

        .copy-action-btn {
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: var(--radius-default);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .copy-action-btn:hover {
          background: var(--bg-deep);
          color: var(--text-primary);
          border-color: var(--text-muted);
        }

        .copy-action-btn.success {
          border-color: var(--success);
          color: var(--success);
          background: var(--success-glow);
        }

        .secondary-btn {
          flex: 1;
          padding: 0.75rem;
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-default);
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          transition: all 0.2s;
        }

        .secondary-btn:hover {
          background: var(--bg-deep);
          color: var(--text-primary);
          border-color: var(--text-muted);
        }
      `}</style>

      <div className="team-card">
        {/* Back Button */}
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        {!createdTeam ? (
          <>
            <div className="team-header">
              <div className="icon-box">
                <Users size={24} />
              </div>
              <div>
                <h1 className="team-title">Create a New Team</h1>
                <p className="team-subtitle">Form a new squad and invite other hackers</p>
              </div>
            </div>

            {error && (
              <div className="info-alert error">
                <AlertTriangle size={18} style={{ shrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label htmlFor="teamName" className="input-label">TEAM NAME</label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Code Warriors"
                  className="input-field"
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label htmlFor="description" className="input-label">DESCRIPTION (OPTIONAL)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project, stack, or target tracks..."
                  rows="3"
                  className="input-field"
                  style={{ resize: 'none' }}
                  disabled={loading}
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Initializing squad...' : 'Create Team'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="team-header">
              <div className="icon-box emerald">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h1 className="team-title">Team Created!</h1>
                <p className="team-subtitle">Your crew <strong style={{ color: '#0f172a' }}>{createdTeam.team.teamName}</strong> is online.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Invite Code */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <span className="input-label">INVITE CODE</span>
                <div className="code-box">
                  <span className="code-val">{createdTeam.inviteCode}</span>
                  <button
                    onClick={() => copyToClipboard(createdTeam.inviteCode, 'code')}
                    className={`copy-action-btn ${copiedCode ? 'success' : ''}`}
                  >
                    {copiedCode ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Invite Link */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <span className="input-label">SHAREABLE INVITE LINK</span>
                <div className="code-box">
                  <span className="link-val" title={createdTeam.inviteLink}>
                    {createdTeam.inviteLink}
                  </span>
                  <button
                    onClick={() => copyToClipboard(createdTeam.inviteLink, 'link')}
                    className={`copy-action-btn ${copiedLink ? 'success' : ''}`}
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="action-grid">
                <button
                  onClick={() => navigate(`/team/${createdTeam.team._id}`)}
                  className="submit-btn"
                  style={{ flex: 1 }}
                >
                  View Workspace
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="secondary-btn"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateTeam;
