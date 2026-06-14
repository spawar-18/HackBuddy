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
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-neutral-50">
      <div className="w-full max-w-[460px] bg-white border border-neutral-200 rounded-xl p-6 md:p-8 shadow-xs flex flex-col items-center text-center gap-5 animate-slide-up">
        <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center mb-1">
          <Users size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">HackBuddy Invitation</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Processing invitation code 
            <span className="font-mono font-bold text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded text-xs ml-1">{inviteCode}</span>
          </p>
        </div>
        
        {status && (
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-600 font-semibold mt-2">
            <RefreshCw className="text-brand-500 animate-spin" size={16} />
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
