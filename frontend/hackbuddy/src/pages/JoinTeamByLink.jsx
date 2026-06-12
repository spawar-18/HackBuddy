import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { joinTeam, getMyTeams } from '../services/teamService';
import { RefreshCw, Users, AlertTriangle } from 'lucide-react';

const JoinTeamByLink = () => {
  const { inviteCode } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying invitation...');
  const [error, setError] = useState('');

  useEffect(() => {
    // If auth state is still loading, wait
    if (loading) return;

    if (!user) {
      // Not logged in: save the invite code to localStorage and redirect to login
      localStorage.setItem('pendingInviteCode', inviteCode);
      navigate('/login');
      return;
    }

    const processJoin = async () => {
      try {
        setStatus('Joining team...');
        const response = await joinTeam(inviteCode);
        if (response.success && response.team) {
          setStatus('Success! Opening team workspace...');
          setTimeout(() => {
            navigate(`/team/${response.team._id}`);
          }, 1000);
        }
      } catch (err) {
        console.error('Join by link error:', err);
        const message = err.response?.data?.message || 'Failed to join team.';
        
        if (message.includes('already a member')) {
          setStatus('Locating team workspace...');
          try {
            // Find the team from user's teams and navigate to it
            const teams = await getMyTeams();
            const matchingTeam = teams.find(
              t => t.inviteCode && t.inviteCode.toUpperCase() === inviteCode.toUpperCase()
            );
            if (matchingTeam) {
              navigate(`/team/${matchingTeam._id}`);
              return;
            }
          } catch (fetchErr) {
            console.error(fetchErr);
          }
        }
        setError(message);
        setStatus('');
      }
    };

    processJoin();
  }, [user, loading, inviteCode, navigate]);

  return (
    <div className="invite-page-container">
      <style>{`
        .invite-page-container {
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

        .invite-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          padding: 2.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .invite-icon-box {
          background: var(--primary-glow);
          color: var(--primary);
          width: 64px;
          height: 64px;
          border-radius: var(--radius-default);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .invite-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .invite-subtitle {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin: 0;
        }

        .invite-code-badge {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--primary);
          background: var(--primary-glow);
          border: 1px solid var(--border);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          margin-left: 4px;
        }

        .status-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 0.95rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .status-spinner {
          color: var(--primary);
          animation: spin 1.5s linear infinite;
        }

        .info-alert {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-default);
          font-size: 0.95rem;
          font-weight: 500;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
        }

        .info-alert.error {
          background: var(--danger-glow);
          border: 1px solid var(--danger);
          color: var(--danger);
        }

        .action-btn {
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
          margin-top: 0.5rem;
        }

        .action-btn:hover {
          background: var(--primary-hover);
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="invite-card">
        <div className="invite-icon-box">
          <Users size={32} />
        </div>
        <div>
          <h2 className="invite-title">HackBuddy Invitation</h2>
          <p className="invite-subtitle" style={{ marginTop: '0.25rem' }}>
            Processing invitation code 
            <span className="invite-code-badge">{inviteCode}</span>
          </p>
        </div>
        
        {status && (
          <div className="status-container">
            <RefreshCw className="status-spinner" size={18} />
            <span>{status}</span>
          </div>
        )}

        {error && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="info-alert error">
              <AlertTriangle className="shrink-0" size={18} style={{ marginTop: '2px' }} />
              <span>{error}</span>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="action-btn"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinTeamByLink;
