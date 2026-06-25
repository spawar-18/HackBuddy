import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../services/api';
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
  Activity, BarChart3, Database
} from 'lucide-react';
import HackathonCommandCenter from '../components/HackathonCommandCenter';

// ─── SVG Chart Helpers for Premium Dashboard Data Visualization ────────────────
const CircularProgress = ({ percentage = 75, size = 48, strokeWidth = 4, color = '#00f0ff' }) => {
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
            filter: `drop-shadow(0 0 3px ${color})` 
          }}
        />
      </svg>
      <div className="absolute text-[9px] font-black text-white font-mono">{percentage}%</div>
    </div>
  );
};

const DonutChart = ({ percentage = 85, size = 60, strokeWidth = 5, color = '#00f0ff', label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.03)"
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
            transition: 'stroke-dashoffset 1s ease-in-out',
            filter: `drop-shadow(0 0 4px ${color})` 
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[10px] font-extrabold text-white leading-none font-mono">{percentage}%</span>
        {label && <span className="text-[5px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'rgba(0, 240, 255, 0.6)' }}>{label}</span>}
      </div>
    </div>
  );
};

const Sparkline = ({ points = [10, 15, 8, 22, 14, 25, 18, 30], width = 90, height = 20, color = '#00f0ff', id = 'spark' }) => {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const len = points.length;

  const pathD = points
    .map((val, idx) => {
      const x = (idx / (len - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible select-none pointer-events-none">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${id})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fixApplied, setFixApplied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 34, minutes: 8, seconds: 58 });
  const [commandCenterData, setCommandCenterData] = useState(null);
  const [githubAnalytics, setGithubAnalytics] = useState(null);
  const [loadingCC, setLoadingCC] = useState(false);
  const [loadingGH, setLoadingGH] = useState(false);
  const [countdown, setCountdown] = useState(null);
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
  const [copilotQuery, setCopilotQuery] = useState('');
  const [syncingRepo, setSyncingRepo] = useState(false);
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

  // Fetch Command Center dashboard and GitHub analytics data
  useEffect(() => {
    if (!currentProjectId) {
      setCommandCenterData(null);
      setGithubAnalytics(null);
      return;
    }

    const fetchTelemetry = async () => {
      try {
        setLoadingCC(true);
        setLoadingGH(true);
        
        const [ccRes, ghRes] = await Promise.allSettled([
          getCommandCenterDashboard(currentProjectId),
          getRepositoryAnalytics(currentProjectId)
        ]);

        if (ccRes.status === 'fulfilled' && ccRes.value && ccRes.value.success) {
          setCommandCenterData(ccRes.value);
        } else {
          setCommandCenterData(null);
        }

        if (ghRes.status === 'fulfilled' && ghRes.value && ghRes.value.success) {
          setGithubAnalytics(ghRes.value);
        } else {
          setGithubAnalytics(null);
        }
      } catch (err) {
        console.error('Error fetching dashboard telemetry:', err);
      } finally {
        setLoadingCC(false);
        setLoadingGH(false);
      }
    };

    fetchTelemetry();
    // Poll every 30 seconds for telemetry updates
    const interval = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(interval);
  }, [currentProjectId]);

  // Countdown timer clock tick based on command center config
  useEffect(() => {
    const config = commandCenterData?.config;
    if (!config || !config.endTime) {
      setCountdown(null);
      return;
    }

    const tick = () => {
      const endTime = new Date(config.endTime).getTime();
      const now = new Date().getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isCompleted: true
        });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown({
          days,
          hours,
          minutes,
          seconds,
          isCompleted: false
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [commandCenterData?.config?.endTime]);

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

  const handleAskCopilot = (e) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    const firstTeam = teams[0];
    if (firstTeam) {
      navigate(`/team/${firstTeam._id}`, { state: { initialView: 'mentor-chat', query: copilotQuery } });
    } else {
      navigate('/team/create');
    }
  };

  const navigateToWorkspace = (viewName) => {
    const firstTeam = teams[0];
    if (firstTeam) {
      navigate(`/team/${firstTeam._id}`, { state: { initialView: viewName } });
    } else {
      navigate('/team/create');
    }
  };

  const activeUser = profileData || user;
  const activeProject = activeProjectsList.find(p => p._id === currentProjectId) || activeProjectsList[0];
  const activeTeam = teams.find(t => t._id === activeProject?.teamId) || teams[0];

  // ─── Extract Real Metrics from Selected/First Project ───
  const healthPercent = activeProject?.projectReview?.feasibilityScore || 85;
  const healthStatus = healthPercent >= 80 ? 'OPTIMAL' : healthPercent >= 50 ? 'STABLE' : 'CRITICAL';
  
  // Clean one-line AI summary from projectReview execution strategy or problemSolutionAlignment
  let healthSummary = 'Core stack looks solid. Ready for feature splitting.';
  if (activeProject?.projectReview?.executionStrategy?.length > 0) {
    healthSummary = activeProject.projectReview.executionStrategy[0];
  } else if (activeProject?.projectReview?.problemSolutionAlignment) {
    healthSummary = activeProject.projectReview.problemSolutionAlignment;
  }
  if (healthSummary.length > 80) {
    healthSummary = healthSummary.substring(0, 77) + '...';
  }

  // Winning Probability calculations
  const winningPercent = Math.min(95, Math.max(45, Math.round((healthPercent * 0.9) + (activeProject?.status === 'Completed' ? 10 : 0))));
  const aiConfidence = Math.min(98, Math.round(80 + (healthPercent * 0.15)));
  const riskStatus = winningPercent >= 75 ? 'LOW RISK' : winningPercent >= 55 ? 'MODERATE RISK' : 'HIGH RISK';
  const riskColor = winningPercent >= 75 ? '#10b981' : winningPercent >= 55 ? '#f59e0b' : '#ef4444';

  // Repository Health
  const repoConnected = githubAnalytics?.connected || false;
  const repoScore = repoConnected ? (githubAnalytics?.healthScore || 0) : 0;
  const repoStatus = repoConnected ? (githubAnalytics?.healthStatus || 'CONNECTED') : 'NOT CONNECTED';
  const lastSyncTime = repoConnected && githubAnalytics?.lastSyncedAt 
    ? new Date(githubAnalytics.lastSyncedAt).toLocaleString() 
    : 'Never';

  // Task statistics
  let calcTotal = 0;
  let calcCompleted = 0;
  let calcInProgress = 0;
  let calcBlocked = 0;

  if (activeProject?.taskPlan?.assignments) {
    activeProject.taskPlan.assignments.forEach(a => {
      a.assignedTasks?.forEach(t => {
        calcTotal++;
        if (t.status === 'Completed') calcCompleted++;
        else if (t.status === 'In Progress') calcInProgress++;
        else if (t.status === 'Blocked' || t.marketplaceStatus === 'SwapRequested') calcBlocked++;
      });
    });
  }

  const totalTasks = calcTotal || 18;
  const completedTasks = calcCompleted || 12;
  const inProgressTasks = calcInProgress || 4;
  const blockedTasks = calcBlocked || 2;
  const pendingTasks = totalTasks - completedTasks - inProgressTasks;
  const verificationRate = Math.round((completedTasks / totalTasks) * 100) || 70;

  const teamMembers = activeTeam?.members || [];
  const displayMembers = teamMembers.map((m, idx) => {
    const name = typeof m === 'object' ? (m.name || m.email || 'Operative') : m;
    const initials = name.charAt(0).toUpperCase();
    let assignedCount = 0;
    let completedCount = 0;
    if (activeProject?.taskPlan?.assignments) {
      const assignment = activeProject.taskPlan.assignments.find(a => {
        const aName = a.member;
        return aName && name.toLowerCase().includes(aName.toLowerCase());
      });
      if (assignment?.assignedTasks) {
        assignedCount = assignment.assignedTasks.length;
        completedCount = assignment.assignedTasks.filter(t => t.status === 'Completed').length;
      }
    }
    let total = assignedCount || (6 - idx * 2);
    let completed = completedCount || (4 - idx * 1);
    
    // Try to get real metrics from CommandCenter memberProgress
    if (commandCenterData?.memberProgress) {
      const match = commandCenterData.memberProgress.find(mp => 
        mp.member && mp.member.toLowerCase() === name.toLowerCase()
      );
      if (match) {
        total = match.total;
        completed = match.completed;
      }
    }
    
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get real commits count from GitHub contributors
    let commitsCount = 0;
    if (repoConnected && githubAnalytics?.contributors) {
      const ghCont = githubAnalytics.contributors.find(c => 
        c.login.toLowerCase().includes(name.toLowerCase()) || 
        (c.name && c.name.toLowerCase().includes(name.toLowerCase()))
      );
      if (ghCont) {
        commitsCount = ghCont.commits;
      }
    }
    
    return { name, initials, total, completed, pct, commits: commitsCount };
  });

  return (
    <div className="dashboard-container">
      {/* Top Navigation Header */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center text-sm font-bold shadow-xs">H</div>
          <span className="font-extrabold text-lg tracking-tight font-sans text-neutral-900">
            Hack<span className="text-brand-500">Buddy</span>
          </span>
          <span className="status-badge badge-active ml-2.5 text-[10px] flex items-center gap-1">
            <span className="status-pulse bg-emerald-500"></span>
            ACTIVE
          </span>
        </div>

        {/* Sprint Countdown Display */}
        <div 
          onClick={() => setActiveTab('command-center')} 
          className="hidden sm:flex items-center gap-2.5 font-mono bg-neutral-50 border border-neutral-200/60 rounded-full px-3 py-1 text-xs shadow-2xs cursor-pointer hover:bg-neutral-100 transition-all"
          title="Go to AI Command Center to configure hackathon milestones"
        >
          <Clock size={13} className="text-neutral-500" />
          <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">HUD CLOCK:</span>
          <span className="text-neutral-900 font-bold tracking-wider text-xs">
            {commandCenterData?.configured && countdown ? (
              countdown.isCompleted ? '00:00:00' : (
                `${String(countdown.days * 24 + countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`
              )
            ) : (
              'Not Configured'
            )}
          </span>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-4">

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
              className={`menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2 ${activeTab === 'dashboard' ? 'active font-bold text-white' : ''
                }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('command-center')}
              className={`menu-item w-full border-0 cursor-pointer text-left flex items-center gap-3 py-2 transition-all ${activeTab === 'command-center'
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

            <button
              onClick={() => {
                const firstTeam = teams[0];
                if (firstTeam) {
                  navigate(`/team/${firstTeam._id}`, { state: { initialView: 'task-plan' } });
                } else {
                  navigate('/team/create');
                }
              }}
              className="menu-item w-full bg-transparent border-0 cursor-pointer text-left flex items-center gap-3 py-2"
            >
              <Cpu size={16} />
              <span>AI Task Splitter</span>
            </button>
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
            <button
              onClick={() => navigate('/profile')}
              className="btn-secondary mt-2 w-full flex items-center justify-center gap-2 text-xs py-2 cursor-pointer"
            >
              <User size={14} />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="btn-secondary mt-2 w-full flex items-center justify-center gap-2 text-xs py-2 cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Open Chat</span>
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
            <div className="flex flex-col gap-6 w-full animate-fade-in">
              {/* TOP ROW: Hero Metrics (3-columns) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: AI Project Health */}
                <div className="dashboard-card glow-blue flex-row items-center gap-4 p-4 border-l-4 border-l-[#00f0ff]">
                  <CircularProgress percentage={healthPercent} size={56} strokeWidth={5} color="#00f0ff" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div style={{ color: '#94a3b8' }} className="text-[10px] font-black tracking-widest uppercase">AI Project Health</div>
                      <div className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        {healthStatus}
                      </div>
                    </div>
                    <div style={{ color: '#fff' }} className="text-lg font-black leading-none font-mono mt-0.5">{healthPercent}%</div>
                    <div style={{ color: '#cbd5e1' }} className="text-[10px] leading-tight mt-1 line-clamp-2">
                      {healthSummary}
                    </div>
                  </div>
                </div>

                {/* Card 2: Repository Health */}
                <div 
                  onClick={() => navigateToWorkspace('github')}
                  className="dashboard-card glow-blue flex-row items-center gap-4 p-4 border-l-4 border-l-[#00f0ff] cursor-pointer hover:bg-neutral-800/25 transition-all"
                  title={repoConnected ? "Click to view Git details" : "Click to connect GitHub Repository"}
                >
                  <CircularProgress percentage={repoScore} size={56} strokeWidth={5} color="#00f0ff" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div style={{ color: '#94a3b8' }} className="text-[10px] font-black tracking-widest uppercase">Repo Health</div>
                      <div className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${repoConnected ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
                        {repoStatus}
                      </div>
                    </div>
                    <div style={{ color: '#fff' }} className="text-lg font-black leading-none font-mono mt-0.5">
                      {repoConnected ? `${repoScore}/100` : '—'}
                    </div>
                    <div style={{ color: '#94a3b8' }} className="text-[10px] mt-1 font-mono">
                      {repoConnected ? `Last Sync: ${lastSyncTime}` : 'No repo connected'}
                    </div>
                  </div>
                </div>

                {/* Card 3: Hackathon Countdown */}
                <div 
                  onClick={() => setActiveTab('command-center')}
                  className="dashboard-card glow-blue flex-row items-center gap-4 p-4 border-l-4 border-l-orange-500 cursor-pointer hover:bg-neutral-800/25 transition-all"
                  title="Click to go to AI Command Center HUD"
                >
                  <div className="relative shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-neutral-900 border-2 border-orange-500/40">
                    <Clock size={20} className="text-orange-500 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div style={{ color: '#94a3b8' }} className="text-[10px] font-black tracking-widest uppercase">T-MINUS COUNTDOWN</div>
                      <div className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-orange-500/30 text-orange-400 bg-orange-500/10 font-mono ${countdown ? 'animate-pulse' : ''}`}>
                        {commandCenterData?.configured ? (countdown?.isCompleted ? 'COMPLETED' : 'LIVE') : 'NOT SET'}
                      </div>
                    </div>
                    <div style={{ color: '#fff' }} className="text-lg font-extrabold leading-none font-mono mt-0.5 tracking-wider">
                      {commandCenterData?.configured && countdown ? (
                        countdown.isCompleted ? '00:00:00' : (
                          `${String(countdown.days * 24 + countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`
                        )
                      ) : (
                        '— : — : —'
                      )}
                    </div>
                    <div style={{ color: '#94a3b8' }} className="text-[9px] mt-1 uppercase font-semibold">
                      Phase: <span className="text-orange-400 font-black">
                        {commandCenterData?.configured ? (
                          commandCenterData.config.status === 'Completed' ? 'SUBMISSION' :
                          commandCenterData.config.status === 'Running' ? 'DEVELOPMENT' : 'PLANNING'
                        ) : 'NOT CONFIGURED'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECOND ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: AI Copilot Card */}
                <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-[#00f0ff] p-5 h-full">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} style={{ color: '#00f0ff' }} className="animate-pulse" />
                        <div style={{ color: '#fff' }} className="text-[11px] font-black tracking-widest uppercase font-mono">HACKBUDDY AI COPILOT</div>
                      </div>
                      <div className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20 font-mono">
                        v2.4-ACTIVE
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 text-xs leading-relaxed">
                      <div className="p-3 bg-neutral-900/60 border border-brand-200/20 rounded-xl">
                        <div style={{ color: '#94a3b8' }} className="text-[9px] font-black font-mono uppercase">SYSTEM OPERATIONAL</div>
                        <div style={{ color: '#fff' }} className="font-extrabold mt-1 font-mono">Welcome back, {activeUser?.name || 'Operative'}!</div>
                        <div style={{ color: '#cbd5e1' }} className="mt-1.5 text-[11px]">
                          {activeProject 
                            ? `I've analyzed project "${activeProject.projectName}". Ready for telemetry review.`
                            : "No squad configured yet. Ready to initialize squad workspace."}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div style={{ color: '#94a3b8' }} className="text-[9px] font-bold uppercase w-24 shrink-0 mt-0.5">Recommendation:</div>
                          <div style={{ color: '#e2e8f0' }} className="text-[11px] flex-1 text-right">
                            {activeProject?.projectReview?.improvementSuggestions?.[0] || "Refactor project requirements into features."}
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-brand-200/10 pt-2">
                          <div style={{ color: '#94a3b8' }} className="text-[9px] font-bold uppercase">Top Priority:</div>
                          <div style={{ color: '#f59e0b' }} className="font-extrabold text-[10px] font-mono">
                            {activeProject?.taskPlan?.criticalTasks?.[0] || "Generate Project Backlog"}
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-brand-200/10 pt-2">
                          <div style={{ color: '#94a3b8' }} className="text-[9px] font-bold uppercase">Current Risk:</div>
                          <div style={{ color: '#f87171' }} className="font-bold text-[10px] font-mono">
                            {activeProject?.projectReview?.projectRisks?.[0] || "Lack of detailed feature spec"}
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-brand-200/10 pt-2">
                          <div style={{ color: '#94a3b8' }} className="text-[9px] font-bold uppercase">Suggested Action:</div>
                          <div style={{ color: '#00f0ff' }} className="font-semibold text-[10px] font-mono">
                            {activeProject?.taskPlanGeneratedAt ? "Review Backlog" : "Initialize Backlog Splitter"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ask Copilot Form */}
                  <form onSubmit={handleAskCopilot} className="mt-4 flex gap-2 border border-brand-200/30 bg-neutral-950 p-1.5 rounded-xl">
                    <input
                      type="text"
                      placeholder="Ask AI anything..."
                      value={copilotQuery}
                      onChange={(e) => setCopilotQuery(e.target.value)}
                      className="bg-transparent border-0 text-xs text-white focus:outline-hidden px-2 flex-1 font-mono placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={!copilotQuery.trim()}
                      style={{ backgroundColor: '#0077ff' }}
                      className="p-2 hover:bg-[#00f0ff] text-white hover:text-black rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer border-0"
                    >
                      <Sparkles size={14} />
                    </button>
                  </form>
                </div>

                {/* CENTER: Project Overview */}
                <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-[#00a2ff] p-5 h-full">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                      <div className="flex items-center gap-2">
                        <FolderGit2 size={16} style={{ color: '#00a2ff' }} />
                        <div style={{ color: '#fff' }} className="text-[11px] font-black tracking-widest uppercase font-mono">PROJECT WORKSPACES</div>
                      </div>
                      <div style={{ color: '#94a3b8' }} className="text-[9px] font-bold font-mono">
                        {teams.length} Connected
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {teams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                          <div style={{ color: '#94a3b8' }} className="text-xs italic">No active squads found.</div>
                          <button onClick={() => navigate('/team/create')} className="btn-primary text-xs py-1 mt-1">Create Team</button>
                        </div>
                      ) : (
                        teams.map((team) => {
                          const proj = projects[team._id];
                          let projCompleted = 0, projTotal = 0;
                          if (proj && proj.taskPlan?.assignments) {
                            proj.taskPlan.assignments.forEach(a => {
                              a.assignedTasks?.forEach(t => {
                                projTotal++;
                                if (t.status === 'Completed') projCompleted++;
                              });
                            });
                          }
                          const projPercent = projTotal > 0 ? Math.round((projCompleted / projTotal) * 100) : (proj ? 40 : 0);
                          const isCurrent = proj && proj._id === currentProjectId;

                          return (
                            <div
                              key={team._id}
                              onClick={() => {
                                if (proj) {
                                  setSelectedProjectId(proj._id);
                                } else {
                                  navigate(`/team/${team._id}`);
                                }
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${isCurrent ? 'bg-[#00f0ff]/5 border-[#00f0ff]' : 'bg-neutral-900/30 border-brand-200/20 hover:border-brand-200/50'}`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div style={{ color: '#fff' }} className="font-extrabold text-xs truncate font-mono">
                                    {team.teamName}
                                  </div>
                                  <div style={{ color: '#94a3b8' }} className="text-[9px] font-medium truncate mt-0.5">
                                    {proj ? `Project: ${proj.projectName} | Track: ${proj.track || 'Unspecified'}` : 'No active project linked'}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <div className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase ${
                                    proj
                                      ? (proj.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : proj.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')
                                      : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                                  }`}>
                                    {proj ? proj.status : 'No Project'}
                                  </div>
                                </div>
                              </div>

                              {/* Progress bar */}
                              {proj && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-brand-200/10">
                                    <div className="bg-[#00f0ff] h-full rounded-full" style={{ width: `${projPercent}%`, boxShadow: '0 0 4px #00f0ff' }}></div>
                                  </div>
                                  <div style={{ color: '#fff' }} className="text-[9px] font-bold font-mono">{projPercent}%</div>
                                </div>
                              )}

                              <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-brand-200/10 pt-2 mt-1">
                                <div style={{ color: '#94a3b8' }} className="flex items-center gap-1 font-mono">
                                  <Users size={10} className="text-slate-400" />
                                  <span>{team.members?.length || 1} Member(s)</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/team/${team._id}`);
                                  }}
                                  style={{ color: '#00f0ff' }}
                                  className="font-extrabold hover:underline uppercase flex items-center gap-0.5 cursor-pointer bg-transparent border-0 text-[9px]"
                                >
                                  Workspace <ArrowUpRight size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/team/create')}
                    className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Plus size={13} />
                    Launch New Squad Workspace
                  </button>
                </div>

                {/* RIGHT: Developer Profile */}
                <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-[#00f0ff] p-5 h-full">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} style={{ color: '#00f0ff' }} />
                        <div style={{ color: '#fff' }} className="text-[11px] font-black tracking-widest uppercase font-mono">OPERATIVE PROFILE</div>
                      </div>
                      <div className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        VERIFIED
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-neutral-900/40 p-3 rounded-xl border border-brand-200/10">
                      {activeUser?.avatar ? (
                        <img src={activeUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-[#00f0ff] object-cover" />
                      ) : (
                        <div style={{ color: '#fff' }} className="w-10 h-10 rounded-full bg-neutral-950 text-white flex items-center justify-center text-sm font-extrabold shadow-sm border border-[#00f0ff]/40 font-mono">
                          {activeUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div style={{ color: '#fff' }} className="font-extrabold text-xs truncate font-mono">{activeUser?.name}</div>
                        <div style={{ color: '#94a3b8' }} className="text-[8px] font-mono mt-0.5 truncate uppercase">ROLE: SQUAD LEAD</div>
                      </div>
                    </div>

                    {/* Compact stats */}
                    <div className="flex flex-col gap-3 text-[10px]">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div style={{ color: '#94a3b8' }} className="uppercase font-bold text-[9px]">Active Squads:</div>
                          <div style={{ color: '#fff' }} className="font-bold font-mono">{teams.length} Connected</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div style={{ color: '#94a3b8' }} className="uppercase font-bold text-[9px]">Skills Matrix:</div>
                          <div style={{ color: '#fff' }} className="font-extrabold truncate max-w-[130px] font-mono" title={activeUser?.skills?.join(', ')}>
                            {activeUser?.skills?.length > 0 ? activeUser.skills.slice(0, 3).join(', ') : 'React, Node, AI'}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div style={{ color: '#94a3b8' }} className="uppercase font-bold text-[9px]">Linked Repository:</div>
                          <div style={{ color: '#00f0ff' }} className="font-bold font-mono truncate max-w-[130px]">
                            {activeUser?.githubId ? 'github.com/auth' : 'github.com/hackbuddy'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/profile')}
                    className="btn-secondary text-xs w-full py-2 flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Settings size={13} />
                    Modify Dev Profile
                  </button>
                </div>
              </div>

              {/* THIRD ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: AI Command Center Snapshot */}
                <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-[#00f0ff] p-5 h-full">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard size={16} style={{ color: '#00f0ff' }} />
                        <div style={{ color: '#fff' }} className="text-[11px] font-black tracking-widest uppercase font-mono">COMMAND SNAPSHOT</div>
                      </div>
                      <div className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                        SYNCED
                      </div>
                    </div>

                    {/* Overall Progress Bar */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <div className="flex justify-between items-center text-[10px]">
                        <div style={{ color: '#94a3b8' }} className="uppercase font-bold">Overall Task Completion</div>
                        <div style={{ color: '#fff' }} className="font-extrabold font-mono">{verificationRate}%</div>
                      </div>
                      <div className="bg-neutral-950 h-2 rounded-full overflow-hidden border border-brand-200/10">
                        <div className="bg-[#00f0ff] h-full rounded-full" style={{ width: `${verificationRate}%`, boxShadow: '0 0 5px #00f0ff' }}></div>
                      </div>
                    </div>

                    {/* Grid of Mini KPI Cards (2x2) */}
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      
                      {/* Completed */}
                      <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-emerald-500/20 flex flex-col gap-1 text-left">
                        <div style={{ color: '#94a3b8' }} className="text-[8px] font-black uppercase tracking-wider">Completed</div>
                        <div className="text-base font-black text-emerald-400 font-mono">{completedTasks}</div>
                        <div style={{ color: '#64748b' }} className="text-[8px] font-semibold font-mono">Verified SLA</div>
                      </div>

                      {/* Pending */}
                      <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-[#00f0ff]/20 flex flex-col gap-1 text-left">
                        <div style={{ color: '#94a3b8' }} className="text-[8px] font-black uppercase tracking-wider">Pending</div>
                        <div className="text-base font-black text-[#00f0ff] font-mono">{pendingTasks}</div>
                        <div style={{ color: '#64748b' }} className="text-[8px] font-semibold font-mono">In Backlog</div>
                      </div>

                      {/* Blocked */}
                      <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-rose-500/20 flex flex-col gap-1 text-left">
                        <div style={{ color: '#94a3b8' }} className="text-[8px] font-black uppercase tracking-wider">Blocked</div>
                        <div className="text-base font-black text-rose-400 font-mono">{blockedTasks}</div>
                        <div style={{ color: '#64748b' }} className="text-[8px] font-semibold font-mono">Action Needed</div>
                      </div>

                      {/* Verification Rate */}
                      <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-purple-500/20 flex flex-col gap-1 text-left">
                        <div style={{ color: '#94a3b8' }} className="text-[8px] font-black uppercase tracking-wider">Verification</div>
                        <div className="text-base font-black text-purple-400 font-mono">{verificationRate}%</div>
                        <div style={{ color: '#64748b' }} className="text-[8px] font-semibold font-mono">Accuracy</div>
                      </div>

                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('command-center')}
                    className="btn-secondary text-xs w-full py-2 flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Flame size={13} className="text-orange-500" />
                    Open AI Command Center HUD
                  </button>
                </div>

                {/* CENTER: AI Activity Feed */}
                <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-[#00a2ff] p-5 h-full">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                      <div className="flex items-center gap-2">
                        <Activity size={16} style={{ color: '#00a2ff' }} className="animate-pulse" />
                        <div style={{ color: '#fff' }} className="text-[11px] font-black tracking-widest uppercase font-mono">AI LOG & ACTIVITY FEED</div>
                      </div>
                      <div className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm bg-neutral-950 text-[#00a2ff] border border-brand-200/20 font-mono">
                        REAL-TIME
                      </div>
                    </div>

                    {/* Timeline List */}
                    <div className="relative flex flex-col gap-4 mt-2 pl-4 max-h-[220px] overflow-y-auto">
                      {/* Vertical line connector */}
                      <div className="absolute left-[7px] top-1.5 bottom-1.5 w-0.5 bg-brand-200/20"></div>

                      {commandCenterData?.timeline && commandCenterData.timeline.length > 0 ? (
                        commandCenterData.timeline.slice(0, 5).map((evt, idx) => {
                          const isSuccess = evt.type === 'Success' || evt.event.includes('Completed');
                          const isMilestone = evt.type === 'Milestone' || evt.event.includes('Deadline');
                          const colorClass = isSuccess ? 'bg-emerald-400' : isMilestone ? 'bg-purple-400' : 'bg-blue-400';
                          const timeStr = evt.time ? new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                          
                          return (
                            <div key={idx} className="relative flex flex-col gap-0.5 text-left">
                              <div className={`absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full ${colorClass} border-2 border-neutral-950`}></div>
                              <div className="flex justify-between items-center">
                                <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono truncate max-w-[170px]">{evt.event}</div>
                                <div style={{ color: '#64748b' }} className="text-[8px] font-mono shrink-0">{timeStr}</div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="relative flex flex-col gap-0.5 text-left">
                          <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-neutral-950"></div>
                          <div className="flex justify-between items-center">
                            <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono">No telemetry events yet</div>
                          </div>
                          <div style={{ color: '#94a3b8' }} className="text-[9px] leading-snug">
                            Connect your repository and update tasks to stream logs here.
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ color: '#64748b' }} className="text-[8px] text-center font-mono mt-2">
                      LOGS LIVE STREAMING ON WORKSPACE CHANNELS
                    </div>
                  </div>
                </div>

                {/* RIGHT: GitHub Intelligence */}
                <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-[#00f0ff] p-5 h-full">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                      <div className="flex items-center gap-2">
                        <GithubIcon size={16} style={{ color: '#00f0ff' }} />
                        <div style={{ color: '#fff' }} className="text-[11px] font-black tracking-widest uppercase font-mono">GITHUB INTELLIGENCE</div>
                      </div>
                      <div className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm font-mono ${
                        repoConnected 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700 font-mono'
                      }`}>
                        {repoConnected ? 'LINKED' : 'NOT LINKED'}
                      </div>
                    </div>

                    {repoConnected ? (
                      <>
                        {/* Stats — dynamic metrics */}
                        <div className="grid grid-cols-2 gap-3 text-[10px]">
                          {[
                            { label: 'Commits Today', value: githubAnalytics?.stats?.commitsToday ?? 0, color: 'text-brand-400' },
                            { label: 'Open PRs', value: githubAnalytics?.stats?.openPRCount ?? 0, color: 'text-emerald-400' },
                            { label: 'Open Issues', value: githubAnalytics?.stats?.openIssueCount ?? 0, color: 'text-orange-400' },
                            { label: 'Contributors', value: githubAnalytics?.stats?.contributorCount ?? 0, color: 'text-purple-400' }
                          ].map(stat => (
                            <div key={stat.label} className="flex justify-between items-center bg-neutral-950/40 p-2 rounded-lg border border-brand-200/10 text-left">
                              <div style={{ color: '#94a3b8' }}>{stat.label}</div>
                              <div className={`font-extrabold font-mono ${stat.color}`}>{stat.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Connected Repository Info */}
                        <div className="flex flex-col gap-2.5 p-3.5 bg-neutral-950/40 rounded-xl border border-brand-200/10 text-left">
                          <div style={{ color: '#94a3b8' }} className="text-[8px] font-black uppercase tracking-wider font-mono">REPOSITORY TELEMETRY</div>
                          <div style={{ color: '#fff' }} className="text-[11px] font-bold truncate">
                            {githubAnalytics?.owner}/{githubAnalytics?.repository}
                          </div>
                          
                          {/* Languages display if available */}
                          {githubAnalytics?.languages && Object.keys(githubAnalytics.languages).length > 0 && (
                            <div style={{ color: '#00f0ff' }} className="text-[9px] font-semibold font-mono truncate mt-1">
                              {(() => {
                                const entries = Object.entries(githubAnalytics.languages);
                                const total = entries.reduce((s, [, v]) => s + v, 0);
                                return entries.slice(0, 3).map(([lang, bytes]) => `${lang} ${(bytes/total*100).toFixed(0)}%`).join(' • ');
                              })()}
                            </div>
                          )}

                          {/* Last Commit message */}
                          {githubAnalytics?.commitSummary?.lastCommitMessage && (
                            <div className="border-t border-brand-200/5 pt-2 mt-1">
                              <div style={{ color: '#64748b' }} className="text-[7px] font-black uppercase font-mono">Last Commit Message</div>
                              <div style={{ color: '#94a3b8' }} className="text-[9px] italic line-clamp-1 leading-snug mt-0.5">
                                "{githubAnalytics.commitSummary.lastCommitMessage}"
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Stats — dashes since no repo connected */}
                        <div className="grid grid-cols-2 gap-3 text-[10px]">
                          {['Commits Today', 'Open PRs', 'Open Issues', 'Contributors'].map(label => (
                            <div key={label} className="flex justify-between items-center bg-neutral-950/40 p-2 rounded-lg border border-brand-200/10 text-left">
                              <div style={{ color: '#94a3b8' }}>{label}</div>
                              <div style={{ color: '#475569' }} className="font-extrabold font-mono">—</div>
                            </div>
                          ))}
                        </div>

                        {/* Not Connected Placeholder */}
                        <div className="flex flex-col items-center justify-center gap-3 py-5 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-700/60">
                          <GithubIcon size={30} style={{ color: '#334155' }} />
                          <div className="text-center px-2">
                            <div style={{ color: '#94a3b8' }} className="text-[10px] font-bold uppercase tracking-wider">No Repository Linked</div>
                            <div style={{ color: '#64748b' }} className="text-[9px] mt-1.5 font-mono leading-relaxed">
                              Connect a GitHub repo in your team workspace to unlock commit tracking, PR monitoring, and language analytics.
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => navigateToWorkspace('github')}
                    className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5 mt-2"
                  >
                    <GithubIcon size={13} />
                    {repoConnected ? 'Manage GitHub Repo' : 'Connect GitHub Repository'}
                  </button>
                </div>
              </div>

              {/* FOURTH ROW */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* LEFT: Team Workloads */}
                <div className="dashboard-card glow-blue flex flex-col justify-between border-t-2 border-t-[#00f0ff] p-5 h-full">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-200/30">
                      <div className="flex items-center gap-2">
                        <Users size={16} style={{ color: '#00f0ff' }} />
                        <div style={{ color: '#fff' }} className="text-[11px] font-black tracking-widest uppercase font-mono">TEAM WORKLOADS</div>
                      </div>
                      <div className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm bg-neutral-950 text-[#00f0ff] border border-brand-200/20 font-mono">
                        METRICS
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {displayMembers.length === 0 ? (
                        <div style={{ color: '#94a3b8' }} className="text-xs italic text-center py-8">No squad members found. Invite teammates to split work.</div>
                      ) : (
                        displayMembers.map((m, idx) => (
                          <div key={idx} className="flex flex-col gap-1 bg-neutral-950/40 p-2.5 rounded-xl border border-brand-200/10 text-left">
                            <div className="flex justify-between items-center text-[10px]">
                              <div className="flex items-center gap-2">
                                <div style={{ color: '#fff' }} className="w-5 h-5 rounded-full bg-brand-900 border border-[#00f0ff] flex items-center justify-center text-[9px] font-extrabold font-mono">
                                  {m.initials}
                                </div>
                                <div style={{ color: '#fff' }} className="font-extrabold font-mono truncate max-w-[100px]">{m.name}</div>
                              </div>
                              <div style={{ color: '#94a3b8' }} className="font-mono">{m.completed}/{m.total} Tasks ({m.pct}%)</div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-brand-200/10">
                                <div className="bg-[#00f0ff] h-full rounded-full" style={{ width: `${m.pct}%` }}></div>
                              </div>
                              <div style={{ color: '#64748b' }} className="text-[8px] font-mono shrink-0">{m.commits} commits</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (activeTeam) navigate(`/team/${activeTeam._id}`);
                      else navigate('/team/create');
                    }}
                    className="btn-secondary text-xs w-full py-2 flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Users size={13} />
                    Manage Squad Workloads
                  </button>
                </div>
              </div>

              {/* BOTTOM ROW: Quick Actions */}
              <div className="flex flex-col gap-3 mt-2 text-left">
                <div style={{ color: '#00f0ff' }} className="font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <Wrench size={14} className="text-[#00f0ff]" />
                  <span>AI OPERATIONAL CONTROL & QUICK ACTIONS</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  
                  {/* Action 1: AI Project Review */}
                  <div
                    onClick={() => navigateToWorkspace('dashboard')}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <Activity size={24} className="text-[#00f0ff] mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">AI Project Review</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Analyze Feasibility</div>
                  </div>

                  {/* Action 2: AI Command Center */}
                  <div
                    onClick={() => setActiveTab('command-center')}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <Flame size={24} className="text-orange-500 mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">AI Command Center</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Go to HUD</div>
                  </div>

                  {/* Action 3: AI Task Splitter */}
                  <div
                    onClick={() => navigateToWorkspace('task-plan')}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <Cpu size={24} className="text-[#00a2ff] mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">AI Task Splitter</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Manage Backlog</div>
                  </div>

                  {/* Action 4: Marketplace */}
                  <div
                    onClick={() => navigateToWorkspace('marketplace')}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <Database size={24} className="text-[#00f0ff] mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">Marketplace</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Swap Tasks</div>
                  </div>

                  {/* Action 5: AI Mentor Chat */}
                  <div
                    onClick={() => navigateToWorkspace('mentor-chat')}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <MessageSquare size={24} className="text-[#00a2ff] mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">AI Mentor Chat</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Ask Questions</div>
                  </div>

                  {/* Action 6: GitHub */}
                  <div
                    onClick={() => navigateToWorkspace('github')}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <GithubIcon size={24} className="text-white mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">GitHub</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Source Control</div>
                  </div>

                  {/* Action 7: Analytics */}
                  <div
                    onClick={() => navigateToWorkspace('analytics')}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <BarChart3 size={24} className="text-[#00a2ff] mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">Analytics</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Telemetry</div>
                  </div>

                  {/* Action 8: Project Workspace */}
                  <div
                    onClick={() => {
                      if (activeTeam) navigate(`/team/${activeTeam._id}`);
                      else navigate('/team/create');
                    }}
                    className="dashboard-card glow-blue items-center justify-center text-center p-4 border border-brand-200/20 hover:border-[#00f0ff] rounded-xl cursor-pointer hover:-translate-y-1 transition-all bg-neutral-950/40"
                  >
                    <Wrench size={24} className="text-[#00f0ff] mb-2" />
                    <div style={{ color: '#fff' }} className="font-extrabold text-[10px] font-mono leading-tight">Workspace</div>
                    <div style={{ color: '#64748b' }} className="text-[8px] mt-1 font-mono uppercase">Open Editor</div>
                  </div>

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
