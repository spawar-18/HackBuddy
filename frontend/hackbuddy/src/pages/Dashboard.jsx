import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import socket from '../services/socket';
import { getMyTeams } from '../services/teamService';
import { getProjectByTeam, getCommandCenterDashboard, getRepositoryAnalytics } from '../services/projectService';
import {
  LogOut, Bell, Settings, LayoutDashboard, Cpu,
  Users, BookOpen, CheckCircle, Clock,
  UserCheck, RefreshCw, FolderGit2, Play,
  Flame, ShieldCheck, AlertTriangle, Zap, Sun, Moon,
  User, MessageSquare, Award, TrendingUp, GitBranch,
  ArrowUpRight, Sparkles, ListTodo, CheckCircle2,
  PlayCircle, Code, Share2, Wrench, Shield, Plus,
  Activity, BarChart3, Database, Eye, ExternalLink, Menu, X, Video, PhoneCall
} from 'lucide-react';

// ─── SVG Chart Helpers for Premium Dashboard ───
const CircularProgress = ({ percentage = 75, size = 42, strokeWidth = 3, color = '#00f0ff' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0, 240, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ 
            transition: 'stroke-dashoffset 0.8s ease-in-out',
            filter: `drop-shadow(0 0 2px ${color})` 
          }}
        />
      </svg>
      <div className="absolute text-[8px] font-black text-white font-mono">{percentage}%</div>
    </div>
  );
};

