import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { getMyTeams, getTeamDetails, leaveTeam, removeMember, transferOwnership, deleteTeam } from '../services/teamService';
import {
  getProject,
  getProjectByTeam,
  getCommandCenterDashboard,
  getRepositoryAnalytics,
  getProjectRealityCheck,
  triggerCommandCenterAnalysis
} from '../services/projectService';
import {
  LogOut, Bell, Settings, LayoutDashboard, Cpu,
  Users, BookOpen, CheckCircle, Clock,
  UserCheck, RefreshCw, FolderGit2, Play,
  Flame, ShieldCheck, AlertTriangle, Zap, Sun, Moon,
  User, MessageSquare, Award, TrendingUp, GitBranch,
  ArrowUpRight, Sparkles, Plus, Activity, Database, Wrench, ArrowLeft, Copy, Check,
  Shield, Mail, Code, Menu, X
} from 'lucide-react';
import HackathonCommandCenter from '../components/HackathonCommandCenter';
import ProjectHub from '../components/ProjectHub';
import GitHubPanel from '../components/GitHubPanel';
import TaskMarketplace from '../components/TaskMarketplace';
import ConfirmationModal from '../components/ConfirmationModal';
import TeamAnalysis from '../components/TeamAnalysis';


const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // State
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState({});
  const [commandCenterData, setCommandCenterData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Team Management State
  const [newOwnerId, setNewOwnerId] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    danger: false,
    action: null
  });

  const copyInviteLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  const currentTeam = teams.find(t => t._id === project?.teamId || t._id === project?.teamId?._id);
  const inviteCode = currentTeam?.inviteCode;

  const copyInviteCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };
  
  const [activeTab, setActiveTab] = useState(() => {
    return location.state?.activeTab || 'overview';
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('hackbuddy-theme');
    return saved ? saved === 'dark' : true;
  });

  const bellRef = useRef(null);

  // Theme Sync
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('hackbuddy-theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('hackbuddy-theme', 'light');
    }
  }, [isDark]);

  // Load project details, teams, and other linked projects
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await getProject(projectId);
        if (res.success && res.project) {
          setProject(res.project);

          const tId = res.project.teamId?._id || res.project.teamId;
          if (tId) {
            try {
              const teamData = await getTeamDetails(tId);
              setTeam(teamData);
            } catch (teamErr) {
              console.error('Error loading team details:', teamErr);
            }
          }
          
          // Get user squads to populate selectors and navigation
          const myTeams = await getMyTeams();
          setTeams(myTeams);
          
          // Fetch linked project details for each team
          const projectPromises = myTeams.map(async (t) => {
            try {
              const pRes = await getProjectByTeam(t._id);
              return { teamId: t._id, project: pRes?.project || null };
            } catch (err) {
              return { teamId: t._id, project: null };
            }
          });
          const results = await Promise.all(projectPromises);
          const pMap = {};
          results.forEach(r => {
            pMap[r.teamId] = r.project;
          });
          setProjects(pMap);
          
          // Load CommandCenter config
          const ccRes = await getCommandCenterDashboard(projectId);
          if (ccRes.success) {
            setCommandCenterData(ccRes);
          }
        }
      } catch (err) {
        console.error('Error loading project workspace data:', err);
        toast.error('Failed to load workspace files.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (projectId) {
      loadData();
    }
  }, [projectId, navigate]);

  // Sync tab updates from state parameter if passed via navigation
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

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
          const tId = project.teamId?._id || project.teamId;
          await leaveTeam(tId);
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
          const tId = project.teamId?._id || project.teamId;
          await removeMember(tId, member._id);
          toast.success('Member removed successfully');
          // Refresh details
          const updatedTeam = await getTeamDetails(tId);
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
          const tId = project.teamId?._id || project.teamId;
          await transferOwnership(tId, newOwnerId);
          toast.success('Ownership transferred successfully');
          setNewOwnerId('');
          // Refresh details
          const updatedTeam = await getTeamDetails(tId);
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
          const tId = project.teamId?._id || project.teamId;
          await deleteTeam(tId);
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

  const activeProjectsList = Object.values(projects).filter(Boolean);
  const activeUser = user;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav link rendering
  const renderSidebarItem = (tabId, label, icon) => {
    const Icon = icon;
    const isActive = activeTab === tabId;
    return (
      <button
        key={tabId}
        onClick={() => { setActiveTab(tabId); setMobileNavOpen(false); }}
        className={`menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2 ${
          isActive ? 'active font-bold text-white shadow-sm' : ''
        }`}
      >
        <Icon size={16} />
        <span>{label}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 text-slate-400 gap-3 min-h-screen">
        <RefreshCw className="animate-spin text-brand-500" size={32} />
        <span className="text-xs font-semibold tracking-wide text-neutral-500">Initializing project workspace...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div
          className="mobile-sidebar-overlay active"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Top Navigation Header */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          {/* Hamburger – mobile only */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center text-sm font-bold shadow-xs">H</div>
          <span className="font-extrabold text-lg tracking-tight font-sans text-neutral-900">
            Hack<span className="text-brand-500">Buddy</span>
          </span>
          <span className="status-badge badge-active ml-2.5 text-[10px] hidden sm:flex items-center gap-1">
            <span className="status-pulse bg-emerald-500"></span>
            WORKSPACE
          </span>
          {inviteCode && (
            <span className="status-badge badge-active ml-2 text-[10px] hidden md:flex items-center gap-1.5 font-mono">
              INVITE CODE: <span className="code-val font-black text-[#00f0ff]">{inviteCode}</span>
              <button
                onClick={() => copyInviteCode(inviteCode)}
                className="p-0.5 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded bg-transparent border-0 cursor-pointer text-neutral-400 hover:text-neutral-750 dark:hover:text-neutral-200 flex items-center justify-center transition-colors"
                title="Copy Invite Code"
              >
                {copiedCode ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
              </button>
            </span>
          )}
        </div>

        {/* Project Selector dropdown */}
        {activeProjectsList.length > 0 && (
          <div className="flex items-center gap-2 bg-neutral-100 border border-neutral-200 px-3.5 py-1.5 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest hidden sm:inline">Workspace:</span>
            <select
              value={projectId}
              onChange={(e) => {
                const newId = e.target.value;
                navigate(`/workspace/${newId}`, { state: { activeTab } });
              }}
              className="bg-transparent border-0 text-xs font-bold text-neutral-600 focus:outline-hidden cursor-pointer"
            >
              {activeProjectsList.map(p => (
                <option key={p._id} value={p._id} className="bg-neutral-100 text-neutral-600">{p.projectName}</option>
              ))}
            </select>
          </div>
        )}
        {/* Action Widgets */}
        <div className="flex items-center gap-4">
          <Settings size={18} className="text-neutral-500 hover:text-neutral-800 cursor-pointer transition-colors" onClick={() => navigate('/profile')} />
          
          <button
            onClick={() => setIsDark(prev => !prev)}
            className="p-1.5 rounded-lg bg-transparent border-0 cursor-pointer hover:bg-neutral-100/10 transition-colors flex items-center justify-center"
          >
            {isDark ? <Sun size={17} className="text-yellow-400" /> : <Moon size={17} className="text-neutral-500" />}
          </button>

          <div className="flex items-center gap-2 border-l border-neutral-200 pl-4 h-6">
            {activeUser?.avatar ? (
              <img src={activeUser.avatar} alt="Avatar" className="w-7 h-7 rounded-full border border-neutral-200 object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-neutral-950 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {activeUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-xs font-semibold text-neutral-800 hidden lg:block">{activeUser?.name}</span>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="dashboard-body">
        {/* Left Navigation Sidebar */}
        <aside className={`dashboard-sidebar font-sans${mobileNavOpen ? ' mobile-open' : ''}`}>
          <div className="sidebar-menu flex flex-col gap-1 w-full">
            <button
              onClick={() => { navigate('/dashboard'); setMobileNavOpen(false); }}
              className="menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2 text-neutral-600 mb-4 border-b border-brand-200/25 pb-3"
            >
              <ArrowLeft size={16} />
              <span className="font-bold">Home Dashboard</span>
            </button>

            {renderSidebarItem('overview', 'Overview', FolderGit2)}
            {renderSidebarItem('command-center', 'AI Command Center', Flame)}
            {renderSidebarItem('review', 'Project Review', ShieldCheck)}
            {renderSidebarItem('splitter', 'Task Splitter', Cpu)}
            {renderSidebarItem('marketplace', 'Task Marketplace', Database)}
            {renderSidebarItem('github', 'GitHub Intelligence', GitBranch)}
            {renderSidebarItem('chat', 'AI Mentor Chat', MessageSquare)}
            <button
              onClick={() => navigate('/chat')}
              className="menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2 text-neutral-600"
            >
              <Users size={16} />
              <span>Live Team Chat</span>
            </button>
            {renderSidebarItem('settings', 'Workspace Settings', Wrench)}
          </div>

          <div className="sidebar-menu flex flex-col gap-1 w-full border-t border-neutral-200/80 pt-4 mt-auto">
            <a href="#docs" className="menu-item">
              <BookOpen size={16} />
              <span>Documentation</span>
            </a>
            <button
              onClick={handleLogout}
              className="menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2 text-neutral-600 hover:text-neutral-900"
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-content w-full max-w-full lg:max-w-full">
          {activeTab === 'overview' && project && (
            <ProjectHub teamId={project.teamId} initialView="dashboard" />
          )}

          {activeTab === 'command-center' && project && (
            <HackathonCommandCenter projectId={project._id} onBack={() => setActiveTab('overview')} />
          )}

          {activeTab === 'review' && project && (
            <ProjectHub teamId={project.teamId} initialView="review-report" />
          )}

          {activeTab === 'splitter' && project && (
            <ProjectHub teamId={project.teamId} initialView="task-plan" />
          )}

          {activeTab === 'marketplace' && project && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
              <TaskMarketplace
                projectId={project._id}
                teamId={project.teamId}
                onRefreshProject={async () => {
                  const res = await getProject(projectId);
                  if (res.success) setProject(res.project);
                }}
              />
            </div>
          )}

          {activeTab === 'github' && project && (
            <GitHubPanel projectId={project._id} isOwner={project.createdBy === user?._id || user?._id === project.createdBy?._id} initialTab="overview" />
          )}



          {activeTab === 'chat' && project && (
            <ProjectHub teamId={project.teamId} initialView="mentor-chat" />
          )}


          {activeTab === 'settings' && project && (
            <ProjectHub teamId={project.teamId} initialView="edit" />
          )}
        </main>

        {/* Right Sidebar: Team Settings, Members Live Hub, AI Team Analysis */}
        {team && (
          <aside className="w-80 shrink-0 hidden xl:flex flex-col gap-6 p-6 border-l border-neutral-200 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 3.5rem)', position: 'sticky', top: '3.5rem' }}>
            {/* Team Settings Section */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
                  <Shield size={16} />
                </div>
                <h2 className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase">Team Settings</h2>
              </div>

              {isOwner ? (
                <div className="flex flex-col gap-4">
                  {/* Members list under settings */}
                  <div className="flex flex-col gap-1.5">
                    <span className="input-label text-[10px]">Members Directory</span>
                    <div className="flex flex-col gap-1.5">
                      {team.members && team.members.map((member) => {
                        const isMemberCreator = team.createdBy?._id === member._id || team.createdBy === member._id;
                        return (
                          <div 
                            key={member._id} 
                            className="flex justify-between items-center px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                          >
                            <span className="text-xs font-bold text-neutral-800">
                              {member.name} {isMemberCreator && '(Owner)'}
                            </span>
                            {!isMemberCreator && (
                              <button
                                className="px-2 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
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
                  <div className="flex flex-col gap-1.5">
                    <span className="input-label text-[10px]">Transfer Ownership</span>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Select a team member to transfer ownership. You will lose owner privileges.
                    </p>
                    <div className="flex gap-2">
                      <select 
                        className="input-field text-xs py-1.5 pr-8"
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
                        className="btn-primary text-xs shrink-0 py-1.5 px-3"
                        onClick={triggerTransferOwnership}
                        disabled={loadingAction || !newOwnerId}
                      >
                        Transfer
                      </button>
                    </div>
                  </div>

                  <hr className="border-neutral-100" />

                  {/* Danger Zone */}
                  <div className="border border-red-200 rounded-xl bg-red-50/40 p-3 flex flex-col gap-2">
                    <h3 className="text-[10px] font-bold text-red-700 tracking-wider uppercase flex items-center gap-1.5">
                      <AlertTriangle size={12} />
                      Danger Zone
                    </h3>
                    <p className="text-[11px] text-red-600/80 leading-normal">
                      Permanently delete this team workspace.
                    </p>
                    <button
                      className="btn-danger w-full py-1.5 text-xs font-bold"
                      onClick={triggerDeleteTeam}
                      disabled={loadingAction}
                    >
                      Delete Team Workspace
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Leave this team workspace.
                  </p>
                  <button
                    className="btn-danger w-full py-1.5 text-xs font-bold"
                    onClick={triggerLeaveTeam}
                    disabled={loadingAction}
                  >
                    Leave Team Workspace
                  </button>
                </div>
              )}
            </div>

            {/* Squad Members Directory Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <h2 className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase">
                    Squad Members ({team.members?.length || 0})
                  </h2>
                </div>
                <span className="status-badge badge-active text-[9px] px-1.5 py-0.5">Live Hub</span>
              </div>

              <div className="flex flex-col gap-3">
                {team.members && team.members.map((member) => {
                  const isCreator = team.createdBy?._id === member._id || team.createdBy === member._id;
                  
                  return (
                    <div key={member._id} className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50 flex flex-col gap-2.5 hover:border-neutral-300 transition-all duration-200">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {member.avatar ? (
                            <img 
                              src={member.avatar} 
                              alt={member.name} 
                              className="w-8 h-8 rounded-full border border-neutral-200 object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                              <span className="truncate max-w-[100px]">{member.name}</span>
                              {isCreator && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-brand-50 border border-brand-100 text-brand-700 uppercase tracking-wider scale-90">Lead</span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-450 flex items-center gap-1 mt-0.5 truncate max-w-[150px]" title={member.email}>
                              <Mail size={10} className="shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* If current user is owner and this member is not the owner/creator */}
                        {isOwner && !isCreator && (
                          <button
                            className="px-2 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            onClick={() => triggerRemoveMember(member)}
                            disabled={loadingAction}
                            title={`Remove ${member.name}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Member Skills */}
                      <div className="border-t border-neutral-200/60 pt-2">
                        <span className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase flex items-center gap-1 mb-1">
                          <Code size={10} />
                          Skills Stack
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {member.skills && member.skills.length > 0 ? (
                            member.skills.map((skill, sIdx) => (
                              <span key={sIdx} className="px-1.5 py-0.2 text-[10px] font-medium bg-white border border-neutral-200 hover:border-neutral-300 hover:text-neutral-800 text-neutral-500 rounded-md transition-colors cursor-default">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">
                              No skills registered.
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
            <TeamAnalysis teamId={team._id} />
          </aside>
        )}
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

export default ProjectWorkspace;
