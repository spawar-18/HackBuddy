import { useState, useEffect } from 'react';
import { Terminal, Shield, Award, Cpu, TrendingUp } from 'lucide-react';

const AuthSidebar = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 34, minutes: 8, seconds: 58 });

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

  const formatTime = (t) => {
    return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
  };

  return (
    <div className="auth-sidebar">
      {/* Top logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">H</div>
        <div>
          <span style={{ color: '#fff', fontSize: '1.25rem' }}>Project Alpha</span>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Hackathon 2026
          </div>
        </div>
      </div>

      {/* Main Preview Content */}
      <div className="sidebar-main">
        {/* Mission Status Widget */}
        <div className="glass mission-card glow-blue">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>MISSION STATUS</span>
            <span className="status-badge badge-critical">
              <span className="status-pulse"></span>
              Mission Critical
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>CURRENT SPRINT TIME</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-1px', color: '#fff' }}>
            T-Minus {formatTime(timeLeft)}
          </div>

          <div className="hud-grid" style={{ marginTop: '1.25rem' }}>
            <div className="hud-item">
              <div className="hud-label">Current Sprint</div>
              <div className="hud-value" style={{ fontSize: '0.95rem', color: '#fff' }}>MVP Core</div>
            </div>
            <div className="hud-item">
              <div className="hud-label">Squad Velocity</div>
              <div className="hud-value" style={{ fontSize: '0.95rem', color: 'var(--success)' }}>14.2 pts/hr</div>
            </div>
          </div>
        </div>

        {/* Velocity Burndown Tracker */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Velocity Burndown</h4>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Track progress across core tracks</p>
            </div>
            <TrendingUp size={16} style={{ color: 'var(--primary-hover)' }} />
          </div>

          <div className="trackers-list">
            <div className="tracker-row">
              <div className="tracker-header">
                <span>FRONTEND ARCHITECTURE</span>
                <span>85%</span>
              </div>
              <div className="tracker-bar-bg">
                <div className="tracker-bar-fill" style={{ width: '85%', background: '#3b82f6' }}></div>
              </div>
            </div>

            <div className="tracker-row">
              <div className="tracker-header">
                <span>BACKEND & API INFRA</span>
                <span>62%</span>
              </div>
              <div className="tracker-bar-bg">
                <div className="tracker-bar-fill" style={{ width: '62%', background: '#60a5fa' }}></div>
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
                <div className="tracker-bar-fill" style={{ width: '15%', background: '#34d399' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Shield size={12} />
          <span>Secured HUD Console</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Terminal size={12} />
          <span>v1.0.4 - ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default AuthSidebar;