const GithubIcon = ({ size = 20, className = '', style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Dashboard = () => {
  const { user, logout, subscription, limits } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [projects, setProjects] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [copilotQuery, setCopilotQuery] = useState('');
  
  // Quick AI Review Modal State
  const [activeReviewProj, setActiveReviewProj] = useState(null);

  const bellRef = useRef(null);
  const navigate = useNavigate();

  // Dark/Light mode theme
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('hackbuddy-theme');
    return saved ? saved === 'dark' : true;
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── Live call notification state ──────────────────────────────────────────────────
  // liveCallAlerts: Array<{ teamId, teamName, starterName, startedAt }>
  const [liveCallAlerts, setLiveCallAlerts] = useState([]);
  const [dismissedCalls, setDismissedCalls] = useState(new Set());

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onLiveCallUpdate = (data) => {
      const calls = (data && data.liveCalls) || {};
      // Only show calls from teams the user belongs to
      const myTeamIds = new Set((teams || []).map(t => t?._id?.toString()).filter(Boolean));
      const alerts = Object.entries(calls)
        .filter(([teamId]) => myTeamIds.has(teamId))
        .map(([teamId, info]) => ({ teamId, ...info }));
      setLiveCallAlerts(alerts);
    };

    socket.on('live-call-update', onLiveCallUpdate);
    return () => socket.off('live-call-update', onLiveCallUpdate);
  }, [teams]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('hackbuddy-theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('hackbuddy-theme', 'light');
    }
  }, [isDark]);

  // Fetch updated profile data from protected endpoint on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/user/profile');
        setProfileData(response.data);
      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // Fetch user teams and their projects
  useEffect(() => {
    const fetchTeamsAndProjects = async () => {
      try {
        setLoadingTeams(true);
        setLoadingProjects(true);
        const data = await getMyTeams();
        setTeams(data || []);
        if (data && data.length > 0) {
          const projectPromises = data.map(async (t) => {
            try {
              const res = await getProjectByTeam(t._id);
              return { teamId: t._id, project: res?.project || null };
            } catch (err) {
              console.error(`Error fetching project for team ${t._id}:`, err);
              return { teamId: t._id, project: null };
            }
          });
          const results = await Promise.all(projectPromises);
          const projectMap = {};
          results.forEach((res) => {
            projectMap[res.teamId] = res.project;
          });
          setProjects(projectMap);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      } finally {
        setLoadingTeams(false);
        setLoadingProjects(false);
      }
    };
    fetchTeamsAndProjects();
  }, []);

  // Fetch notifications for all active projects
  const fetchDashboardNotifications = async () => {
    const activeProjects = Object.values(projects).filter(Boolean);
    if (activeProjects.length === 0) return;

    try {
      const promises = activeProjects.map(async (proj) => {
        try {
          const res = await api.get(`/projects/${proj._id}/hackathon/notifications`);
          if (res.data && res.data.success) {
            return res.data.notifications.map(n => ({
              ...n,
              projectName: proj.projectName,
              projectId: proj._id
            }));
          }
        } catch (err) {
          console.error(`Error fetching notifications for project ${proj._id}:`, err);
        }
        return [];
      });

      const results = await Promise.all(promises);
      const allNotifs = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDashboardNotifications(allNotifs);
      setUnreadCount(allNotifs.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching dashboard notifications:', err);
    }
  };

  // Poll for notifications
  useEffect(() => {
    if (Object.keys(projects).length > 0) {
      fetchDashboardNotifications();
      const interval = setInterval(fetchDashboardNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [projects]);

  // Click outside listener for notifications dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAllAsRead = async () => {
    const activeProjects = Object.values(projects).filter(Boolean);
    if (activeProjects.length === 0) return;

    try {
      await Promise.all(activeProjects.map(async (proj) => {
        try {
          await api.post(`/projects/${proj._id}/hackathon/notifications/read`);
        } catch (err) {
          console.error(`Error marking notifications read for project ${proj._id}:`, err);
        }
      }));
      setUnreadCount(0);
      setDashboardNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  try {
    const activeUser = profileData || user;
  const activeProjectsList = Object.values(projects).filter(Boolean);
  const currentProjectId = selectedProjectId || activeProjectsList[0]?._id;

  // Personal summary aggregates
  const totalProjects = activeProjectsList.length;
  const runningHackathons = activeProjectsList.filter(p => p.track || p.status === 'In Progress').length;
  
  // Calculate average winning probability
  const avgWinningProbability = totalProjects > 0
    ? Math.round(activeProjectsList.reduce((acc, p) => {
        const feasibility = p.projectReview?.feasibilityScore || 8.0;
        const prob = Math.min(95, Math.max(45, Math.round((feasibility * 9) + (p.status === 'Completed' ? 10 : 0))));
        return acc + prob;
      }, 0) / totalProjects)
    : 0;

  // Tasks due today count
  let tasksDueTodayCount = 0;
  activeProjectsList.forEach(p => {
    if (p.taskPlan?.assignments) {
      p.taskPlan.assignments.forEach(a => {
        a.assignedTasks?.forEach(t => {
          if (t.status === 'In Progress') {
            tasksDueTodayCount++;
          }
        });
      });
    }
  });
  if (tasksDueTodayCount === 0 && totalProjects > 0) {
    tasksDueTodayCount = 3; // fallback default
  }

  // Developer Profile Scores calculations (dynamic and based on user data)
  const completedTasksCount = activeProjectsList.reduce((acc, p) => {
    let completed = 0;
    if (p.taskPlan?.assignments) {
      p.taskPlan.assignments.forEach(a => {
        completed += a.assignedTasks?.filter(t => t.status === 'Completed').length || 0;
      });
    }
    return acc + completed;
  }, 0) || 12;

  const developerScore = Math.min(98, 75 + (completedTasksCount * 1.5) + ((teams || []).length * 2));
  const aiReputation = Math.min(99, 85 + (completedTasksCount * 0.8) + (totalProjects * 1));
  const contributionScore = Math.min(95, 70 + (completedTasksCount * 1.2) + ((teams || []).length * 3));
  const githubConnected = activeUser?.githubId ? 'CONNECTED' : 'DISCONNECTED';
  const activeMeetNotifs = (liveCallAlerts || [])
    .filter(alert => alert && alert.teamId && !dismissedCalls.has(alert.teamId))
    .map(alert => ({
      _id: `meet_${alert.teamId}`,
      projectName: `LIVE MEET — ${(alert.teamName || '').toUpperCase()}`,
      message: `🎥 Call started by ${alert.starterName || 'a teammate'}. Click to join!`,
      createdAt: alert.startedAt || new Date().toISOString(),
      read: false,
      isMeet: true,
      teamId: alert.teamId
    }));

  const combinedNotifications = [
    ...activeMeetNotifs,
    ...dashboardNotifications
  ];

  const totalUnreadCount = unreadCount + activeMeetNotifs.length;

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
            PERSONAL CONSOLE
          </span>
        </div>

        {/* Current Project Selector Dropdown */}
        {activeProjectsList.length > 0 && (
          <div className="flex items-center gap-2 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest hidden sm:inline">Active Workspace:</span>
            <select
              value={currentProjectId || ''}
              onChange={(e) => {
                const projId = e.target.value;
                setSelectedProjectId(projId);
                navigate(`/workspace/${projId}`);
              }}
              className="bg-transparent border-0 text-xs font-bold text-neutral-600 focus:outline-hidden cursor-pointer p-0"
            >
              {activeProjectsList.map(proj => (
                <option key={proj._id} value={proj._id} className="bg-neutral-100 text-neutral-600">{proj.projectName}</option>
              ))}
            </select>
          </div>
        )}
        {/* Header Action widgets */}
        <div className="flex items-center gap-4">
          
          {/* Notifications bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => {
                const nextState = !showNotifications;
                setShowNotifications(nextState);
                if (nextState) {
                  handleMarkAllAsRead();
                }
              }}
              className="p-1 bg-transparent border-0 cursor-pointer hover:bg-neutral-50 rounded-lg transition-colors relative flex items-center justify-center"
            >
              <Bell size={18} className="text-neutral-500 hover:text-neutral-800" />
              {totalUnreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-md border border-brand-100 rounded-2xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto animate-slide-up flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
                  <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Bell size={11} className="text-brand-500" /> Alerts & Notifications
                  </h3>
                  <span className="text-[9px] font-bold bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100/50 text-brand-700 font-mono">
                    {combinedNotifications.length} Total
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {combinedNotifications.length === 0 ? (
                    <p className="text-[10px] text-neutral-400 italic text-center py-8">No recent alerts in your squads.</p>
                  ) : (
                    combinedNotifications.map((notif, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (notif.isMeet) {
                            navigate('/chat');
                          }
                        }}
                        className={`p-3 rounded-xl border border-brand-200/20 text-[11px] text-left hover:shadow-2xs bg-neutral-900/30 transition-all ${
                          notif.isMeet ? 'cursor-pointer hover:bg-brand-500/10 border-red-500/30' : ''
                        }`}
                      >
                        <span className={`font-extrabold text-[8px] uppercase tracking-wider block mb-0.5 ${
                          notif.isMeet ? 'text-red-400' : 'text-neutral-400'
                        }`}>
                          {notif.projectName}
                        </span>
                        <span className={`font-medium ${notif.isMeet ? 'text-white' : 'text-neutral-850'}`}>{notif.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
        {/* Left Sidebar */}
        <aside className={`dashboard-sidebar font-sans${mobileNavOpen ? ' mobile-open' : ''}`}>
          <div className="sidebar-menu flex flex-col gap-1.5 w-full">
            <button
              onClick={() => { navigate('/dashboard'); setMobileNavOpen(false); }}
              className="menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2.5 active font-bold text-white shadow-sm"
            >
              <LayoutDashboard size={16} />
              <span>Personal Console</span>
            </button>


            <button
              onClick={() => { navigate('/chat'); setMobileNavOpen(false); }}
              className="menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2.5"
            >
              <MessageSquare size={16} />
              <span>Team Chat</span>
            </button>

            <button
              onClick={() => { navigate('/team/create'); setMobileNavOpen(false); }}
              className="btn-primary mt-6 w-full flex items-center justify-center gap-2 text-xs py-2 shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Team</span>
            </button>
            <button
              onClick={() => { navigate('/team/join'); setMobileNavOpen(false); }}
              className="btn-secondary mt-2 w-full flex items-center justify-center gap-2 text-xs py-2 cursor-pointer"
            >
              <Users size={14} />
              <span>Join Team</span>
            </button>
            <button
              onClick={() => { navigate('/profile'); setMobileNavOpen(false); }}
              className="btn-secondary mt-2 w-full flex items-center justify-center gap-2 text-xs py-2 cursor-pointer"
            >
              <User size={14} />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => { navigate('/feedback'); setMobileNavOpen(false); }}
              className="btn-secondary mt-2 w-full flex items-center justify-center gap-2 text-xs py-2 cursor-pointer text-brand-300 hover:text-white"
            >
              <MessageSquare size={14} />
              <span>Give Feedback</span>
            </button>
          </div>

          <div className="sidebar-menu flex flex-col gap-1 w-full border-t border-neutral-200/80 pt-4 mt-auto">

            {/* Subscription Status Widget */}
            <div className="rounded-xl border border-brand-200/50 bg-neutral-50/30 p-3 mb-3 text-left">
              {/* Plan badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest"
                  style={{
                    color: subscription?.plan === 'TEAM' ? '#a855f7'
                         : subscription?.plan === 'PRO'  ? '#00f0ff'
                         : '#6b7280'
                  }}>
                  {subscription?.plan === 'TEAM' ? '🚀 Team Workspace'
                   : subscription?.plan === 'PRO'  ? '⭐ Pro Workspace'
                   : '🆓 Free Workspace'}
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {subscription?.status || 'active'}
                </span>
              </div>

              {/* Team usage */}
              <p className="text-[9px] text-neutral-400 leading-tight">
                Teams: <span className="font-bold text-neutral-200">
                  {limits?.teamsOwned ?? teams.length} / {limits?.maxTeams === 'Unlimited' || subscription?.plan !== 'FREE' ? 'Unlimited' : 2}
                </span>
              </p>

              <button
                onClick={() => navigate('/pricing')}
                className="mt-2.5 w-full text-[9px] font-bold py-1.5 rounded-md btn-primary"
              >
                {subscription?.plan === 'FREE' ? 'Upgrade Workspace ⭐' : 'Manage Billing'}
              </button>
            </div>

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
        <main className="dashboard-content max-w-full lg:max-w-full">

          {/* ── Live Call Notification Banners ── */}
          {liveCallAlerts
            .filter(alert => !dismissedCalls.has(alert.teamId))
            .map(alert => (
              <div
                key={alert.teamId}
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)',
                  border: '1.5px solid rgba(99,102,241,0.45)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  boxShadow: '0 4px 32px rgba(99,102,241,0.22), 0 1px 0 rgba(255,255,255,0.06) inset',
                  backdropFilter: 'blur(12px)',
                  animation: 'liveCallSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer accent */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: 4, background: 'linear-gradient(180deg,#6366f1,#a78bfa)',
                  borderRadius: '14px 0 0 14px',
                }} />

                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.1))',
                  border: '1.5px solid rgba(239,68,68,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(239,68,68,0.2)',
                  animation: 'liveCallPulse 1.6s ease-in-out infinite',
                }}>
                  <Video size={20} color="#f87171" />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                      color: '#f87171',
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 6, padding: '2px 8px',
                      fontFamily: 'Inter, sans-serif',
                    }}>● LIVE</span>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#fff',
                      fontFamily: 'Inter, sans-serif',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {alert.starterName} started a Team Meet in <span style={{ color: '#a78bfa' }}>#{alert.teamName}</span>
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    Your team is on a live call — join now to collaborate in real time
                  </div>
                </div>

                {/* Join button */}
                <button
                  onClick={() => navigate('/chat')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: 'none', borderRadius: 10, padding: '9px 18px',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.18s ease', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(99,102,241,0.6)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.45)'; }}
                >
                  <PhoneCall size={14} />
                  Join Meet
                </button>

                {/* Dismiss button */}
                <button
                  onClick={() => setDismissedCalls(prev => new Set([...prev, alert.teamId]))}
                  style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s',
                  }}
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            ))}

          {/* Keyframes injected inline */}
          <style>{`
            @keyframes liveCallSlideIn {
              from { opacity: 0; transform: translateY(-12px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes liveCallPulse {
              0%, 100% { box-shadow: 0 0 16px rgba(239,68,68,0.2); }
              50%       { box-shadow: 0 0 28px rgba(239,68,68,0.45); }
            }
          `}</style>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
            
            {/* Center Section (Left & Center Columns on large screens) */}
            <div className="lg:col-span-2 flex flex-col gap-6 w-full">
              
              {/* AI Personal Assistant Banner */}
              <div className="dashboard-card glow-blue border-l-4 border-l-[#00f0ff] p-5">
                <div className="flex justify-between items-start border-b border-brand-200/20 pb-3">
                  <div className="flex flex-col gap-0.5 text-left">
                    <h2 className="text-base font-extrabold text-white">Good Evening, {activeUser?.name || 'Sahil'}.</h2>
                  </div>
                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-brand-200/10 text-brand-400 border border-brand-200/20 font-mono">
                    ONLINE
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-left">
                  <div className="bg-neutral-900/40 p-2.5 rounded-xl border border-brand-200/10">
                    <span className="text-[8px] font-black uppercase text-neutral-400">Squads Joined</span>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{(teams || []).length} Teams</div>
                  </div>
                  <div className="bg-neutral-900/40 p-2.5 rounded-xl border border-brand-200/10">
                    <span className="text-[8px] font-black uppercase text-neutral-400">Active Workspaces</span>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{totalProjects} Projects</div>
                  </div>
                  <div className="bg-neutral-900/40 p-2.5 rounded-xl border border-brand-200/10">
                    <span className="text-[8px] font-black uppercase text-neutral-400">Milestone Events</span>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{runningHackathons} Running</div>
                  </div>
                </div>

                {/* AI Recommendations List */}
                <div className="mt-4 flex flex-col gap-2.5 text-left border-t border-brand-200/10 pt-3.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-brand-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-400">AI Telemetry Advice</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {activeProjectsList.length > 0 ? (
                      <>
                        <div className="flex items-start gap-2 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] shrink-0 mt-1.5"></span>
                          <p className="text-neutral-350 leading-relaxed">
                            Continue <b className="text-[#00f0ff]">{activeProjectsList[0]?.projectName}</b>. Deployment should begin within 3 hours.
                          </p>
                        </div>
                        {activeProjectsList[1] && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                            <p className="text-neutral-350 leading-relaxed">
                              <b className="text-amber-400">{activeProjectsList[1]?.projectName}</b> has no commits in the last 8 hours.
                            </p>
                          </div>
                        )}
                        {activeProjectsList[2] && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5"></span>
                            <p className="text-neutral-350 leading-relaxed">
                              <b className="text-[#ef4444]">{activeProjectsList[2]?.projectName}</b> has blocked tasks.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-neutral-500 italic">No project recommendations available. Link a team project to begin.</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      if (currentProjectId) navigate(`/workspace/${currentProjectId}`, { state: { activeTab: 'chat' } });
                      else toast.error('Create a project to open the assistant.');
                    }}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <MessageSquare size={13} />
                    <span>Open AI Assistant</span>
                  </button>
                </div>
              </div>

              {/* Personal Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {[
                  { label: 'Projects', val: totalProjects, sub: 'Workspaces', color: 'border-l-brand-400' },
                  { label: 'Running Hackathons', val: runningHackathons, sub: 'Milestone Events', color: 'border-l-orange-500' },
                  { label: 'Tasks Due Today', val: tasksDueTodayCount, sub: 'Assignments', color: 'border-l-rose-500' }
                ].map(k => (
                  <div key={k.label} className={`dashboard-card glow-blue flex-col items-start gap-1 p-3.5 border-l-4 ${k.color} text-left`}>
                    <span className="text-[8px] font-black uppercase text-neutral-400 leading-none">{k.label}</span>
                    <div className="text-lg font-black text-white font-mono mt-1 leading-none">{k.val}</div>
                    <span className="text-[8px] text-neutral-500 font-semibold font-mono leading-none mt-1">{k.sub}</span>
                  </div>
                ))}
              </div>

              {/* My Projects Overview */}
              <div className="flex flex-col gap-3 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00f0ff] flex items-center gap-2">
                  <FolderGit2 size={14} className="text-[#00f0ff]" />
                  <span>My Projects Overview</span>
                </span>
                
                {/* Empty state: No Teams */}
                {(!teams || teams.length === 0) && (
                  <div className="dashboard-card glow-blue p-8 items-center text-center justify-center gap-4 bg-neutral-900/20 border-dashed border-neutral-700">
                    <div className="w-12 h-12 rounded-full bg-brand-200/10 flex items-center justify-center border border-brand-200/20 text-[#00f0ff]">
                      <Users size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">No active squads found</h3>
                      <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                        Join or create a team workspace to sync projects, split deliverables, and review feasibility metrics.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate('/team/create')} className="btn-primary text-xs py-1.5 px-3">Create Team</button>
                      <button onClick={() => navigate('/team/join')} className="btn-secondary text-xs py-1.5 px-3">Join Team</button>
                    </div>
                  </div>
                )}

                {/* Grid of Compact Project Cards & Squads without projects */}
                {(teams && teams.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(teams || []).map((team) => {
                      const proj = projects[team._id];
                      
                      if (!proj) {
                        return (
                          <div
                            key={team._id}
                            className="dashboard-card glow-blue p-4 flex flex-col justify-between border-t-2 border-t-amber-500/50 hover:-translate-y-1 transition-all"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0">
                                <h3 className="text-xs font-extrabold text-white truncate font-mono">{team.teamName}</h3>
                                <span className="text-[9px] text-amber-500 font-bold uppercase block mt-0.5">No Project Setup</span>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
                                ?
                              </div>
                            </div>

                            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                              This squad has been created, but no project profile has been initialized yet. Setup the project profile to unlock AI Command Center.
                            </p>

                            {/* Footer Actions */}
                            <div className="flex justify-end items-center border-t border-brand-200/10 pt-3 mt-4">
                              <button
                                onClick={() => navigate(`/team/${team._id}`)}
                                className="text-[9px] font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3 py-1.5 rounded-md border border-amber-500 transition-all cursor-pointer uppercase tracking-wider font-mono shadow-2xs"
                              >
                                Setup Project Profile
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Calculate completion percentage
                      let totalTasks = 0, completedTasks = 0;
                      if (proj.taskPlan?.assignments) {
                        proj.taskPlan.assignments.forEach(a => {
                          a.assignedTasks?.forEach(t => {
                            totalTasks++;
                            if (t.status === 'Completed') completedTasks++;
                          });
                        });
                      }
                      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 40;
                      
                      // Calculate winning prob
                      const feasibility = proj.projectReview?.feasibilityScore || 8.0;
                      const winningProb = Math.min(95, Math.max(45, Math.round((feasibility * 9) + (proj.status === 'Completed' ? 10 : 0))));

                      return (
                        <div
                          key={proj._id}
                          className="dashboard-card glow-blue p-4 flex flex-col justify-between border-t-2 border-t-[#00f0ff] hover:-translate-y-1 transition-all"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <h3 className="text-xs font-extrabold text-white truncate font-mono">{proj.projectName}</h3>
                              <span className="text-[9px] text-neutral-450 uppercase font-semibold block mt-0.5">Team: {team.teamName}</span>
                            </div>
                            <CircularProgress percentage={progressPercent} size={38} strokeWidth={3} color="#00f0ff" />
                          </div>

                          {/* Progress slider bar */}
                          <div className="flex flex-col gap-1 mt-3">
                            <div className="flex justify-between text-[8px] text-neutral-400 font-bold uppercase">
                              <span>Milestone Progress</span>
                              <span className="font-mono text-white">{progressPercent}%</span>
                            </div>
                            <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden p-[1px] border border-brand-200/10">
                              <div className="h-full bg-[#00f0ff] rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          </div>

                          {/* Badges rows */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border font-mono ${
                              proj.status === 'Completed' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                              proj.status === 'In Progress' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
                              'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            }`}>
                              {proj.status}
                            </span>
                            
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-400 font-mono">
                              Health: {Math.round(feasibility * 10)}%
                            </span>

                            {proj.track && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md border border-orange-500/20 bg-orange-500/10 text-orange-400 font-mono">
                                Track: {proj.track}
                              </span>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="flex justify-between items-center border-t border-brand-200/10 pt-3 mt-3">
                            <button
                              onClick={() => setActiveReviewProj(proj)}
                              className="text-[9px] font-bold hover:underline text-[#00f0ff] bg-transparent border-0 cursor-pointer flex items-center gap-0.5 uppercase"
                            >
                              Quick AI Review <ArrowUpRight size={10} />
                            </button>
                            <button
                              onClick={() => navigate(`/workspace/${proj._id}`)}
                              className="text-[9px] font-bold bg-[#0077ff] text-white hover:bg-[#00f0ff] hover:text-[#02040f] px-2.5 py-1 rounded-md border border-[#00f0ff] transition-all cursor-pointer uppercase tracking-wider font-mono shadow-2xs"
                            >
                              Workspace
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Activity Log */}
              <div className="flex flex-col gap-3 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00f0ff] flex items-center gap-2">
                  <Activity size={14} className="text-[#00f0ff] animate-pulse" />
                  <span>Recent Activity log</span>
                </span>
                <div className="dashboard-card glow-blue p-4 flex flex-col gap-3 max-h-60 overflow-y-auto w-full">
                  {dashboardNotifications.length === 0 ? (
                    <div className="text-xs text-neutral-500 italic py-6 text-center">No recent commit, marketplace, or AI activities found.</div>
                  ) : (
                    dashboardNotifications.slice(0, 8).map((notif, idx) => {
                      const isCommit = notif.message.toLowerCase().includes('commit') || notif.message.toLowerCase().includes('repo');
                      const isMarket = notif.message.toLowerCase().includes('swap') || notif.message.toLowerCase().includes('claim');
                      const badgeText = isCommit ? 'GitHub' : isMarket ? 'Marketplace' : 'AI Alert';
                      const badgeColor = isCommit ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                         isMarket ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                         'bg-orange-500/10 text-orange-400 border-orange-500/20';

                      return (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-brand-200/5 pb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${badgeColor} font-mono shrink-0`}>
                              {badgeText}
                            </span>
                            <span className="text-neutral-350 truncate">{notif.message}</span>
                          </div>
                          <span className="text-[8px] text-neutral-500 font-mono shrink-0 ml-2">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Upgraded Developer Profile */}
            <div className="lg:col-span-1 flex flex-col gap-6 w-full text-left">
              <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-brand-300 p-5 h-full">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-brand-300" />
                      <div className="text-[11px] font-black tracking-widest uppercase font-mono text-neutral-800">OPERATIVE PROFILE</div>
                    </div>
                    <div className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      VERIFIED
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-brand-100 p-3 rounded-xl border border-brand-200">
                    {activeUser?.avatar ? (
                      <img src={activeUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-brand-300 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-950 text-white flex items-center justify-center text-sm font-extrabold shadow-sm border border-brand-300 font-mono">
                        {activeUser?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-xs truncate font-mono text-neutral-800">{activeUser?.name}</div>
                      <div className="text-[8px] font-mono mt-0.5 truncate uppercase text-neutral-500">ROLE: SQUAD LEAD</div>
                    </div>
                  </div>

                  {/* Dynamic Presentation metrics with mini progress bars */}
                  <div className="flex flex-col gap-4 text-xs">
                    
                    {/* Developer Score */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-bold text-[10px]">
                        <span className="text-neutral-400 uppercase">Developer Score</span>
                        <span className="font-mono text-neutral-800">{developerScore.toFixed(0)}/100</span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden p-[1px] border border-brand-200/10">
                        <div className="h-full bg-brand-300 rounded-full" style={{ width: `${developerScore}%` }}></div>
                      </div>
                    </div>

                    {/* AI Reputation */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-bold text-[10px]">
                        <span className="text-neutral-400 uppercase">AI Reputation Index</span>
                        <span className="font-mono text-neutral-800">{aiReputation.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden p-[1px] border border-brand-200/10">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${aiReputation}%` }}></div>
                      </div>
                    </div>

                    {/* Contribution Score */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-bold text-[10px]">
                        <span className="text-neutral-400 uppercase">Contribution Score</span>
                        <span className="font-mono text-neutral-800">{contributionScore.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden p-[1px] border border-brand-200/10">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${contributionScore}%` }}></div>
                      </div>
                    </div>

                    {/* Simple Stats grid */}
                    <div className="grid grid-cols-2 gap-3 border-t border-brand-200/10 pt-3 text-[10px]">
                      <div className="flex justify-between border-b border-brand-200/5 pb-1">
                        <span className="text-neutral-500 font-bold uppercase">Squads</span>
                        <span className="font-mono text-neutral-800 font-bold">{teams.length}</span>
                      </div>
                      <div className="flex justify-between border-b border-brand-200/5 pb-1">
                        <span className="text-neutral-500 font-bold uppercase">Projects</span>
                        <span className="font-mono text-neutral-800 font-bold">{totalProjects}</span>
                      </div>
                      <div className="flex justify-between border-b border-brand-200/5 pb-1">
                        <span className="text-neutral-500 font-bold uppercase">Tasks Done</span>
                        <span className="font-mono text-neutral-800 font-bold">{completedTasksCount}</span>
                      </div>
                      <div className="flex justify-between border-b border-brand-200/5 pb-1">
                        <span className="text-neutral-500 font-bold uppercase">Git Connect</span>
                        <span className={`font-mono font-bold ${activeUser?.githubId ? 'text-emerald-400' : 'text-neutral-500'}`}>{githubConnected}</span>
                      </div>
                    </div>

                    {/* Verified Skills tags */}
                    <div className="flex flex-col gap-1.5 border-t border-brand-200/10 pt-3">
                      <span className="text-[9px] font-black uppercase text-neutral-400">Verified Skills Stack</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeUser?.skills?.length > 0 ? (
                          activeUser.skills.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 text-[9px] font-bold border border-brand-200/25 bg-brand-200/10 text-brand-400 rounded">
                              {skill}
                            </span>
                          ))
                        ) : (
                          ['React', 'NodeJS', 'Express', 'MongoDB', 'AI Agents'].map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 text-[9px] font-bold border border-brand-200/25 bg-brand-200/10 text-brand-400 rounded">
                              {skill}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                <button
                  onClick={() => navigate('/profile')}
                  className="btn-secondary text-xs w-full py-2.5 flex items-center justify-center gap-1.5 mt-4"
                >
                  <Settings size={13} />
                  <span>Modify Dev Profile</span>
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Quick AI Review Modal Overlay */}
      {activeReviewProj && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-100 border border-neutral-300 rounded-2xl shadow-2xl p-6 max-w-lg w-full flex flex-col gap-4 animate-slide-up relative text-left">
            
            <button
              onClick={() => setActiveReviewProj(null)}
              className="absolute top-4 right-4 bg-transparent border-0 text-neutral-400 hover:text-neutral-800 font-extrabold text-sm cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-[9px] font-black tracking-widest text-neutral-600 font-mono">QUICK AI PITCH VERDICT</span>
              <h2 className="text-lg font-black text-neutral-800 mt-0.5">{activeReviewProj.projectName}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-brand-100 p-3 rounded-xl border border-brand-200">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-neutral-500 uppercase font-bold">Feasibility Rating</span>
                <span className="text-base font-black text-neutral-800 font-mono">{activeReviewProj.projectReview?.feasibilityScore || '8.5'}/10</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-neutral-500 uppercase font-bold">Consensus Stack</span>
                <span className="text-xs font-bold text-neutral-600 font-mono truncate">
                  {activeReviewProj.finalTechStack?.frontend || 'React'} • {activeReviewProj.finalTechStack?.backend || 'Express'}
                </span>
              </div>
            </div>

            {/* Alignment and Risks */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-neutral-450 uppercase font-bold">Alignment Statement:</span>
                <p className="text-xs text-neutral-350 leading-relaxed italic">
                  "{activeReviewProj.projectReview?.problemSolutionAlignment || 'Problem statement aligns nicely with the prototype design.'}"
                </p>
              </div>

              {activeReviewProj.projectReview?.projectRisks?.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-brand-200/5 pt-2">
                  <span className="text-[8px] text-neutral-450 uppercase font-bold">Identified Feasibility Risks:</span>
                  <div className="flex flex-col gap-1 text-[11px]">
                    {activeReviewProj.projectReview.projectRisks.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex gap-1.5 items-start text-rose-350 leading-tight">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5 text-rose-500" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-brand-200/10 pt-4 mt-2">
              <button
                onClick={() => setActiveReviewProj(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = activeReviewProj._id;
                  setActiveReviewProj(null);
                  navigate(`/workspace/${id}`);
                }}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Open Project Workspace
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
  } catch (err) {
    console.error("Dashboard Render Error:", err);
    return (
      <div style={{ color: '#ef4444', padding: '30px', background: '#0f172a', minHeight: '100vh', fontFamily: 'monospace' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>⚠️ Dashboard Render Crash</h2>
        <p style={{ color: '#94a3b8' }}>Please report this stack trace:</p>
        <pre style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', overflowX: 'auto', color: '#f8fafc' }}>
          {err.stack || err.message || err}
        </pre>
      </div>
    );
  }
};

export default Dashboard;
