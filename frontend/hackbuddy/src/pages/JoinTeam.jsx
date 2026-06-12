import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinTeam } from '../services/teamService';
import { ArrowLeft, UserPlus, Key, Terminal, CheckCircle2, AlertTriangle } from 'lucide-react';

const JoinTeam = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }

    if (inviteCode.trim().length !== 6) {
      setError('Invite code must be exactly 6 characters');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await joinTeam(inviteCode.trim());
      if (result.success && result.team) {
        setSuccess('Successfully joined the team! Redirecting...');
        setTimeout(() => {
          navigate(`/team/${result.team._id}`);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to join team. Please verify the code.');
    } finally {
      setLoading(false);
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
          max-width: 480px;
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
          background: var(--tertiary-glow);
          color: var(--tertiary);
          padding: 10px;
          border-radius: var(--radius-default);
          display: flex;
          align-items: center;
          justify-content: center;
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
          font-family: var(--font-mono);
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 4px;
          text-transform: uppercase;
          transition: all 0.2s ease;
          text-align: center;
        }

        .input-field:focus {
          outline: none;
          border-color: var(--tertiary);
          box-shadow: 0 0 0 3px var(--tertiary-glow);
        }

        .submit-btn {
          width: 100%;
          padding: 0.75rem;
          background: var(--tertiary);
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
          background: var(--tertiary);
          box-shadow: 0 4px 12px var(--tertiary-glow);
          opacity: 0.95;
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
      `}</style>

      <div className="team-card">
        {/* Back Button */}
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="team-header">
          <div className="icon-box">
            <UserPlus size={24} />
          </div>
          <div>
            <h1 className="team-title">Join a Team</h1>
            <p className="team-subtitle">Enter an invite code to join a squad</p>
          </div>
        </div>

        {error && (
          <div className="info-alert error">
            <AlertTriangle size={18} style={{ shrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="info-alert success">
            <CheckCircle2 size={18} style={{ shrink: 0, marginTop: '2px' }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label htmlFor="inviteCode" className="input-label">INVITE CODE</label>
            <input
              type="text"
              id="inviteCode"
              maxLength={6}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD12"
              className="input-field"
              required
              disabled={loading || !!success}
              autoComplete="off"
            />
          </div>

          <button type="submit" disabled={loading || !!success} className="submit-btn">
            {loading ? 'Validating credentials...' : 'Join Team'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinTeam;
