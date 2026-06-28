import React, { useState, useEffect, useRef } from 'react';
import { 
  getHackathonConfig, 
  saveHackathonConfig, 
  getCommandCenterDashboard, 
  triggerCommandCenterAnalysis, 
  getInAppNotifications, 
  markNotificationsAsRead 
} from '../services/projectService';
import { 
  Clock, Play, CheckCircle, AlertTriangle, AlertCircle, Calendar, 
  Sparkles, RefreshCw, Settings, Info, Bell, ShieldAlert, Users, 
  Activity, ArrowLeft, Save, Ban, Heart, Zap, Award, Flame, CalendarDays,
  Gauge, TrendingUp, CheckSquare, ShieldCheck, ArrowUpRight, Database, Check, Code
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import GitHubPanel from './GitHubPanel';
import UpgradeGate from './UpgradeGate';

const HackathonCommandCenter = ({ projectId, onBack }) => {
  const [config, setConfig] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false); // PRO_REQUIRED gate
  const [saveLoading, setSaveLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'github'
  
  // Timer countdown state
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false
  });

  // Config Form State
  const [formData, setFormData] = useState({
    hackathonName: '',
    startTime: '',
    endTime: '',
    codeFreezeTime: '',
    presentationTime: '',
    submissionTime: '',
    timezone: 'UTC'
  });

  // Notification ref for click-outside
  const notifRef = useRef(null);

  // Fetch all initial data
  const fetchData = async (showQuietly = false) => {
    try {
      if (!showQuietly) setLoading(true);
      const res = await getCommandCenterDashboard(projectId);
      if (res.success) {
        if (!res.configured) {
          setConfig(null);
          // Set basic default fields
          const localOffset = -new Date().getTimezoneOffset() / 60;
          const tzString = localOffset >= 0 ? `GMT+${localOffset}` : `GMT${localOffset}`;
          setFormData(prev => ({
            ...prev,
            timezone: tzString
          }));
        } else {
          setConfig(res.config);
          setDashboard(res);
          setNotifications(res.notifications || []);
          setUnreadNotifsCount((res.notifications || []).filter(n => !n.read).length);
          
          // Populate form data for editing
          setFormData({
            hackathonName: res.config.hackathonName || '',
            startTime: res.config.startTime ? formatDateTimeLocal(res.config.startTime) : '',
            endTime: res.config.endTime ? formatDateTimeLocal(res.config.endTime) : '',
            codeFreezeTime: res.config.codeFreezeTime ? formatDateTimeLocal(res.config.codeFreezeTime) : '',
            presentationTime: res.config.presentationTime ? formatDateTimeLocal(res.config.presentationTime) : '',
            submissionTime: res.config.submissionTime ? formatDateTimeLocal(res.config.submissionTime) : '',
            timezone: res.config.timezone || 'UTC'
          });
        }
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        setBlocked(true);
      } else {
        console.error('Error fetching command center data:', err);
        toast.error('Failed to load Command Center details');
      }
    } finally {
      if (!showQuietly) setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchData();

    // Auto-refresh dashboard every 45 seconds
    const pollInterval = setInterval(() => {
      if (config) {
        fetchData(true);
      }
    }, 45000);

    // Click outside listener for notifications
    const clickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('mousedown', clickOutside);
    };
  }, [projectId, config?.status]);

  // Form DateTime converter helper
  const formatDateTimeLocal = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    
    // Convert to YYYY-MM-DDTHH:MM format adjusted to local timezone for inputs
    const tzOffset = d.getTimezoneOffset() * 60000; // in ms
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Countdown timer clock tick
  useEffect(() => {
    if (!config || !config.endTime) return;

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
        
        // Quietly refresh to update backend Completed status
        if (config.status !== 'Completed') {
          fetchData(true);
        }
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
  }, [config?.endTime]);

  // Extend timeline by X hours
  const handleExtendTimeline = async (hours) => {
    if (!config) return;
    try {
      setSaveLoading(true);
      const currentEnd = new Date(config.endTime || new Date());
      const newEnd = new Date(currentEnd.getTime() + hours * 60 * 60 * 1000);
      
      const updatedData = {
        hackathonName: config.hackathonName || 'Hackathon',
        startTime: config.startTime ? formatDateTimeLocal(config.startTime) : formatDateTimeLocal(new Date()),
        endTime: formatDateTimeLocal(newEnd),
        codeFreezeTime: config.codeFreezeTime ? formatDateTimeLocal(config.codeFreezeTime) : '',
        presentationTime: config.presentationTime ? formatDateTimeLocal(config.presentationTime) : '',
        submissionTime: config.submissionTime ? formatDateTimeLocal(config.submissionTime) : '',
        timezone: config.timezone || 'UTC'
      };

      const res = await saveHackathonConfig(projectId, updatedData);
      if (res.success) {
        toast.success(`Timeline extended by ${hours} hours!`);
        setConfig(res.config);
        setFormData(updatedData);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to extend timeline');
    } finally {
      setSaveLoading(false);
    }
  };

  // Save Configuration Submit Handler
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!formData.hackathonName.trim()) {
      toast.error('Hackathon name is required');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      toast.error('Start time and end time are required');
      return;
    }
    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      toast.error('Start time must be before end time');
      return;
    }

    try {
      setSaveLoading(true);
      const res = await saveHackathonConfig(projectId, formData);
      if (res.success) {
        toast.success('Hackathon configured successfully!');
        setConfig(res.config);
        setShowSettings(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaveLoading(false);
    }
  };

  // Trigger AI Report evaluation
  const handleTriggerAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      const res = await triggerCommandCenterAnalysis(projectId);
      if (res.success) {
        toast.success('AI Command analysis generated successfully!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to run AI assessment');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    if (unreadNotifsCount === 0) return;
    try {
      const res = await markNotificationsAsRead(projectId);
      if (res.success) {
        setUnreadNotifsCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
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
        textColor: read ? 'text-neutral-700' : 'text-neutral-900',
        badge: 'Overdue'
      },
      ActionRequired: {
        icon: <Zap size={14} className="text-amber-600 animate-bounce" />,
        bg: read ? 'bg-amber-50/60' : 'bg-amber-50',
        border: read ? 'border-amber-200/50' : 'border-amber-300',
        textColor: read ? 'text-neutral-700' : 'text-neutral-900',
        badge: 'Action Required'
      },
      Marketplace: {
        icon: <Database size={14} className="text-emerald-600" />,
        bg: read ? 'bg-emerald-50/60' : 'bg-emerald-50',
        border: read ? 'border-emerald-200/50' : 'border-emerald-300',
        textColor: read ? 'text-neutral-700' : 'text-neutral-900',
        badge: 'Marketplace'
      },
      General: {
        icon: <Bell size={14} className="text-brand-600" />,
        bg: read ? 'bg-brand-50/40' : 'bg-brand-50/80',
        border: read ? 'border-brand-200/50' : 'border-brand-300',
        textColor: read ? 'text-neutral-700' : 'text-neutral-900',
        badge: 'Alert'
      }
    };
    return config[type] || config.General;
  };

  // Helper color map for statuses
  const getOverallStatusColor = (statusVal) => {
    switch (statusVal) {
      case 'Ready For Demo':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-emerald-500/5';
      case 'On Track':
        return 'text-blue-700 bg-blue-50 border-blue-200 shadow-blue-500/5';
      case 'Slightly Behind':
        return 'text-amber-700 bg-amber-50 border-amber-200 shadow-amber-500/5';
      case 'High Risk':
        return 'text-orange-700 bg-orange-50 border-orange-200 shadow-orange-500/5';
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border-rose-200 shadow-rose-500/5 animate-pulse';
      default:
        return 'text-neutral-700 bg-neutral-50 border-neutral-200';
    }
  };

  const getRiskLevelColor = (risk) => {
    switch (risk) {
      case 'Low':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'Medium':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'High':
        return 'text-orange-700 bg-orange-50 border-orange-100';
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border-rose-100 font-bold';
      default:
        return 'text-neutral-700 bg-neutral-50 border-neutral-100';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 text-slate-400 gap-3 bg-white border border-brand-100 rounded-2xl shadow-xs">
        <RefreshCw className="animate-spin text-brand-500" size={32} />
        <span className="text-xs font-semibold tracking-wide text-neutral-500">Assembling Hackathon Command Center...</span>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs">
        <UpgradeGate
          feature="AI Command Center"
          requiredPlan="PRO"
          description="The AI Command Center is a Pro feature. Upgrade to get live hackathon HUD, smart alerts, milestone tracking, and AI-driven diagnostics."
        />
      </div>
    );
  }

  // Not Configured State
  if (!config) {
    return (
      <div className="glass p-6 md:p-10 flex flex-col gap-6 animate-slide-up bg-white border border-brand-100 rounded-2xl shadow-xs">
        <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0 border border-brand-100">
              <Award size={20} className="text-brand-600 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-neutral-400 tracking-wider uppercase leading-none">Milestone Setup</h2>
              <h1 className="text-lg font-black text-neutral-900 mt-1">Activate Command Center</h1>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onBack}
            className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch mt-2">
          <div className="flex-1 flex flex-col gap-4 bg-brand-50/20 border border-brand-100/50 rounded-2xl p-6 justify-center">
            <h2 className="text-sm font-extrabold text-neutral-850">Live HUD & AI-Driven Diagnostics</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Activate the Hackathon Command Center to monitor task roadmaps, deadlines, and individual team member bandwidth. Once activated, the AI Agent acts as your Engineering Lead to help prevent project creep.
            </p>
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center gap-3 text-xs text-neutral-600">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckSquare size={12} />
                </div>
                <span>Ticking countdown timer synchronizing milestone deadlines</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-600">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <ShieldCheck size={12} />
                </div>
                <span>AI Scope Guardian providing automated task-reduction models</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-600">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <TrendingUp size={12} />
                </div>
                <span>Workload health diagnostics detecting bottlenecked members</span>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-96 bg-neutral-50/50 border border-neutral-200/80 rounded-2xl p-5 shadow-3xs flex flex-col">
            <h3 className="text-xs font-black text-neutral-605 uppercase tracking-widest border-b border-neutral-200/60 pb-2.5 mb-4">
              Configure Milestones
            </h3>
            
            <form onSubmit={handleSaveConfig} className="flex flex-col gap-3.5 grow justify-between">
              <div className="flex flex-col gap-3.5">
                <div className="form-group">
                  <label className="input-label">Hackathon Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. MHacks 2026, ETHGlobal" 
                    value={formData.hackathonName}
                    onChange={(e) => setFormData({ ...formData, hackathonName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="input-label">Start Time *</label>
                    <input 
                      type="datetime-local" 
                      className="form-input" 
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">End Time *</label>
                    <input 
                      type="datetime-local" 
                      className="form-input" 
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const base = formData.startTime ? new Date(formData.startTime) : new Date();
                          const future = new Date(base.getTime() + 12 * 60 * 60 * 1000);
                          setFormData(prev => ({ ...prev, endTime: formatDateTimeLocal(future) }));
                        }}
                        className="px-2 py-1 text-[9px] font-bold bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded transition-all cursor-pointer"
                      >
                        +12 Hours from Start
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">Timezone</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. GMT+5:30, EST, UTC" 
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saveLoading} 
                className="btn-primary w-full mt-4 cursor-pointer py-2 shadow-xs"
              >
                {saveLoading ? <RefreshCw className="animate-spin text-white" size={14} /> : <Save size={14} />}
                <span>Activate Command Center</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const progressMetrics = dashboard?.progress || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    blockedTasks: 0,
    completionPercentage: 0,
    criticalTasksTotal: 0,
    criticalTasksCompleted: 0
  };

  const aiReport = dashboard?.aiAnalysis || null;

  return (
    <div className="flex flex-col gap-6 animate-slide-up w-full">
      {/* ═══ Top HUD Header ═══ */}
      <div className="glass bg-white/90 backdrop-blur-md border border-brand-100 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-20">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, black 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-brand-500/5 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center shrink-0 border border-brand-100">
            <Flame size={20} className="text-orange-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-neutral-450 uppercase tracking-widest leading-none">WAR ROOM HUD</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                config.status === 'Running' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                config.status === 'Upcoming' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span className="status-pulse"></span> {config.status}
              </span>
            </div>
            <h1 className="text-base font-extrabold text-neutral-900 mt-1.5 leading-none tracking-tight">{config.hackathonName}</h1>
          </div>
        </div>

        {/* Header Actions */}
        <div className="relative z-10 flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
          {/* Notifications feed dropdown */}
          <div className="relative" ref={notifRef}>
            <button 
              type="button" 
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                if (!showNotificationsDropdown) {
                  handleMarkNotificationsRead();
                }
              }}
              className="p-2 bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 rounded-xl cursor-pointer text-neutral-600 relative transition-all shadow-3xs"
            >
              <Bell size={15} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-md border border-brand-100 rounded-2xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto animate-slide-up flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
                  <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Bell size={11} className="text-brand-500" /> Notifications Feed
                  </h3>
                  <span className="text-[9px] font-bold bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100/50 text-brand-700">
                    {notifications.length} Total
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-neutral-400 italic text-center py-8">No recent updates in this project.</p>
                  ) : (
                    notifications.map((notif, idx) => {
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
                              <span className="font-bold text-[8px] uppercase tracking-wider text-neutral-400">
                                {styles.badge}
                              </span>
                              <span className="text-[8px] text-neutral-400 font-bold font-mono">
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                            </div>
                            <span className={notif.read ? 'font-normal' : 'font-semibold text-neutral-800'}>
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

          {/* Settings Config */}
          {dashboard?.isOwner && (
            <button 
              type="button" 
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                showSettings 
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' 
                  : 'bg-white border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50 text-neutral-600 shadow-3xs'
              }`}
            >
              <Settings size={14} />
              <span>{showSettings ? 'Settings' : 'Configure milestones'}</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={onBack}
            className="flex items-center gap-1 bg-white border border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50 text-neutral-650 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-3xs"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="glass bg-white p-5 rounded-2xl animate-slide-up border border-brand-100 border-l-4 border-l-brand-600 shadow-xs">
          <h2 className="text-xs font-black text-neutral-800 uppercase tracking-widest border-b border-neutral-100 pb-2.5 mb-4 flex items-center gap-1.5">
            <Settings size={14} className="text-brand-600" /> Edit Milestones & Deadlines (Leader Only)
          </h2>
          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="form-group md:col-span-3">
              <label className="input-label">Hackathon Name *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Hackathon Name" 
                value={formData.hackathonName}
                onChange={(e) => setFormData({ ...formData, hackathonName: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="input-label">Starts At *</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="input-label">Ends At *</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const base = formData.endTime ? new Date(formData.endTime) : new Date();
                    const future = new Date(base.getTime() + 12 * 60 * 60 * 1000);
                    setFormData(prev => ({ ...prev, endTime: formatDateTimeLocal(future) }));
                  }}
                  className="px-2 py-1 text-[9px] font-bold bg-brand-50 hover:bg-brand-100 text-brand-700 rounded border border-brand-200 transition-all cursor-pointer"
                >
                  +12 Hours to End Time
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Timezone</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. GMT+5:30" 
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="input-label">Code Freeze At</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={formData.codeFreezeTime}
                onChange={(e) => setFormData({ ...formData, codeFreezeTime: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="input-label">Submission Deadline</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={formData.submissionTime}
                onChange={(e) => setFormData({ ...formData, submissionTime: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="input-label">Presentation / Demo At</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={formData.presentationTime}
                onChange={(e) => setFormData({ ...formData, presentationTime: e.target.value })}
              />
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setShowSettings(false)}
                className="btn-secondary text-xs px-4"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saveLoading}
                className="btn-primary text-xs px-4 cursor-pointer py-2 shadow-xs"
              >
                {saveLoading ? <RefreshCw className="animate-spin text-white" size={13} /> : <Save size={13} />} Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══ View Switching Tabs ═══ */}
      <div 
        className="flex border-b gap-1 p-1 rounded-xl overflow-x-auto scrollbar-none w-fit mb-2"
        style={{ 
          backgroundColor: 'rgba(0, 240, 255, 0.03)', 
          borderColor: 'rgba(0, 240, 255, 0.15)',
          borderWidth: '1px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 border"
          style={{
            backgroundColor: activeTab === 'overview' ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
            borderColor: activeTab === 'overview' ? 'rgba(0, 240, 255, 0.4)' : 'transparent',
            color: activeTab === 'overview' ? '#ffffff' : 'rgba(0, 240, 255, 0.55)'
          }}
        >
          <Activity size={13} style={{ color: activeTab === 'overview' ? '#60a5fa' : 'rgba(0, 240, 255, 0.45)' }} />
          <span>Dashboard Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('github')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 border"
          style={{
            backgroundColor: activeTab === 'github' ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
            borderColor: activeTab === 'github' ? 'rgba(0, 240, 255, 0.4)' : 'transparent',
            color: activeTab === 'github' ? '#ffffff' : 'rgba(0, 240, 255, 0.55)'
          }}
        >
          <Code size={13} style={{ color: activeTab === 'github' ? '#c084fc' : 'rgba(0, 240, 255, 0.45)' }} />
          <span>GitHub Integration</span>
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* LEFT COLUMN (8 cols): Ticking HUD Clock, Progress, Team Workloads, Timelines */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full text-left">
          
          {/* Ticking Clock HUD Widget */}
          <div className="glass bg-neutral-950 border border-neutral-900 p-6 rounded-2xl text-white relative overflow-hidden shadow-md">
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl"></div>
            
            {countdown.isCompleted ? (
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center w-full gap-4">
                <div className="text-left">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-950/45 border border-rose-500/30 text-rose-450">
                    <AlertCircle size={11} className="animate-pulse" /> Status: Finished
                  </span>
                  <h3 className="text-base font-extrabold mt-2.5">The Hackathon Has Ended!</h3>
                  <p className="text-[11px] text-neutral-400 mt-1">Timeline completed on {new Date(config.endTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}.</p>
                </div>
                {dashboard?.isOwner && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleExtendTimeline(12)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 shadow-md cursor-pointer border-0 transition-all hover:scale-102 active:scale-98"
                    >
                      <Clock size={13} />
                      <span>Extend 12 Hours</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-650 shadow-md cursor-pointer border-0 transition-all hover:scale-102 active:scale-98"
                    >
                      <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '3s' }} />
                      <span>Start New Timeline</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-950/45 border border-orange-500/30 text-orange-400">
                    <Clock size={11} className="animate-pulse" /> Time Remaining Before Deadline
                  </span>
                  <p className="text-[10px] text-neutral-450 mt-2.5 uppercase tracking-widest font-mono">
                    Ends: {new Date(config.endTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })} ({config.timezone})
                  </p>
                </div>

                {/* HUD countdown displays */}
                <div className="flex gap-2">
                  {[
                    { value: countdown.days, label: 'Days' },
                    { value: countdown.hours, label: 'Hours' },
                    { value: countdown.minutes, label: 'Mins' },
                    { value: countdown.seconds, label: 'Secs' }
                  ].map((unit, idx) => (
                    <div key={idx} className="flex flex-col items-center bg-neutral-900/60 border border-neutral-800 rounded-xl px-3 py-2 w-16 text-center shadow-3xs">
                      <span className="text-xl font-extrabold font-mono leading-none tracking-tight text-white">{String(unit.value).padStart(2, '0')}</span>
                      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mt-1.5">{unit.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Recommendation of the Day Banner */}
          <div className="glass bg-gradient-to-r from-purple-950/80 to-indigo-950/80 p-4.5 rounded-2xl border border-purple-900 text-white relative overflow-hidden shadow-md">
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
            <div className="relative z-10 flex gap-4 items-start">
              <div className="w-9 h-9 bg-purple-500/20 text-purple-300 rounded-xl flex items-center justify-center shrink-0 border border-purple-500/35">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="text-[8px] font-black text-purple-300 uppercase tracking-widest">AI Recommendation of the Day</span>
                <h4 className="text-xs font-extrabold mt-1 text-white leading-normal">
                  Prioritize {dashboard?.highestPriorityFeature || 'Core MVP'} implementation.
                </h4>
                <p className="text-[11px] text-neutral-300 mt-1.5 leading-normal">
                  Our decision model detects this feature as the critical path item. Finishing this stack segment will unlock the remaining database controllers and deployment pipelines.
                </p>
                <div className="flex items-center gap-3.5 mt-3 border-t border-purple-800/60 pt-2 text-[10px] font-mono text-purple-350">
                  <span>Velocity Trend: <strong className="text-white">{dashboard?.productivityTrend || 'Stable'}</strong></span>
                  <span>Burndown Speed: <strong className="text-white">{dashboard?.burndownVelocity || 0} tasks/hr</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Alert Logs Dashboard (Redesigned M2) */}
          <div className="glass bg-white border border-brand-100 p-5 rounded-2xl flex flex-col gap-4.5 shadow-xs">
            <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-100 pb-2.5">
              <ShieldAlert size={14} className="text-red-500 animate-pulse" /> Smart Alert Engine Logs
            </h3>
            
            <div className="flex flex-col gap-3">
              {(!dashboard?.alerts || dashboard.alerts.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-neutral-400 gap-2">
                  <CheckCircle size={22} className="text-emerald-500" />
                  <span className="text-xs font-bold text-neutral-500">System Clear: All alert risks resolved!</span>
                </div>
              ) : (
                dashboard.alerts.map((alert, idx) => {
                  const isCrit = alert.severity === 'Critical' || alert.severity === 'Warning';
                  return (
                    <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 text-xs leading-relaxed transition-all shadow-3xs ${
                      alert.severity === 'Critical' ? 'bg-red-50/40 border-red-200 text-red-900' :
                      alert.severity === 'Warning' ? 'bg-amber-50/40 border-amber-200 text-amber-900' :
                      alert.severity === 'Success' ? 'bg-emerald-50/40 border-emerald-250 text-emerald-900' :
                      'bg-indigo-50/30 border-indigo-150 text-indigo-900'
                    }`}>
                      {/* Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${isCrit ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`} />
                          <div className="flex flex-col text-left">
                            <span className="font-extrabold text-neutral-900 leading-snug">{alert.title || alert.message}</span>
                            <span className="text-[9px] text-neutral-450 mt-0.5">Category: {alert.category || 'General'}</span>
                          </div>
                        </div>
                        <span className={`text-[8px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-md border ${
                          alert.severity === 'Critical' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                          alert.severity === 'Warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                          'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>

                      {/* Evidence & Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-neutral-700 bg-white/40 p-2.5 rounded-xl border border-neutral-100/50">
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Reason</span>
                          <span className="mt-0.5">{alert.reason || 'Calculated from time progression & task dependency'}</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Evidence</span>
                          <span className="mt-0.5 font-mono">{alert.evidence || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Affected Feature</span>
                          <span className="mt-0.5 font-semibold text-neutral-800">{alert.affectedFeature || 'Core MVP'}</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Affected Teammate</span>
                          <span className="mt-0.5 font-semibold text-neutral-800">{alert.affectedTeamMember || 'All Members'}</span>
                        </div>
                      </div>

                      {/* Suggested Action */}
                      <div className="flex flex-col md:flex-row md:justify-between gap-2 border-t border-neutral-250/20 pt-2.5 text-left">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Suggested Action</span>
                          <span className="mt-0.5 text-neutral-850 font-semibold">{alert.suggestedAction || 'Resolve blockers immediately.'}</span>
                        </div>
                        <div className="flex flex-col shrink-0">
                          <span className="text-[8px] font-bold text-neutral-400 uppercase">Expected Impact</span>
                          <span className="mt-0.5 text-emerald-700 font-semibold">{alert.expectedImpact || 'Optimize milestone delivery.'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Progress Analytics Circle + Metrics */}
          <div className="glass bg-white border border-brand-100 p-5 rounded-2xl flex flex-col gap-4 shadow-xs">
            <h3 className="text-xs font-black text-neutral-705 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-100 pb-2.5">
              <Gauge size={14} className="text-brand-500" /> Milestone & Progress Analytics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Circular tracking ring */}
              <div className="flex flex-col items-center justify-center p-4 bg-neutral-50/30 border border-neutral-150 rounded-xl md:col-span-1 shadow-3xs">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="16" strokeWidth="2.5" stroke="rgba(0, 240, 255, 0.08)" fill="none" />
                    <circle cx="18" cy="18" r="16" strokeWidth="2.8" strokeDasharray={`${progressMetrics.completionPercentage}, 100`} strokeLinecap="round" stroke="#3b82f6" fill="none" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center leading-none">
                    <span className="text-lg font-black text-neutral-900 font-mono tracking-tighter">{progressMetrics.completionPercentage}%</span>
                    <span className="text-[7px] font-bold text-neutral-450 uppercase mt-0.5 tracking-wider">Completed</span>
                  </div>
                </div>
              </div>

              {/* Metric stats grid */}
              <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: progressMetrics.totalTasks, label: 'Total Tasks', color: 'text-neutral-900 bg-neutral-50/50 border-neutral-150' },
                  { value: progressMetrics.completedTasks, label: 'Completed', color: 'text-emerald-700 bg-emerald-50/30 border-emerald-100' },
                  { value: progressMetrics.inProgressTasks, label: 'In Progress', color: 'text-blue-700 bg-blue-50/30 border-blue-100' },
                  { value: progressMetrics.blockedTasks, label: 'Blocked', color: 'text-red-700 bg-red-50/30 border-red-100' }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border flex flex-col justify-between shadow-3xs ${stat.color}`}>
                    <span className="text-xl font-extrabold font-mono leading-none">{stat.value}</span>
                    <span className="text-[8px] font-bold text-neutral-400 uppercase mt-2.5 tracking-widest">{stat.label}</span>
                  </div>
                ))}

                {/* Critical tasks bar */}
                <div className="col-span-2 md:col-span-4 p-3 bg-neutral-50/40 border border-neutral-150 rounded-xl flex items-center justify-between text-xs shadow-3xs">
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-orange-500" />
                    <span className="text-neutral-600 font-bold uppercase tracking-wider text-[9px]">Critical Path Task Completion</span>
                  </div>
                  <span className="font-extrabold text-neutral-850 font-mono bg-white px-2 py-0.5 border border-neutral-200 rounded-lg">
                    {progressMetrics.criticalTasksCompleted} / {progressMetrics.criticalTasksTotal} Done
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Member Workloads Tracker */}
          {dashboard?.memberProgress && (
            <div className="glass bg-white border border-brand-100 p-5 rounded-2xl flex flex-col gap-4 shadow-xs">
              <h3 className="text-xs font-black text-neutral-705 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-100 pb-2.5">
                <Users size={14} className="text-brand-500" /> Member Workloads & Bandwidth
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.memberProgress.map((member, idx) => {
                  const total = member.total || 0;
                  const completed = member.completed || 0;
                  const blocked = member.blocked || 0;
                  const pending = member.pending || 0;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  
                  return (
                    <div key={idx} className="bg-neutral-50/20 border border-neutral-200/80 rounded-2xl p-4 flex flex-col gap-3 shadow-3xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-extrabold text-[11px] shadow-3xs">
                            {member.member.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-neutral-850 block">{member.member}</span>
                            <span className="text-[9px] text-neutral-450 font-bold uppercase tracking-wider mt-0.5">{total} Tasks ({blocked} Blocked)</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-neutral-900 font-mono">{pct}%</span>
                      </div>
                      
                      {/* Workload progress meter */}
                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden flex shadow-2xs">
                        <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" style={{ width: `${(completed / (total || 1)) * 100}%` }}></div>
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(blocked / (total || 1)) * 100}%` }}></div>
                        <div className="h-full bg-blue-500 rounded-r-full transition-all duration-500" style={{ width: `${((pending - blocked) / (total || 1)) * 100}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Decision Timeline Feed */}
          {dashboard?.timeline && dashboard.timeline.length > 0 && (
            <div className="glass bg-white border border-brand-100 p-5 rounded-2xl flex flex-col gap-4 shadow-xs">
              <h3 className="text-xs font-black text-neutral-705 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-100 pb-2.5">
                <CalendarDays size={14} className="text-brand-500" /> Chronological AI Timeline
              </h3>
              
              <div className="relative pl-3 flex flex-col gap-4">
                <div className="absolute left-[9px] top-1.5 bottom-1.5 w-[2px] bg-neutral-150"></div>
                
                {dashboard.timeline.slice(0, 8).map((event, idx) => (
                  <div key={idx} className="flex gap-4 relative items-start group">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 shadow-2xs group-hover:scale-110 transition-transform ${
                      event.type === 'Success' ? 'bg-emerald-500 border border-emerald-600 text-white' :
                      event.type === 'Milestone' ? 'bg-purple-500 border border-purple-655 text-white' :
                      event.type === 'Info' ? 'bg-blue-500 border border-blue-655 text-white' :
                      event.type === 'Alert' ? 'bg-red-500 border border-red-655 text-white' :
                      'bg-neutral-500 border border-neutral-600 text-white'
                    }`}>
                      {event.type === 'Success' && <Check size={10} strokeWidth={3} />}
                      {event.type === 'Milestone' && <Award size={10} />}
                      {event.type === 'Info' && <Info size={10} />}
                      {event.type === 'Alert' && <AlertCircle size={10} />}
                      {event.type !== 'Success' && event.type !== 'Milestone' && event.type !== 'Info' && event.type !== 'Alert' && <Clock size={10} />}
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 min-h-[20px] pt-0.5">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-neutral-850 leading-normal">{event.event}</span>
                        {event.healthImpact && (
                          <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono font-bold text-neutral-450">
                            <span>Health: <strong className="text-emerald-600">{event.healthImpact}</strong></span>
                            <span>Risk: <strong className="text-red-500">{event.riskImpact}</strong></span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-neutral-400 font-mono shrink-0">
                        {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (4 cols): AI Recommendation Report Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full text-left">
          
          {/* Executive AI Report card */}
          <div className="glass bg-gradient-to-b from-neutral-50/40 to-white rounded-2xl p-5 border border-brand-100/60 flex flex-col gap-4 shadow-xs relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between border-b border-neutral-150 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-600 animate-pulse" />
                <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest">Executive AI Report</h3>
              </div>
              
              <button 
                type="button" 
                onClick={handleTriggerAnalysis}
                disabled={analysisLoading}
                className="px-2.5 py-1.5 border border-purple-200 bg-purple-50/20 text-purple-700 hover:bg-purple-50/50 rounded-xl cursor-pointer hover:border-purple-305 transition-all text-[10px] font-extrabold flex items-center justify-center gap-1"
              >
                {analysisLoading ? <RefreshCw className="animate-spin text-purple-600" size={11} /> : <RefreshCw size={11} />}
                <span>Regenerate Report</span>
              </button>
            </div>

            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-2">
                <RefreshCw className="animate-spin text-purple-600" size={24} />
                <span className="text-xs font-semibold text-neutral-500">Regenerating engineering report...</span>
              </div>
            ) : aiReport ? (
              <div className="flex flex-col gap-5 text-neutral-800 max-h-[85vh] overflow-y-auto pr-1">
                
                {/* 1. Executive Summary */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Executive Summary</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1 font-semibold">{aiReport.executiveReport?.executiveSummary || aiReport.completionPrediction}</p>
                </div>

                {/* 2. Overall Project Health */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Overall Project Health</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1">{aiReport.executiveReport?.overallProjectHealth || aiReport.reasoning}</p>
                </div>

                {/* 3. Project Overview */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Project Scope Overview</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1">{aiReport.executiveReport?.projectOverview || `Features to build: ${config.hackathonName}`}</p>
                </div>

                {/* 4. Feature Analysis */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Feature Analysis</span>
                  <p className="text-[11px] leading-relaxed text-neutral-750 font-mono mt-1 white-space-pre-line">{aiReport.executiveReport?.featureAnalysis || aiReport.currentFocus?.join('\n')}</p>
                </div>

                {/* 5. Task Analysis */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Task Analytics Breakdown</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1 font-mono">{aiReport.executiveReport?.taskAnalysis || 'Calculating task metadata...'}</p>
                </div>

                {/* 6. Team Analysis */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Team Workload Analysis</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1 font-mono white-space-pre-line">{aiReport.executiveReport?.teamAnalysis || 'Squad analysis not generated.'}</p>
                </div>

                {/* 7. GitHub Intelligence */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">GitHub Repository Intelligence</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1">{aiReport.executiveReport?.gitHubIntelligence || 'Hook GitHub integrations under the Git panel to monitor branch code releases.'}</p>
                </div>

                {/* 8. Marketplace Activity */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Marketplace Activity Log</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1 font-mono">{aiReport.executiveReport?.marketplaceActivity || 'No active marketplace trades.'}</p>
                </div>

                {/* 9. Collaboration Analysis */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Collaboration Dynamics</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1">{aiReport.executiveReport?.collaborationAnalysis || 'Review collaboration setups under the task swap request board.'}</p>
                </div>

                {/* 10. Risk Assessment */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Deep Risk Assessment</span>
                  <p className="text-[11px] leading-relaxed text-red-700 mt-1 white-space-pre-line">{aiReport.executiveReport?.riskAssessment || aiReport.scopeReductionSuggestions?.join('\n') || 'All systems operating within acceptable risk limits.'}</p>
                </div>

                {/* 11. Productivity & Timeline Analysis */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Productivity & Timeline Forecast</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1">{aiReport.executiveReport?.productivityAnalysis || ''} {aiReport.executiveReport?.timelineAnalysis || ''}</p>
                </div>

                {/* 12. Deployment, Testing, and Judge Readiness */}
                <div className="flex flex-col gap-1.5 border-b border-neutral-100 pb-3 text-neutral-800">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Readiness Assessments</span>
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    <div className="bg-neutral-50/50 p-2 rounded-xl border border-neutral-200">
                      <span className="text-[7px] font-bold text-neutral-450 uppercase">Deployment Readiness</span>
                      <p className="text-[10.5px] leading-normal font-semibold text-neutral-805 mt-0.5">{aiReport.executiveReport?.deploymentReadiness || 'Not evaluated.'}</p>
                    </div>
                    <div className="bg-neutral-50/50 p-2 rounded-xl border border-neutral-200">
                      <span className="text-[7px] font-bold text-neutral-450 uppercase">Testing Readiness</span>
                      <p className="text-[10.5px] leading-normal font-semibold text-neutral-805 mt-0.5">{aiReport.executiveReport?.testingReadiness || 'Not evaluated.'}</p>
                    </div>
                    <div className="bg-neutral-50/50 p-2 rounded-xl border border-neutral-200">
                      <span className="text-[7px] font-bold text-neutral-450 uppercase">Judge Pitch Readiness</span>
                      <p className="text-[10.5px] leading-normal font-semibold text-neutral-805 mt-0.5">{aiReport.executiveReport?.judgeReadiness || 'Not evaluated.'}</p>
                    </div>
                  </div>
                </div>

                {/* 13. Completion Forecast */}
                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Burndown Completion Forecast</span>
                  <p className="text-[11px] leading-relaxed text-neutral-700 mt-1 font-semibold">{aiReport.executiveReport?.completionForecast || 'Loading burndown predictions...'}</p>
                </div>

                {/* 14. Recommendations List */}
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Explainable AI Recommendations</span>
                  <div className="flex flex-col gap-1.5">
                    {(aiReport.executiveReport?.recommendations || aiReport.judgePreparationTips || []).map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-neutral-700 bg-neutral-50/30 p-2.5 rounded-xl border border-neutral-150/40">
                        <ArrowUpRight size={12} className="shrink-0 mt-0.5 text-purple-600" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-400 gap-3">
                <RefreshCw size={24} className="text-purple-400 animate-pulse" />
                <p className="text-xs text-neutral-500 max-w-[220px] mx-auto leading-relaxed">
                  No AI assessment generated for this hackathon config yet.
                </p>
                <button 
                  type="button" 
                  onClick={handleTriggerAnalysis}
                  className="btn-primary text-xs py-1.5 px-3 cursor-pointer bg-purple-600 hover:bg-purple-700 border-purple-600 shadow-2xs"
                >
                  Generate Initial Analysis
                </button>
              </div>
            )}
          </div>
          
        </div>

      </div>
      ) : (
        <div className="animate-slide-up w-full">
          <GitHubPanel projectId={projectId} isOwner={dashboard?.isOwner} />
        </div>
      )}

    </div>
  );
};

export default HackathonCommandCenter;
