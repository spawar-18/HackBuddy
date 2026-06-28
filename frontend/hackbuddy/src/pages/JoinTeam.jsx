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
      <div className="team-card">
        {/* Back Button */}
        <button onClick={() => navigate('/dashboard')} className="back-btn mb-2">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="team-header">
          <div className="icon-box">
            <UserPlus size={22} />
          </div>
          <div>
            <h1 className="team-title">Join a Team</h1>
            <p className="team-subtitle">Enter an invite code to join a squad</p>
          </div>
        </div>

        {error && (
          <div className="error-alert">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="info-alert success">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="input-group">
            <label htmlFor="inviteCode" className="input-label">INVITE CODE</label>
            <input
              type="text"
              id="inviteCode"
              maxLength={6}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD12"
              className="input-field text-center text-lg font-bold tracking-widest uppercase font-mono"
              required
              disabled={loading || !!success}
              autoComplete="off"
            />
          </div>

          <button type="submit" disabled={loading || !!success} className="btn-primary w-full mt-2">
            {loading ? 'Validating credentials...' : 'Join Team'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinTeam;
