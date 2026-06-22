import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getMyTeams } from '../services/teamService';
import { getProjectByTeam } from '../services/projectService';
import {
  LogOut, Bell, Settings, LayoutDashboard, Database, Cpu,
  Send, Users, BookOpen, CheckCircle, Clock,
  UserCheck, RefreshCw, FolderGit2, Play,
  Flame, ShieldCheck, AlertTriangle, Zap, Sun, Moon
} from 'lucide-react';
import HackathonCommandCenter from '../components/HackathonCommandCenter';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fixApplied, setFixApplied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 34, minutes: 8, seconds: 58 });
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [projects, setProjects] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const navigate = useNavigate();

  // Command Center and Notification States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dashboardNotifications, setDashboardNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef(null);

  // Dark/Light mode toggle
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('hackbuddy-theme');
    return saved ? saved === 'dark' : true; // default dark
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('hackbuddy-theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('hackbuddy-theme', 'light');
    }
  }, [isDark]);

  // Countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Derived array of active projects
  const activeProjectsList = Object.values(projects).filter(Boolean);
  const currentProjectId = selectedProjectId || activeProjectsList[0]?._id;

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

  // Mark notifications read
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

  const getNotificationStyles = (type, read) => {
    const config = {
      Milestone: {
        icon: <ShieldCheck size={14} className="text-purple-600" />,
        bg: read ? 'bg-purple-50/60' : 'bg-purple-50',
        border: read ? 'border-purple-200/50' : 'border-purple-300',
        textColor: read ? 'text-neutral-700' : 'text-neutral-900',
        badge: 'Milestone'
      },
      TaskOverdue: {
        icon: <AlertTriangle size={14} className="text-rose-600 animate-pulse" />,
        bg: read ? 'bg-rose-50/60' : 'bg-rose-50',
        border: read ? 'border-rose-200/50' : 'border-rose-300',
        textColor: read ? 'text-neutral-750' : 'text-neutral-900',
        badge: 'Overdue'
      },
      ActionRequired: {
        icon: <Zap size={14} className="text-amber-600 animate-bounce" />,
        bg: read ? 'bg-amber-50/60' : 'bg-amber-50',
        border: read ? 'border-amber-200/50' : 'border-amber-300',
        textColor: read ? 'text-neutral-750' : 'text-neutral-900',
        badge: 'Action Required'
      },
      Marketplace: {
        icon: <Database size={14} className="text-emerald-600" />,
        bg: read ? 'bg-emerald-50/60' : 'bg-emerald-50',
        border: read ? 'border-emerald-200/50' : 'border-emerald-300',
        textColor: read ? 'text-neutral-750' : 'text-neutral-900',
        badge: 'Marketplace'
      },
      General: {
        icon: <Bell size={14} className="text-brand-600" />,
        bg: read ? 'bg-brand-50/40' : 'bg-brand-50/80',
        border: read ? 'border-brand-200/50' : 'border-brand-300',
        textColor: read ? 'text-neutral-750' : 'text-neutral-900',
        badge: 'Alert'
      }
    };
    return config[type] || config.General;
  };

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

  // Fetch user teams and their projects on mount
  useEffect(() => {
    const fetchTeamsAndProjects = async () => {
      try {
        setLoadingTeams(true);
        setLoadingProjects(true);
        const data = await getMyTeams();
        setTeams(data);
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

  // Handle pending invite code check after login
  useEffect(() => {
    const pendingCode = localStorage.getItem('pendingInviteCode');
    if (pendingCode && user && user.profileCompleted) {
      localStorage.removeItem('pendingInviteCode');
      navigate(`/join/${pendingCode}`);
    }
  }, [user, navigate]);

  const formatTime = (t) => {
    return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '00')}:${String(t.seconds).padStart(2, '0')}`;
  };

  const getStatusBadge = (statusVal) => {
    switch (statusVal) {
      case 'Planning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">
            <Clock size={10} /> Planning
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700">
            <Play size={10} /> In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle size={10} /> Completed
          </span>
        );
      default:
        return null;
    }
  };

  const handleApplyFix = () => {
    setFixApplied(true);
    setTimeout(() => {
      alert('Hotfix Applied: LLM Response latency optimized to 120ms via Edge Streaming!');
    }, 100);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeUser = profileData || user;

  return (
    <div className="dashboard-container">
      {/* Top Navigation Header */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center text-sm font-bold shadow-xs">H</div>
          <span className="font-extrabold text-lg tracking-tight font-sans text-neutral-900">
            Hack<span className="text-brand-500">OS</span>
          </span>
          <span className="status-badge badge-active ml-2.5 text-[10px] flex items-center gap-1">
            <span className="status-pulse bg-emerald-500"></span>
            ACTIVE
          </span>
        </div>

        {/* Sprint Countdown Display */}
        <div className="hidden sm:flex items-center gap-2.5 font-mono bg-neutral-50 border border-neutral-200/60 rounded-full px-3 py-1 text-xs shadow-2xs">
          <Clock size={13} className="text-neutral-500" />
          <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">HUD CLOCK:</span>
          <span className="text-neutral-900 font-bold tracking-wider text-xs">{formatTime(timeLeft)}</span>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-4">
          <button className="btn-secondary py-1 px-3 text-xs hidden md:inline-flex">Submit Project</button>
          
          {/* Bell Icon with Red Unread Badge */}
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
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-md border border-brand-100 rounded-2xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto animate-slide-up flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
                  <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Bell size={11} className="text-brand-500" /> Notifications Feed
                  </h3>
                  <span className="text-[9px] font-bold bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100/50 text-brand-700">
                    {dashboardNotifications.length} Total
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {dashboardNotifications.length === 0 ? (
                    <p className="text-[10px] text-neutral-400 italic text-center py-8">No recent updates in your projects.</p>
                  ) : (
                    dashboardNotifications.map((notif, idx) => {
                      const styles = getNotificationStyles(notif.type, notif.read);
                      return (
                        <div 
                          key={notif._id || idx} 
                          className={`p-3 rounded-xl border text-[11px] leading-relaxed transition-all flex gap-3 text-left ${styles.bg} ${styles.border} ${styles.textColor} hover:shadow-2xs`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {styles.icon}
                          </div>
                          <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-extrabold text-[8px] uppercase tracking-wider text-neutral-500">
                                {notif.projectName}
                              </span>
                              <span className="text-[8px] text-neutral-400 font-bold font-mono">
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                            </div>
                            <span className={notif.read ? 'font-medium' : 'font-extrabold text-neutral-800'}>
                              {notif.message}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <Settings size={18} className="text-neutral-500 hover:text-neutral-800 cursor-pointer transition-colors" onClick={() => navigate('/profile')} />

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setIsDark(prev => !prev)}
            className="p-1.5 rounded-lg bg-transparent border-0 cursor-pointer hover:bg-neutral-100/10 transition-colors flex items-center justify-center"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark
              ? <Sun size={17} className="text-yellow-400" />
              : <Moon size={17} className="text-neutral-500" />}
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
        <aside className="dashboard-sidebar font-sans">
          <div className="sidebar-menu flex flex-col gap-1 w-full">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2 ${
                activeTab === 'dashboard' ? 'active font-bold text-white' : ''
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('command-center')} 
              className={`menu-item w-full border-0 cursor-pointer text-left flex items-center gap-3 py-2 transition-all ${
                activeTab === 'command-center' 
                  ? 'active font-bold text-white shadow-sm' 
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 border border-orange-200'
              }`}
            >
              <Flame size={16} className={activeTab === 'command-center' ? 'text-white' : 'text-orange-500'} />
              <span className="font-semibold">AI Command Center</span>
              {activeTab !== 'command-center' && (
                <span className="ml-auto text-[8px] font-black uppercase tracking-wider bg-orange-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
              )}
            </button>

            <a href="#tasks" className="menu-item">
              <Database size={16} />
              <span>ALLO Task Board</span>
            </a>
            <a href="#splitter" className="menu-item">
              <Cpu size={16} />
              <span>AI Task Splitter</span>
            </a>
            <a href="#submission" className="menu-item">
              <Send size={16} />
              <span>Submission Hub</span>
            </a>
            <button
              onClick={() => navigate('/team/create')}
              className="btn-primary mt-6 w-full flex items-center justify-center gap-2 text-xs py-2 shadow-xs cursor-pointer"
            >
              <Users size={14} />
              <span>Create Team</span>
            </button>
            <button
              onClick={() => navigate('/team/join')}
              className="btn-secondary mt-2 w-full flex items-center justify-center gap-2 text-xs py-2 cursor-pointer"
            >
              <Users size={14} />
              <span>Join Team</span>
            </button>
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
        <main className="dashboard-content">
          {activeTab === 'command-center' ? (
            <div className="flex flex-col gap-4 w-full">
              {/* Project selector dropdown when user has multiple projects */}
              {activeProjectsList.length > 1 && (
                <div className="flex items-center gap-2 mb-2 bg-white/80 border border-brand-100 px-4 py-2 rounded-xl w-fit shadow-2xs">
                  <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest">Select Workspace:</span>
                  <select 
                    value={currentProjectId} 
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold text-neutral-800 focus:outline-hidden cursor-pointer"
                  >
                    {activeProjectsList.map(proj => (
                      <option key={proj._id} value={proj._id}>{proj.projectName}</option>
                    ))}
                  </select>
                </div>
              )}

              {loadingProjects ? (
                <div className="flex flex-col justify-center items-center py-20 text-slate-400 gap-3 bg-white border border-brand-100 rounded-2xl shadow-xs">
                  <RefreshCw className="animate-spin text-brand-500" size={28} />
                  <span className="text-xs font-semibold tracking-wide text-neutral-500">Loading your workspace projects...</span>
                </div>
              ) : currentProjectId ? (
                <HackathonCommandCenter 
                  projectId={currentProjectId} 
                  onBack={() => setActiveTab('dashboard')} 
                />
              ) : (
                <div className="glass p-10 flex flex-col items-center justify-center text-center gap-4 bg-white border border-brand-100 rounded-2xl shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">
                    <Flame size={26} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-neutral-900 text-lg">No Active Projects Found</h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-normal">
                      The Hackathon Command Center requires a project linked to your squad. Create a squad with a project or visit your team workspace to configure one.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => navigate('/team/create')} className="btn-primary text-xs">Create Squad</button>
                    <button onClick={() => navigate('/team/join')} className="btn-secondary text-xs">Join Squad</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-grid">
            
            {/* Left Side Info Pane (Spans 2 columns) */}
            <div className="lg:col-span-2 flex flex-col gap-6">


              {/* My Teams Section */}
              <div className="dashboard-card border-l-4 border-l-emerald-500 glow-blue">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-emerald-600" />
                    <span className="font-bold text-sm uppercase tracking-wider text-neutral-500">My Squads</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/team/create')}
                      className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => navigate('/team/join')}
                      className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                </div>

                {loadingTeams ? (
                  <div className="flex items-center gap-2.5 py-6 justify-center bg-neutral-50 border border-dashed border-neutral-200 rounded-xl text-neutral-500 text-xs">
                    <RefreshCw className="animate-spin text-brand-500" size={14} />
                    <span>Scanning network for squads...</span>
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">No Squads Joined</h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-[280px] leading-normal">
                        You are not a member of any squad. Initiate a new team or enter an invite code to join.
                      </p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => navigate('/team/create')}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Create Team
                      </button>
                      <button
                        onClick={() => navigate('/team/join')}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Join Team
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 mt-2">
                    {teams.map((t) => (
                      <div
                        key={t._id}
                        className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-300 transition-all shadow-2xs"
                      >
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h4 className="font-bold text-sm text-neutral-900 truncate">{t.teamName}</h4>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2 max-w-[500px]">
                            {t.description || 'No description provided.'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            <Users size={12} className="text-neutral-400" />
                            <span>
                              {t.members ? t.members.length : 0}{' '}
                              {t.members && t.members.length === 1 ? 'member' : 'members'}
                            </span>
                          </div>

                          {/* Linked Project Summary */}
                          {loadingProjects ? (
                            <div className="text-[10px] text-neutral-400 mt-2 italic">
                              Loading project details...
                            </div>
                          ) : projects[t._id] ? (
                            <div className="mt-3 p-3 bg-white border border-neutral-200 rounded-lg flex flex-col gap-2">
                              <div className="flex justify-between items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FolderGit2 size={13} className="text-brand-500 shrink-0" />
                                  <span className="font-bold text-xs text-neutral-850 truncate">
                                    {projects[t._id].projectName}
                                  </span>
                                </div>
                                {getStatusBadge(projects[t._id].status)}
                              </div>
                              {projects[t._id].track && (
                                <span className="text-[10px] text-neutral-400 font-medium">
                                  Track:{' '}
                                  <strong className="text-neutral-600 font-semibold">
                                    {projects[t._id].track}
                                  </strong>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="mt-3 px-2.5 py-1.5 bg-neutral-100/40 border border-dashed border-neutral-200 rounded-lg text-[10px] text-neutral-400 inline-flex items-center gap-1.5 font-medium w-fit">
                              <FolderGit2 size={11} className="opacity-50" />
                              <span>No active project configured</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/team/${t._id}`)}
                          className="btn-primary text-xs py-1.5 px-3 shrink-0 self-end md:self-center"
                        >
                          Workspace
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Task Metrics */}
              <div className="dashboard-card glow-blue">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm uppercase tracking-wider text-neutral-500">Active Task Metrics</span>
                  <span className="status-badge bg-neutral-50 border-neutral-200 text-neutral-500 text-[9px] font-mono">Updated just now</span>
                </div>
                <div className="flex flex-col gap-2 mt-2 text-xs text-neutral-400">
                  {(() => {
                    let total = 0, completed = 0, inProgress = 0;
                    Object.values(projects).forEach((p) => {
                      if (p?.taskPlan?.assignments) {
                        p.taskPlan.assignments.forEach((a) => {
                          a.assignedTasks?.forEach((t) => {
                            total++;
                            if (t.status === 'Completed') completed++;
                            else if (t.status === 'In Progress') inProgress++;
                          });
                        });
                      }
                    });
                    const pending = total - completed - inProgress;
                    return (
                      <>
                        <div>Total Tasks: {total}</div>
                        <div>Completed: {completed}</div>
                        <div>In Progress: {inProgress}</div>
                        <div>Pending: {pending}</div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="dashboard-card quick-actions">
                <div className="flex flex-col gap-2">
                  <button className="btn-primary text-xs" onClick={() => navigate('/team/create')}>Create Team</button>
                  <button className="btn-secondary text-xs" onClick={() => navigate('/team/join')}>Join Team</button>
                  <button className="btn-primary text-xs" onClick={() => navigate('/profile')}>Edit Profile</button>
                  <button className="btn-primary text-xs" onClick={() => navigate('/chat')}>Open Chat</button>
                </div>
              </div>
            </div>

            {/* Right Side Info Pane */}
            <div className="flex flex-col gap-6 lg:col-span-1">

              {/* Developer Profile Card */}
              <div className="dashboard-card border-t-4 border-t-brand-500 glow-blue">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm uppercase tracking-wider text-neutral-500">Developer Profile</span>
                  <span className="status-badge badge-active flex items-center gap-1 text-[9px]">
                    <UserCheck size={11} />
                    Verified
                  </span>
                </div>

                {loadingProfile ? (
                  <div className="flex items-center gap-2 py-4 text-neutral-500 text-xs font-semibold justify-center">
                    <RefreshCw className="animate-spin text-brand-500" size={14} />
                    <span>Querying DB Node...</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200/60 p-4 rounded-xl">
                      {activeUser?.avatar ? (
                        <img src={activeUser.avatar} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-brand-500 object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-950 text-white flex items-center justify-center text-lg font-bold shadow-xs">
                          {activeUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-neutral-900 text-sm truncate">{activeUser?.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
                          ID: {activeUser?._id || activeUser?.id || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 text-xs mt-1">
                      <div className="flex justify-between items-center border-b border-neutral-200/60 pb-2.5">
                        <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">EMAIL ADDRESS:</span>
                        <span className="text-neutral-900 font-semibold truncate max-w-[170px]" title={activeUser?.email}>
                          {activeUser?.email}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-200/60 pb-2.5">
                        <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">AUTH SCHEME:</span>
                        <span className={`font-bold tracking-tight text-[10px] ${
                          activeUser?.googleId
                            ? 'text-emerald-700'
                            : activeUser?.githubId
                            ? 'text-neutral-800'
                            : 'text-brand-600'
                        }`}>
                          {activeUser?.googleId
                            ? 'GOOGLE OAUTH'
                            : activeUser?.githubId
                            ? 'GITHUB OAUTH'
                            : 'STANDARD JWT'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-neutral-200/60 pb-2.5">
                        <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">SKILLS DIRECTORY:</span>
                        <span
                          className="text-neutral-900 font-semibold truncate max-w-[150px]"
                          title={activeUser?.skills ? activeUser.skills.join(', ') : 'None'}
                        >
                          {activeUser?.skills && activeUser.skills.length > 0
                            ? activeUser.skills.join(', ')
                            : 'None configured'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">CREATED AT:</span>
                        <span className="text-neutral-900 font-semibold font-mono text-[10px]">
                          {activeUser?.createdAt
                            ? new Date(activeUser.createdAt).toLocaleDateString()
                            : new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/profile')}
                      className="btn-secondary text-xs w-full py-2 flex items-center justify-center gap-1.5 shadow-2xs mt-2"
                    >
                      <Settings size={13} />
                      Edit Developer Profile
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

export default Dashboard;
