import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { getMyTeams } from '../services/teamService';
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
  ArrowUpRight, Sparkles, Plus, Activity, Database, Wrench, Eye, ArrowLeft, Copy, Check
} from 'lucide-react';
import HackathonCommandCenter from '../components/HackathonCommandCenter';
import ProjectHub from '../components/ProjectHub';
import GitHubPanel from '../components/GitHubPanel';
import TaskMarketplace from '../components/TaskMarketplace';


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
        onClick={() => setActiveTab(tabId)}
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
      {/* Top Navigation Header */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center text-sm font-bold shadow-xs">H</div>
          <span className="font-extrabold text-lg tracking-tight font-sans text-neutral-900">
            Hack<span className="text-brand-500">Buddy</span>
          </span>
          <span className="status-badge badge-active ml-2.5 text-[10px] flex items-center gap-1">
            <span className="status-pulse bg-emerald-500"></span>
            WORKSPACE
          </span>
          {inviteCode && (
            <span className="status-badge badge-active ml-2 text-[10px] flex items-center gap-1.5 font-mono">
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
            <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest">Workspace:</span>
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
        <aside className="dashboard-sidebar font-sans">
          <div className="sidebar-menu flex flex-col gap-1 w-full">
            <button
              onClick={() => navigate('/dashboard')}
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
            {renderSidebarItem('reality', 'Repository Intelligence', Eye)}
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

          {activeTab === 'reality' && project && (
            <GitHubPanel projectId={project._id} isOwner={project.createdBy === user?._id || user?._id === project.createdBy?._id} initialTab="reality" />
          )}

          {activeTab === 'chat' && project && (
            <ProjectHub teamId={project.teamId} initialView="mentor-chat" />
          )}


          {activeTab === 'settings' && project && (
            <ProjectHub teamId={project.teamId} initialView="edit" />
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectWorkspace;
