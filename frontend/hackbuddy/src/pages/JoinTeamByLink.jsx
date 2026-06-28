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
    <div className="flex min-h-screen w-full items-center justify-center p-4" style={{background:'var(--bg-app)'}}>
      <div className="w-full max-w-[460px] rounded-xl p-6 md:p-8 flex flex-col items-center text-center gap-5 animate-slide-up" style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',boxShadow:'var(--shadow-card)'}}>
        <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-1" style={{background:'var(--tab-active-bg)',color:'var(--text-accent)',border:'1px solid var(--border-color)'}}>
          <Users size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{color:'var(--text-heading)'}}>HackBuddy Invitation</h2>
          <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
            Processing invitation code 
            <span className="font-mono font-bold px-1.5 py-0.5 rounded text-xs ml-1" style={{background:'var(--tab-active-bg)',border:'1px solid var(--border-color)',color:'var(--text-accent)'}}>{inviteCode}</span>
          </p>
        </div>
        
        {status && (
          <div className="flex items-center justify-center gap-2 text-sm font-semibold mt-2" style={{color:'var(--text-body)'}}>
            <RefreshCw className="animate-spin" size={16} style={{color:'var(--text-accent)'}} />
            <span>{status}</span>
          </div>
        )}

        {error && (
          <div className="w-full flex flex-col gap-3">
            <div className="error-alert">
              <AlertTriangle className="shrink-0" size={18} />
              <span>{error}</span>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full mt-2"
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
