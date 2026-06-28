import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTeam } from '../services/teamService';
import { ArrowLeft, Copy, Check, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import UpgradeModal from '../components/UpgradeModal';

const CreateTeam = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTeam, setCreatedTeam] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
      // Backend returns 403 with reason: TEAM_LIMIT_REACHED — open Upgrade Modal
      if (err.response?.status === 403 && err.response?.data?.reason === 'TEAM_LIMIT_REACHED') {
        setShowUpgradeModal(true);
        return;
      }
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
    <>
      <div className="team-page-container">
        <div className="team-card">
          {/* Back Button */}
          <button onClick={() => navigate('/dashboard')} className="back-btn mb-2">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          {!createdTeam ? (
            <>
              <div className="team-header">
                <div className="icon-box">
                  <Users size={22} className="text-neutral-700" />
                </div>
                <div>
                  <h1 className="team-title">Create a New Team</h1>
                  <p className="team-subtitle">Form a new squad and invite other hackers</p>
                </div>
              </div>

              {error && (
                <div className="error-alert">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="input-group">
                  <label htmlFor="teamName" className="input-label">TEAM NAME</label>
                  <input
                    type="text"
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Code Warriors"
                    className="input-field font-medium"
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
                    className="input-field h-24 resize-none font-medium"
                    disabled={loading}
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? 'Initializing squad...' : 'Create Team'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="team-header">
                <div className="icon-box bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h1 className="team-title">Team Created!</h1>
                  <p className="team-subtitle">Your crew <strong className="text-neutral-900 font-bold">{createdTeam.team.teamName}</strong> is online.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Invite Code */}
                <div className="input-group">
                  <span className="input-label">INVITE CODE</span>
                  <div className="code-box">
                    <span className="code-val font-mono">{createdTeam.inviteCode}</span>
                    <button
                      onClick={() => copyToClipboard(createdTeam.inviteCode, 'code')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
                        copiedCode
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {copiedCode ? <><Check size={13} />Copied</> : <><Copy size={13} />Copy</>}
                    </button>
                  </div>
                </div>

                {/* Invite Link */}
                <div className="input-group">
                  <span className="input-label">SHAREABLE INVITE LINK</span>
                  <div className="code-box">
                    <span className="link-val text-xs text-neutral-500 overflow-hidden text-ellipsis whitespace-nowrap max-w-[240px]" title={createdTeam.inviteLink}>
                      {createdTeam.inviteLink}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdTeam.inviteLink, 'link')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ${
                        copiedLink
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {copiedLink ? <><Check size={13} />Copied</> : <><Copy size={13} />Copy</>}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-2 w-full">
                  <button
                    onClick={() => navigate(`/team/${createdTeam.team._id}`)}
                    className="btn-primary flex-1 py-2.5"
                  >
                    View Workspace
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary flex-1 py-2.5"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upgrade Modal — shown when TEAM_LIMIT_REACHED */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
};

export default CreateTeam;
