import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getTeamDetails, 
  leaveTeam, 
  removeMember, 
  transferOwnership, 
  deleteTeam 
} from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import TeamAnalysis from '../components/TeamAnalysis';
import ProjectHub from '../components/ProjectHub';
import { 
  ArrowLeft, Copy, Check, Users, Shield, Mail, Code, 
  Terminal, AlertTriangle, RefreshCw, LogOut, Trash2 
} from 'lucide-react';

const TeamDetails = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Team Actions State
  const [newOwnerId, setNewOwnerId] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Confirmation Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    danger: false,
    action: null
  });

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getTeamDetails(teamId);
        setTeam(data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load team details.');
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchTeam();
    }
  }, [teamId]);

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

  const triggerLeaveTeam = () => {
    setModalConfig({
      title: 'Leave Team',
      message: 'Are you sure you want to leave this team?',
      confirmText: 'Leave Team',
      cancelText: 'Cancel',
      danger: true,
      loadingText: 'Leaving Team...',
      action: async () => {
        try {
          setLoadingAction(true);
          await leaveTeam(teamId);
          toast.success('Left team successfully');
          navigate('/dashboard');
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || 'Failed to leave team');
        } finally {
          setLoadingAction(false);
          setModalOpen(false);
        }
      }
    });
    setModalOpen(true);
  };

  const triggerRemoveMember = (member) => {
    setModalConfig({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      danger: true,
      loadingText: 'Removing Member...',
      action: async () => {
        try {
          setLoadingAction(true);
          await removeMember(teamId, member._id);
          toast.success('Member removed successfully');
          // Refresh details
          const updatedTeam = await getTeamDetails(teamId);
          setTeam(updatedTeam);
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || 'Failed to remove member');
        } finally {
          setLoadingAction(false);
          setModalOpen(false);
        }
      }
    });
    setModalOpen(true);
  };

  const triggerTransferOwnership = () => {
    setModalConfig({
      title: 'Transfer Ownership',
      message: 'Are you sure you want to transfer ownership of this team?',
      confirmText: 'Transfer',
      cancelText: 'Cancel',
      danger: true,
      loadingText: 'Transferring Ownership...',
      action: async () => {
        try {
          setLoadingAction(true);
          await transferOwnership(teamId, newOwnerId);
          toast.success('Ownership transferred successfully');
          setNewOwnerId('');
          // Refresh details
          const updatedTeam = await getTeamDetails(teamId);
          setTeam(updatedTeam);
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || 'Failed to transfer ownership');
        } finally {
          setLoadingAction(false);
          setModalOpen(false);
        }
      }
    });
    setModalOpen(true);
  };

  const triggerDeleteTeam = () => {
    setModalConfig({
      title: 'Delete Team',
      message: 'This action is permanent and cannot be undone.',
      confirmText: 'Delete Team',
      cancelText: 'Cancel',
      danger: true,
      loadingText: 'Deleting Team...',
      action: async () => {
        try {
          setLoadingAction(true);
          await deleteTeam(teamId);
          toast.success('Team deleted successfully');
          navigate('/dashboard');
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || 'Failed to delete team');
        } finally {
          setLoadingAction(false);
          setModalOpen(false);
        }
      }
    });
    setModalOpen(true);
  };

  const isOwner = team && team.createdBy && (
    (team.createdBy._id && team.createdBy._id === user?._id) || 
    (team.createdBy === user?._id)
  );

  if (loading) {
    return (
      <div className="loader-page">
        <style>{`
          .loader-page {
            background-color: var(--bg-deep);
            min-height: 100vh;
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 12px;
            font-family: var(--font-sans);
            color: var(--text-secondary);
          }
          .loader-spinner {
            color: var(--primary);
            animation: spin 1.5s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <RefreshCw className="loader-spinner" size={32} />
        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Fetching team records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loader-page">
        <style>{`
          .loader-page {
            background-color: var(--bg-deep);
            min-height: 100vh;
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 12px;
            font-family: var(--font-sans);
            color: var(--text-secondary);
            padding: 1rem;
          }
          .error-card {
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
          .error-icon-box {
            background: var(--danger-glow);
            color: var(--danger);
            width: 64px;
            height: 64px;
            border-radius: var(--radius-default);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.5rem;
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
          }
        `}</style>
        <div className="error-card">
          <div className="error-icon-box">
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Access Denied</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="action-btn"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-5">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="back-btn mb-2"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Team Info, Settings & Members (1 Column) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Team Profile Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
                <h2 className="text-xs font-bold text-neutral-505 tracking-wider uppercase">Team Profile</h2>
              </div>

              <div>
                <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">{team.teamName}</h1>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{team.description || 'No description provided for this team.'}</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Invite Code */}
                <div className="flex flex-col gap-1.5">
                  <span className="input-label">INVITE CODE</span>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-sm">
                    <span className="font-bold text-neutral-900 tracking-wider">{team.inviteCode}</span>
                    <button
                      onClick={() => copyToClipboard(team.inviteCode, 'code')}
                      className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors"
                      title="Copy Invite Code"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Invite Link */}
                <div className="flex flex-col gap-1.5">
                  <span className="input-label">SHAREABLE INVITE LINK</span>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-sm">
                    <span className="text-xs text-neutral-500 overflow-hidden text-ellipsis whitespace-nowrap max-w-[190px]" title={team.inviteLink}>
                      {team.inviteLink}
                    </span>
                    <button
                      onClick={() => copyToClipboard(team.inviteLink, 'link')}
                      className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors"
                      title="Copy Invite Link"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Created By */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-4 text-xs font-semibold text-neutral-500">
                  <span>Squad Leader:</span>
                  <span className="flex items-center gap-1 text-brand-600">
                    <Shield size={12} />
                    {team.createdBy?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Team Settings Section */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
                  <Shield size={20} />
                </div>
                <h2 className="text-xs font-bold text-neutral-500 tracking-wider uppercase">Team Settings</h2>
              </div>

              {isOwner ? (
                <div className="flex flex-col gap-5">
                  {/* Members list under settings */}
                  <div className="flex flex-col gap-2">
                    <span className="input-label">Members Directory</span>
                    <div className="flex flex-col gap-2">
                      {team.members && team.members.map((member) => {
                        const isMemberCreator = team.createdBy?._id === member._id || team.createdBy === member._id;
                        return (
                          <div 
                            key={member._id} 
                            className="flex justify-between items-center px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg"
                          >
                            <span className="text-xs font-bold text-neutral-800">
                              {member.name} {isMemberCreator && '(Owner)'}
                            </span>
                            {!isMemberCreator && (
                              <button
                                className="px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                onClick={() => triggerRemoveMember(member)}
                                disabled={loadingAction}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <hr className="border-neutral-100" />

                  {/* Transfer Ownership */}
                  <div className="flex flex-col gap-2">
                    <span className="input-label">Transfer Ownership</span>
                    <p className="text-xs text-neutral-400 leading-normal">
                      Select a team member to transfer ownership to. You will lose owner privileges.
                    </p>
                    <div className="flex gap-2">
                      <select 
                        className="input-field text-xs py-2 pr-8"
                        value={newOwnerId}
                        onChange={(e) => setNewOwnerId(e.target.value)}
                        disabled={loadingAction}
                      >
                        <option value="">Select Member</option>
                        {team.members && team.members
                          .filter(m => m._id !== user?._id)
                          .map(m => (
                            <option key={m._id} value={m._id}>{m.name}</option>
                          ))
                        }
                      </select>
                      <button
                        className="btn-primary text-xs shrink-0 py-2"
                        onClick={triggerTransferOwnership}
                        disabled={loadingAction || !newOwnerId}
                      >
                        Transfer
                      </button>
                    </div>
                  </div>

                  <hr className="border-neutral-100" />

                  {/* Danger Zone */}
                  <div className="border border-red-200 rounded-xl bg-red-50/40 p-4 flex flex-col gap-2.5">
                    <h3 className="text-xs font-bold text-red-700 tracking-wider uppercase flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      Danger Zone
                    </h3>
                    <p className="text-xs text-red-600/80 leading-normal">
                      This action is permanent. All team records and projects will be permanently expunged.
                    </p>
                    <button
                      className="btn-danger w-full py-2 text-xs"
                      onClick={triggerDeleteTeam}
                      disabled={loadingAction}
                    >
                      Delete Team Workspace
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    You are currently a team member. You can choose to leave this team workspace at any time.
                  </p>
                  <button
                    className="btn-danger w-full py-2.5 text-xs"
                    onClick={triggerLeaveTeam}
                    disabled={loadingAction}
                  >
                    Leave Team Workspace
                  </button>
                </div>
              )}
            </div>

            {/* Squad Members Directory Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <h2 className="text-xs font-bold text-neutral-500 tracking-wider uppercase">
                    Squad Members ({team.members?.length || 0})
                  </h2>
                </div>
                <span className="status-badge badge-active">Live Hub</span>
              </div>

              <div className="flex flex-col gap-4">
                {team.members && team.members.map((member) => {
                  const isCreator = team.createdBy?._id === member._id || team.createdBy === member._id;
                  
                  return (
                    <div key={member._id} className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col gap-3.5 hover:border-neutral-300 transition-all duration-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img 
                              src={member.avatar} 
                              alt={member.name} 
                              className="w-10 h-10 rounded-full border border-neutral-200 object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                              {member.name}
                              {isCreator && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-50 border border-brand-100 text-brand-700 uppercase tracking-wider">Lead</span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-450 flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} />
                              {member.email}
                            </div>
                          </div>
                        </div>

                        {/* If current user is owner and this member is not the owner/creator */}
                        {isOwner && !isCreator && (
                          <button
                            className="px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            onClick={() => triggerRemoveMember(member)}
                            disabled={loadingAction}
                            title={`Remove ${member.name}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Member Skills */}
                      <div className="border-t border-neutral-200/60 pt-3">
                        <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase flex items-center gap-1 mb-2">
                          <Code size={11} />
                          Skills Stack
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {member.skills && member.skills.length > 0 ? (
                            member.skills.map((skill, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 text-[11px] font-medium bg-white border border-neutral-200 hover:border-neutral-300 hover:text-neutral-800 text-neutral-500 rounded-lg transition-colors cursor-default">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-neutral-400 italic">
                              No skills registered on profile yet.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Skills Analysis */}
            <TeamAnalysis teamId={teamId} />
          </div>

          {/* Right Panel: Project Workspace (2 Columns) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <ProjectHub teamId={teamId} />
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.action}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        loading={loadingAction}
        danger={modalConfig.danger}
        loadingText={modalConfig.loadingText}
      />
    </div>
  );
};

export default TeamDetails;
