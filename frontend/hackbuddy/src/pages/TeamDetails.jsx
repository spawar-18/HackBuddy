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
    <div className="team-details-page">
      <style>{`
        .team-details-page {
          background-color: var(--bg-deep);
          min-height: 100vh;
          width: 100%;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          padding: 2.5rem 1.5rem;
        }

        .team-details-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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
          align-self: flex-start;
          padding: 0;
        }

        .back-btn:hover {
          color: var(--text-primary);
        }

        .grid-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 992px) {
          .grid-layout {
            grid-template-columns: 1fr 2fr;
          }
        }

        .details-card {
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.03), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .details-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 1rem;
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

        .details-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .details-subtitle {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .detail-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          display: block;
        }

        .invite-box {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-default);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .invite-val {
          font-family: var(--font-mono);
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--primary);
        }

        .invite-link {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }

        .copy-action-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }

        .copy-action-btn:hover {
          color: var(--text-primary);
        }

        .leader-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          font-size: 0.9rem;
        }

        .leader-name {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .member-row {
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: border-color 0.2s;
        }

        .member-row:hover {
          border-color: var(--text-muted);
        }

        .member-identity {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border);
        }

        .member-avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-glow);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .member-name {
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .role-badge {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--success);
          background: var(--success-glow);
          border: 1px solid var(--success);
          padding: 1px 6px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .member-email {
          font-size: 0.85rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }

        .skills-section {
          border-top: 1px solid var(--border);
          padding-top: 0.75rem;
        }

        .skills-tag-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .skill-tag {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 3px 8px;
          background: var(--bg-card-solid);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          border-radius: var(--radius-full);
          transition: all 0.15s ease;
        }

        .skill-tag:hover {
          color: var(--text-primary);
          border-color: var(--text-muted);
        }

        .danger-zone {
          border: 1px solid var(--danger);
          border-radius: var(--radius-lg);
          background: var(--danger-glow);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .danger-zone-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--danger);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .danger-zone-desc {
          font-size: 0.85rem;
          color: var(--danger);
          opacity: 0.85;
          margin: 0;
          line-height: 1.4;
        }

        .btn-danger {
          background: var(--danger);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-default);
          padding: 0.65rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-danger:hover:not(:disabled) {
          opacity: 0.95;
        }

        .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .select-field {
          background-color: var(--bg-deep);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: var(--radius-default);
          padding: 0.65rem 1rem;
          font-size: 0.9rem;
          font-family: inherit;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
        }

        .select-field:focus {
          border-color: var(--border-focus);
        }

        .btn-action-primary {
          background: var(--primary);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-default);
          padding: 0.65rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .btn-action-primary:hover:not(:disabled) {
          background: var(--primary-hover);
        }

        .btn-action-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .remove-member-btn {
          background: var(--danger-glow);
          color: var(--danger);
          border: 1px solid var(--danger);
          border-radius: var(--radius-default);
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .remove-member-btn:hover:not(:disabled) {
          background: var(--danger);
          color: #ffffff;
        }

        .remove-member-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="team-details-content">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="back-btn"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="grid-layout">
          {/* Left Panel: Team Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="details-card">
              <div className="details-card-header">
                <div className="icon-box">
                  <Users size={20} />
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Team Profile</h2>
              </div>

              <div>
                <h1 className="details-title">{team.teamName}</h1>
                <p className="details-subtitle">{team.description || 'No description provided for this team.'}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Invite Code */}
                <div>
                  <span className="detail-label">INVITE CODE</span>
                  <div className="invite-box">
                    <span className="invite-val">{team.inviteCode}</span>
                    <button
                      onClick={() => copyToClipboard(team.inviteCode, 'code')}
                      className="copy-action-btn"
                      title="Copy Invite Code"
                    >
                      {copiedCode ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Invite Link */}
                <div>
                  <span className="detail-label">SHAREABLE INVITE LINK</span>
                  <div className="invite-box">
                    <span className="invite-link" title={team.inviteLink}>
                      {team.inviteLink}
                    </span>
                    <button
                      onClick={() => copyToClipboard(team.inviteLink, 'link')}
                      className="copy-action-btn"
                      title="Copy Invite Link"
                    >
                      {copiedLink ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Created By */}
                <div className="leader-row">
                  <span style={{ color: 'var(--text-muted)' }}>Squad Leader:</span>
                  <span className="leader-name">
                    <Shield size={12} style={{ color: 'var(--primary)' }} />
                    {team.createdBy?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Team Settings Section */}
            <div className="details-card">
              <div className="details-card-header">
                <div className="icon-box" style={{ color: 'var(--primary)', background: 'var(--primary-glow)' }}>
                  <Shield size={20} />
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Team Settings</h2>
              </div>

              {isOwner ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Members list under settings */}
                  <div>
                    <span className="detail-label" style={{ marginBottom: '0.75rem' }}>Members</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {team.members && team.members.map((member) => {
                        const isMemberCreator = team.createdBy?._id === member._id || team.createdBy === member._id;
                        return (
                          <div 
                            key={member._id} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '0.65rem 1rem',
                              background: 'var(--bg-deep)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-default)'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {member.name} {isMemberCreator && '(Owner)'}
                            </span>
                            {!isMemberCreator && (
                              <button
                                className="remove-member-btn"
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

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                  {/* Transfer Ownership */}
                  <div>
                    <span className="detail-label" style={{ marginBottom: '0.25rem' }}>Transfer Ownership</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                      Select a team member to transfer ownership to. You will lose owner privileges.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <select 
                        className="select-field"
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
                        className="btn-action-primary"
                        onClick={triggerTransferOwnership}
                        disabled={loadingAction || !newOwnerId}
                      >
                        Transfer Ownership
                      </button>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                  {/* Danger Zone */}
                  <div className="danger-zone">
                    <h3 className="danger-zone-title">
                      <AlertTriangle size={18} />
                      Danger Zone
                    </h3>
                    <p className="danger-zone-desc">
                      This action is permanent and cannot be undone. All team data will be deleted.
                    </p>
                    <button
                      className="btn-danger"
                      onClick={triggerDeleteTeam}
                      disabled={loadingAction}
                      style={{ marginTop: '0.5rem', width: '100%' }}
                    >
                      Delete Team
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    You are currently a team member. You can choose to leave this team at any time.
                  </p>
                  <button
                    className="btn-danger"
                    onClick={triggerLeaveTeam}
                    disabled={loadingAction}
                    style={{ width: '100%' }}
                  >
                    Leave Team
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Members List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="details-card">
              <div className="details-card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="icon-box" style={{ color: 'var(--success)', background: 'var(--success-glow)' }}>
                    <Users size={20} />
                  </div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
                    Squad Members ({team.members?.length || 0})
                  </h2>
                </div>
                <span className="role-badge" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>LIVE HUB</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {team.members && team.members.map((member) => {
                  const isCreator = team.createdBy?._id === member._id || team.createdBy === member._id;
                  
                  return (
                    <div key={member._id} className="member-row">
                      <div className="member-identity" style={{ justifyContent: 'space-between', width: '100%', display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {member.avatar ? (
                            <img 
                              src={member.avatar} 
                              alt={member.name} 
                              className="member-avatar"
                            />
                          ) : (
                            <div className="member-avatar-placeholder">
                              {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="member-name">
                              {member.name}
                              {isCreator && (
                                <span className="role-badge">Lead</span>
                              )}
                            </div>
                            <div className="member-email">
                              <Mail size={12} />
                              {member.email}
                            </div>
                          </div>
                        </div>

                        {/* If current user is owner and this member is not the owner/creator */}
                        {isOwner && !isCreator && (
                          <button
                            className="remove-member-btn"
                            onClick={() => triggerRemoveMember(member)}
                            disabled={loadingAction}
                            title={`Remove ${member.name}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Member Skills */}
                      <div className="skills-section">
                        <span className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', marginBottom: '4px' }}>
                          <Code size={12} />
                          Skills Stack
                        </span>
                        <div className="skills-tag-container">
                          {member.skills && member.skills.length > 0 ? (
                            member.skills.map((skill, sIdx) => (
                              <span key={sIdx} className="skill-tag">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
            <TeamAnalysis teamId={teamId} />
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
