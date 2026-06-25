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
  ArrowUpRight, Sparkles, Plus, Activity, Database, Wrench, Eye, ArrowLeft
} from 'lucide-react';
import HackathonCommandCenter from '../components/HackathonCommandCenter';
import ProjectHub from '../components/ProjectHub';
import GitHubPanel from '../components/GitHubPanel';
import TaskMarketplace from '../components/TaskMarketplace';

// ─── Judge Simulator Sub-component ───
const JudgeSimulator = ({ project, commandCenterData }) => {
  const [simulatedInnovation, setSimulatedInnovation] = useState(8.0);
  const [simulatedPracticality, setSimulatedPracticality] = useState(7.5);
  const [simulatedComplexity, setSimulatedComplexity] = useState(8.5);
  const [simulatedPresentation, setSimulatedPresentation] = useState(8.0);
  const [customQuery, setCustomQuery] = useState('');
  const [feedbackLog, setFeedbackLog] = useState([
    { type: 'AI system', msg: 'Judge Simulator loaded with project context.' }
  ]);
  const [simulating, setSimulating] = useState(false);

  // Sync with project feasibility review initially
  useEffect(() => {
    if (project?.projectReview?.feasibilityScore) {
      const score = project.projectReview.feasibilityScore;
      setSimulatedInnovation(Math.min(10, Math.max(1, score * 0.9)));
      setSimulatedPracticality(Math.min(10, Math.max(1, score * 1.05)));
      setSimulatedComplexity(Math.min(10, Math.max(1, score * 0.85)));
      setSimulatedPresentation(Math.min(10, Math.max(1, score * 0.95)));
    }
  }, [project]);

  const simulatedAverage = Math.round(((simulatedInnovation + simulatedPracticality + simulatedComplexity + simulatedPresentation) / 4) * 10) / 10;

  const handleSimulatePitch = () => {
    setSimulating(true);
    setFeedbackLog(prev => [...prev, { type: 'System', msg: 'Initiating presentation and pitch evaluation run...' }]);
    
    setTimeout(() => {
      let advice = 'Highlight the working prototype first. Make sure your problem statement connects directly with your demonstration.';
      if (simulatedAverage >= 8.5) {
        advice = 'Excellent score projection! Focus on business scaling potential and unique AI agents capability during the Q&A session.';
      } else if (simulatedAverage >= 7.0) {
        advice = 'Stable prototype. Make sure you clearly articulate the tech stack consensus advantages and how you split tasks.';
      } else {
        advice = 'High risk of demo failure. Ensure you remove non-essential features and prioritize testing your core APIs.';
      }
      
      setFeedbackLog(prev => [
        ...prev,
        { type: 'Verdict', msg: `Simulation output: Projected average score: ${simulatedAverage}/10.` },
        { type: 'Mentor Advice', msg: advice }
      ]);
      setSimulating(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-6 shadow-lg">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2 mb-2">
          <Award size={18} className="text-orange-500 animate-pulse" />
          Judge Pitch & Score Simulator
        </h2>
        <p className="text-xs text-neutral-400 max-w-xl">
          Simulate how judges will rate your hackathon MVP based on innovation, technology complexity, presentation, and practicality. Drag sliders to adjust parameters.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* Sliders */}
          <div className="flex flex-col gap-4">
            {[
              { label: 'Innovation Metric', val: simulatedInnovation, set: setSimulatedInnovation, color: 'text-indigo-400' },
              { label: 'Technical Complexity', val: simulatedComplexity, set: setSimulatedComplexity, color: 'text-violet-400' },
              { label: 'Practicality & Usability', val: simulatedPracticality, set: setSimulatedPracticality, color: 'text-emerald-400' },
              { label: 'Presentation & Demo Flow', val: simulatedPresentation, set: setSimulatedPresentation, color: 'text-amber-400' }
            ].map(m => (
              <div key={m.label} className="flex flex-col gap-1.5 text-xs text-left">
                <div className="flex justify-between font-bold">
                  <span className={m.color}>{m.label}</span>
                  <span className="font-mono text-white">{m.val.toFixed(1)}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={m.val}
                  onChange={e => m.set(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-[#00f0ff] bg-neutral-900 border-0 h-1.5 rounded-lg appearance-none"
                />
              </div>
            ))}

            <button
              onClick={handleSimulatePitch}
              disabled={simulating}
              className="btn-primary text-xs py-2 px-4 shadow-sm w-fit mt-2 flex items-center gap-2 cursor-pointer"
            >
              {simulating ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
              <span>Simulate Pitch & Demo</span>
            </button>
          </div>

          {/* Projection Indicator & Output Logs */}
          <div className="flex flex-col gap-4">
            <div className="bg-neutral-900/60 p-4 border border-[#00f0ff]/10 rounded-xl flex items-center gap-6">
              <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="rgba(0, 240, 255, 0.08)" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    stroke="#00f0ff"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 - (simulatedAverage * 10 / 100) * 2 * Math.PI * 38}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-[#00f0ff] font-mono">{simulatedAverage.toFixed(1)}</span>
                  <span className="text-[8px] uppercase tracking-widest text-neutral-500">/ 10</span>
                </div>
              </div>
              <div className="text-left flex flex-col gap-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Projected Average Rating</span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border w-fit font-mono ${
                  simulatedAverage >= 8.0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  simulatedAverage >= 6.0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {simulatedAverage >= 8.0 ? 'DEMO CRITICAL APPROVED' : simulatedAverage >= 6.0 ? 'AVERAGE READY' : 'RISKY BACKLOG'}
                </span>
              </div>
            </div>

            {/* Sim Logs */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-brand-200/10 text-[11px] h-40 overflow-y-auto font-mono text-left flex flex-col gap-2">
              <span className="text-[8px] text-neutral-500 uppercase tracking-wider font-bold">Simulator Output Logs:</span>
              {feedbackLog.map((log, i) => (
                <div key={i} className="leading-relaxed border-b border-brand-200/5 pb-1">
                  <span className="text-brand-400 font-extrabold font-mono uppercase">[{log.type}]: </span>
                  <span className="text-neutral-300">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
            {renderSidebarItem('judge', 'Judge Simulator', Award)}
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

          {activeTab === 'judge' && project && (
            <JudgeSimulator project={project} commandCenterData={commandCenterData} />
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
