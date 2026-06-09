import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LogOut, Bell, Settings, LayoutDashboard, Database, Cpu, 
  Send, Users, BookOpen, AlertTriangle, CheckCircle, Flame, Clock, 
  Terminal, ShieldCheck, UserCheck, RefreshCw, Zap
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fixApplied, setFixApplied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 34, minutes: 8, seconds: 58 });
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

  const formatTime = (t) => {
    return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
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
          <span className="status-badge badge-active" style={{ marginLeft: '10px', fontSize: '0.65rem' }}>
            <span className="status-pulse"></span>
            ACTIVE
          </span>
        </div>

        {/* Sprint Countdown Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
          <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>HUD CLOCK:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{formatTime(timeLeft)}</span>
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
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{activeUser?.name}</span>
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
            
            <button className="btn-primary" style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff', padding: '0.6rem' }}>
              <Users size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Invite Teammate</span>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>MISSION STATUS</span>
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

              {/* Velocity Burndown Tracker */}
              <div className="glass dashboard-card">
                <div className="card-title">
                  <div>
                    <span>Velocity Burndown</span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'none', marginTop: '4px' }}>
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
                      <div className="tracker-bar-fill" style={{ width: '85%', background: '#2563eb' }}></div>
                    </div>
                  </div>

                  <div className="tracker-row">
                    <div className="tracker-header">
                      <span>BACKEND & API INFRA</span>
                      <span>62%</span>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill" style={{ width: '62%', background: '#3b82f6' }}></div>
                    </div>
                  </div>

                  <div className="tracker-row">
                    <div className="tracker-header">
                      <span>AI ENGINE (LLM PIPELINE)</span>
                      <span>41%</span>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill" style={{ width: '41%', background: '#10b981' }}></div>
                    </div>
                  </div>

                  <div className="tracker-row">
                    <div className="tracker-header">
                      <span>PITCH & PRESENTATION</span>
                      <span>15%</span>
                    </div>
                    <div className="tracker-bar-bg">
                      <div className="tracker-bar-fill" style={{ width: '15%', background: '#059669' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* War Room Alert Card */}
              <div className="glass dashboard-card war-room-card">
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    background: fixApplied ? 'var(--success-glow)' : 'rgba(239, 68, 68, 0.1)', 
                    color: fixApplied ? 'var(--success)' : 'var(--danger)',
                    padding: '10px', 
                    borderRadius: '8px'
                  }}>
                    {fixApplied ? <CheckCircle size={24} /> : <Flame size={24} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', color: fixApplied ? 'var(--success)' : 'var(--danger)' }}>
                        {fixApplied ? 'HOTFIX COMPLETE' : 'AI WAR ROOM : BOTTLENECK DETECTED'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                      {fixApplied ? 'Edge Latency Resolved' : 'LLM Latency Bottleneck'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
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
                        fontSize: '0.8rem',
                        gap: '6px'
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
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Querying DB Node...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-deep)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      {activeUser?.avatar ? (
                        <img src={activeUser.avatar} alt="Avatar" className="user-avatar" style={{ width: '48px', height: '48px', border: '2px solid var(--primary-hover)' }} />
                      ) : (
                        <div className="user-avatar-placeholder" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                          {activeUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{activeUser?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ID: {activeUser?._id || activeUser?.id || 'N/A'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
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
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '0.5rem',
                        width: '100%',
                        borderRadius: '6px',
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
                  <span style={{ fontSize: '0.65rem', color: 'var(--success)', letterSpacing: '0.5px' }}>REAL-TIME LOG</span>
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
