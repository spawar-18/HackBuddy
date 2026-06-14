import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getMyTeams } from '../services/teamService';
import { getProjectByTeam } from '../services/projectService';
import { 
  LogOut, Bell, Settings, LayoutDashboard, Database, Cpu, 
  Send, Users, BookOpen, AlertTriangle, CheckCircle, Flame, Clock, 
  Terminal, ShieldCheck, UserCheck, RefreshCw, Zap, FolderGit2, Play
} from 'lucide-react';

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
          results.forEach(res => {
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
    return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo-icon" style={{ width: '30px', height: '30px', fontSize: '1rem' }}>H</div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-sans)', letterSpacing: '-0.5px' }}>
            Hack<span style={{ color: 'var(--primary-hover)' }}>OS</span>
          </span>
          <span className="status-badge badge-active" style={{ marginLeft: '10px', fontSize: '0.85rem' }}>
            <span className="status-pulse"></span>
            ACTIVE
          </span>
        </div>

        {/* Sprint Countdown Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
          <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>HUD CLOCK:</span>
          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{formatTime(timeLeft)}</span>
        </div>

        {/* Action Widgets */}
        <div className="header-actions">
          <button className="header-btn">Submit Project</button>
          <Bell size={18} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />
          <Settings size={18} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => navigate('/profile')} />
          
          <div className="user-profile-widget">
            {activeUser?.avatar ? (
              <img src={activeUser.avatar} alt="Avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                {activeUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{activeUser?.name}</span>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="dashboard-body">
        {/* Left Navigation Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-menu">
            <a href="#dashboard" className="menu-item active">
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </a>
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
              className="btn-primary" 
              style={{ marginTop: '1.5rem', background: 'var(--primary)', border: 'none', color: '#ffffff', padding: '0.6rem', gap: '8px', borderRadius: 'var(--radius-default)' }}
            >
              <Users size={16} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Create Team</span>
            </button>
            <button 
              onClick={() => navigate('/team/join')}
              className="btn-primary" 
              style={{ marginTop: '0.5rem', background: 'var(--tertiary)', border: 'none', color: '#ffffff', padding: '0.6rem', gap: '8px', borderRadius: 'var(--radius-default)' }}
            >
              <Users size={16} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Join Team</span>
            </button>
          </div>

          <div className="sidebar-menu" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <a href="#docs" className="menu-item">
              <BookOpen size={16} />
              <span>Documentation</span>
            </a>
            <button 
              onClick={handleLogout} 
              className="menu-item" 
              style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Dashboard Content Container */}
        <main className="dashboard-content">
          <div className="dashboard-grid">
            
            {/* Left Side Info Pane */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Mission Status Header */}
              <div className="glass dashboard-card glow-blue" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>MISSION STATUS</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      T-Minus {formatTime(timeLeft)}
                    </h2>
                  </div>
                  <span className="status-badge badge-critical">Mission Critical</span>
                </div>
                
                <div className="hud-grid">
                  <div className="hud-item">
                    <div className="hud-label">Current Sprint</div>
                    <div className="hud-value" style={{ color: 'var(--text-primary)' }}>MVP Core</div>
                  </div>
                  <div className="hud-item">
                    <div className="hud-label">Squad Velocity</div>
                    <div className="hud-value" style={{ color: 'var(--success)' }}>14.2 pts/hr</div>
                  </div>
                </div>
              </div>

              {/* My Teams Section */}
              <div className="glass dashboard-card glow-blue" style={{ borderLeft: '4px solid var(--success)' }}>
                <div className="card-title">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} style={{ color: 'var(--success)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>My Squads</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => navigate('/team/create')}
                      className="header-btn" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--primary)', borderRadius: 'var(--radius-default)' }}
                    >
                      Create Team
                    </button>
                    <button 
                      onClick={() => navigate('/team/join')}
                      className="header-btn" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--tertiary)', borderRadius: 'var(--radius-default)' }}
                    >
                      Join Team
                    </button>
                  </div>
                </div>

                {loadingTeams ? (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem 0' }}>
                    <RefreshCw className="spin" size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Scanning network for squads...</span>
                  </div>
                ) : teams.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-deep)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <Users size={32} style={{ opacity: 0.5, margin: '0 auto' }} />
                    </div>
                    <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '1rem' }}>No Teams Yet</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      You are not a member of any squad. Initiate a new team or enter an invite code to join.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                      <button 
                        onClick={() => navigate('/team/create')}
                        className="btn-primary" 
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--primary)', height: '32px', borderRadius: 'var(--radius-default)' }}
                      >
                        Create
                      </button>
                      <button 
                        onClick={() => navigate('/team/join')}
                        className="btn-primary" 
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--tertiary)', height: '32px', borderRadius: 'var(--radius-default)' }}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {teams.map((t) => (
                      <div 
                        key={t._id} 
                        style={{ 
                          background: 'var(--bg-deep)', 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius-lg)', 
                          padding: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.teamName}
                          </h4>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: '2px 0 0 0' }}>
                            {t.description || 'No description provided.'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                            <Users size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {t.members ? t.members.length : 0} {t.members && t.members.length === 1 ? 'member' : 'members'}
                            </span>
                          </div>

                          {/* Linked Project Summary */}
                          {loadingProjects ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                              Loading project details...
                            </div>
                          ) : projects[t._id] ? (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '6px 10px', 
                              background: 'var(--bg-card)', 
                              border: '1px solid var(--border)', 
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                  <FolderGit2 size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {projects[t._id].projectName}
                                  </span>
                                </div>
                                {getStatusBadge(projects[t._id].status)}
                              </div>
                              {projects[t._id].track && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Track: <strong style={{ color: 'var(--text-secondary)' }}>{projects[t._id].track}</strong>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '4px 8px', 
                              background: 'rgba(0,0,0,0.01)', 
                              border: '1px dashed var(--border)', 
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FolderGit2 size={11} style={{ opacity: 0.5 }} />
                              <span>No active project</span>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => navigate(`/team/${t._id}`)}
                          className="btn-primary" 
                          style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', flexShrink: 0, background: 'var(--primary)', borderRadius: 'var(--radius-default)' }}
                        >
                          Workspace
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Velocity Burndown Tracker */}
              <div className="glass dashboard-card">
                <div className="card-title">
                  <div>
                    <span>Velocity Burndown</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'none', marginTop: '4px' }}>
                      Track progress across core project tracks
                    </p>
                  </div>
                  <span className="card-title-pill" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    LATEST PUSH: 4M AGO
                  </span>
                </div>

                <div className="burndown-chart-sim">
                  <div className="tracker-row">
                    <div className="tracker-header">
                      <span>FRONTEND ARCHITECTURE</span>
                      <span>85%</span>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill" style={{ width: '85%', background: 'var(--primary)' }}></div>
                    </div>
                  </div>

                  <div className="tracker-row">
                    <div className="tracker-header">
                      <span>BACKEND & API INFRA</span>
                      <span>62%</span>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill" style={{ width: '62%', background: 'var(--primary)', opacity: 0.8 }}></div>
                    </div>
                  </div>

                  <div className="tracker-row">
                    <div className="tracker-header">
                      <span>AI ENGINE (LLM PIPELINE)</span>
                      <span>41%</span>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill" style={{ width: '41%', background: 'var(--success)' }}></div>
                    </div>
                  </div>

                  <div className="tracker-row">
                    <div className="tracker-header">
                      <span>PITCH & PRESENTATION</span>
                      <span>15%</span>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill" style={{ width: '15%', background: 'var(--success)', opacity: 0.8 }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* War Room Alert Card */}
              <div className="glass dashboard-card war-room-card" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    background: fixApplied ? 'var(--success-glow)' : 'var(--danger-glow)', 
                    color: fixApplied ? 'var(--success)' : 'var(--danger)',
                    padding: '10px', 
                    borderRadius: 'var(--radius-default)'
                  }}>
                    {fixApplied ? <CheckCircle size={24} /> : <Flame size={24} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', color: fixApplied ? 'var(--success)' : 'var(--danger)' }}>
                        {fixApplied ? 'HOTFIX COMPLETE' : 'AI WAR ROOM : BOTTLENECK DETECTED'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      {fixApplied ? 'Edge Latency Resolved' : 'LLM Latency Bottleneck'}
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                      {fixApplied 
                        ? 'System response times are stabilized. API routes are using standard high-speed streaming protocols.' 
                        : 'LLM response latency is averaging 2.4s. Recommending switching to streaming edge functions for better UX.'}
                    </p>
                    <button 
                      onClick={handleApplyFix}
                      disabled={fixApplied}
                      className="btn-primary" 
                      style={{ 
                        width: 'auto', 
                        padding: '0.5rem 1.25rem', 
                        background: fixApplied ? 'var(--success)' : 'var(--primary)',
                        fontSize: '0.9rem',
                        gap: '6px',
                        borderRadius: 'var(--radius-default)'
                      }}
                    >
                      <Zap size={14} />
                      {fixApplied ? 'Fix Applied' : 'Apply Fix'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Info Pane (Authenticated Profile Details & Logs) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Profile Card */}
              <div className="glass dashboard-card" style={{ borderTop: '3px solid var(--primary-hover)' }}>
                <div className="card-title">
                  <span>Developer Profile</span>
                  <span className="status-badge badge-active">
                    <UserCheck size={12} style={{ marginRight: '4px' }} />
                    Verified
                  </span>
                </div>

                {loadingProfile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem 0' }}>
                    <RefreshCw className="spin" size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Querying DB Node...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-deep)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                      {activeUser?.avatar ? (
                        <img src={activeUser.avatar} alt="Avatar" className="user-avatar" style={{ width: '48px', height: '48px', border: '2px solid var(--primary)' }} />
                      ) : (
                        <div className="user-avatar-placeholder" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                          {activeUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{activeUser?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ID: {activeUser?._id || activeUser?.id || 'N/A'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>EMAIL NODE:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{activeUser?.email}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>AUTH SCHEME:</span>
                        <span style={{ color: activeUser?.googleId ? 'var(--success)' : (activeUser?.githubId ? 'var(--success)' : 'var(--primary-hover)'), fontWeight: 600 }}>
                          {activeUser?.googleId ? 'GOOGLE OAUTH' : (activeUser?.githubId ? 'GITHUB OAUTH' : 'STANDARD JWT')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>DEVELOPER SKILLS:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {activeUser?.skills && activeUser.skills.length > 0 ? activeUser.skills.join(', ') : 'None configured'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>NODE CREATED:</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {activeUser?.createdAt ? new Date(activeUser.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate('/profile')}
                      className="btn-primary" 
                      style={{ 
                        marginTop: '0.5rem', 
                        background: 'none', 
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        padding: '0.5rem',
                        width: '100%',
                        borderRadius: 'var(--radius-default)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Settings size={14} />
                      Edit Skills Node
                    </button>
                  </div>
                )}
              </div>
 
              {/* Live Activity Feed */}
              <div className="glass dashboard-card">
                <div className="card-title">
                  <span>Live Feed</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)', letterSpacing: '0.5px' }}>REAL-TIME LOG</span>
                </div>

                <div className="activity-feed">
                  <div className="feed-item">
                    <div className="feed-item-icon">
                      <Terminal size={14} />
                    </div>
                    <div className="feed-item-details">
                      <span className="feed-text">
                        AI Agent generated 12 sub tasks for <strong>'Auth Integration'</strong>.
                      </span>
                      <span className="feed-time">2 MINUTES AGO</span>
                    </div>
                  </div>

                  <div className="feed-item">
                    <div className="feed-item-icon warning">
                      <AlertTriangle size={14} />
                    </div>
                    <div className="feed-item-details">
                      <span className="feed-text">
                        Deployment Blocked: Failed to resolve dependency <strong>@hackos/ui-core</strong>.
                      </span>
                      <span className="feed-time">14 MINUTES AGO</span>
                    </div>
                  </div>

                  <div className="feed-item">
                    <div className="feed-item-icon success">
                      <CheckCircle size={14} />
                    </div>
                    <div className="feed-item-details">
                      <span className="feed-text">
                        <strong>{activeUser?.name || 'Developer'}</strong> verified authentication system successfully.
                      </span>
                      <span className="feed-time">JUST NOW</span>
                    </div>
                  </div>

                  <div className="feed-item">
                    <div className="feed-item-icon">
                      <Terminal size={14} />
                    </div>
                    <div className="feed-item-details">
                      <span className="feed-text">
                        System Standup scheduled for 09:00 UTC.
                      </span>
                      <span className="feed-time">1 HOUR AGO</span>
                    </div>
                  </div>

                  <div className="feed-item">
                    <div className="feed-item-icon success">
                      <ShieldCheck size={14} />
                    </div>
                    <div className="feed-item-details">
                      <span className="feed-text">
                        Milestone Reached: <strong>MVP Infrastructure</strong> complete.
                      </span>
                      <span className="feed-time">3 HOURS AGO</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
