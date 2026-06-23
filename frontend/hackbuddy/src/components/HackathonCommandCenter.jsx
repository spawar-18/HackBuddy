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
  Gauge, TrendingUp, CheckSquare, ShieldCheck, ArrowUpRight, Database, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const HackathonCommandCenter = ({ projectId, onBack }) => {
  const [config, setConfig] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  
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
      console.error('Error fetching command center data:', err);
      toast.error('Failed to load Command Center details');
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

      {/* ═══ Main Split Dashboard Layout ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* LEFT COLUMN (8 cols): Ticking HUD Clock, Progress, Team Workloads, Timelines */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          
          {/* Ticking Clock HUD Widget */}
          <div className="glass bg-neutral-950 border border-neutral-900 p-6 rounded-2xl text-white relative overflow-hidden shadow-md">
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl"></div>
            
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
          </div>

          {/* Active smart Alerts Feed */}
          {dashboard?.alerts && dashboard.alerts.length > 0 && (
            <div className="glass bg-white border border-brand-100 p-5 rounded-2xl flex flex-col gap-3 shadow-xs">
              <h3 className="text-xs font-black text-neutral-700 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-100 pb-2.5">
                <ShieldAlert size={14} className="text-red-500 animate-pulse" /> Active Smart Alerts
              </h3>
              <div className="flex flex-col gap-2">
                {dashboard.alerts.map((alert, idx) => {
                  const isCrit = alert.priority === 'Critical' || alert.priority === 'High';
                  return (
                    <div key={idx} className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                      isCrit ? 'bg-red-50/50 border-red-200 text-red-800' : 'bg-amber-50/50 border-amber-200 text-amber-800'
                    }`}>
                      <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${isCrit ? 'text-red-500 animate-bounce' : 'text-amber-500'}`} />
                      <span className="font-semibold">{alert.message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      strokeWidth="2.5"
                      stroke="#f1f5f9"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      strokeWidth="2.8"
                      strokeDasharray={`${progressMetrics.completionPercentage}, 100`}
                      strokeLinecap="round"
                      stroke="#3b82f6"
                      fill="none"
                      className="transition-all duration-1000 ease-out shadow-sm"
                    />
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

          {/* Timeline Feed */}
          {dashboard?.timeline && dashboard.timeline.length > 0 && (
            <div className="glass bg-white border border-brand-100 p-5 rounded-2xl flex flex-col gap-4 shadow-xs">
              <h3 className="text-xs font-black text-neutral-705 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-100 pb-2.5">
                <CalendarDays size={14} className="text-brand-500" /> Productivity Timeline
              </h3>
              
              <div className="relative pl-3 flex flex-col gap-4">
                <div className="absolute left-[9px] top-1.5 bottom-1.5 w-[2px] bg-neutral-150"></div>
                
                {dashboard.timeline.slice(0, 5).map((event, idx) => (
                  <div key={idx} className="flex gap-4 relative items-start group">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 shadow-2xs group-hover:scale-110 transition-transform ${
                      event.type === 'Success' ? 'bg-emerald-500 border border-emerald-600 text-white' :
                      event.type === 'Milestone' ? 'bg-purple-500 border border-purple-650 text-white' :
                      event.type === 'Info' ? 'bg-blue-500 border border-blue-650 text-white' :
                      'bg-neutral-500 border border-neutral-600 text-white'
                    }`}>
                      {event.type === 'Success' && <Check size={10} strokeWidth={3} />}
                      {event.type === 'Milestone' && <Award size={10} />}
                      {event.type === 'Info' && <Info size={10} />}
                      {event.type !== 'Success' && event.type !== 'Milestone' && event.type !== 'Info' && <Clock size={10} />}
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-1 min-h-[20px] pt-0.5">
                      <span className="text-xs font-semibold text-neutral-700 leading-normal">{event.event}</span>
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
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          
          {/* Executive AI Report card */}
          <div className="glass bg-gradient-to-b from-neutral-50/40 to-white rounded-2xl p-5 border border-brand-100/60 flex flex-col gap-4 shadow-xs relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between border-b border-neutral-150 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-600 animate-pulse" />
                <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest">AI Command Report</h3>
              </div>
              
              <button 
                type="button" 
                onClick={handleTriggerAnalysis}
                disabled={analysisLoading}
                className="px-2.5 py-1.5 border border-purple-200 bg-purple-50/20 text-purple-700 hover:bg-purple-50/50 rounded-xl cursor-pointer hover:border-purple-305 transition-all text-[10px] font-extrabold flex items-center justify-center gap-1"
              >
                {analysisLoading ? <RefreshCw className="animate-spin text-purple-600" size={11} /> : <RefreshCw size={11} />}
                <span>Refresh AI</span>
              </button>
            </div>

            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-2">
                <RefreshCw className="animate-spin text-purple-600" size={24} />
                <span className="text-xs font-semibold text-neutral-500">Regenerating engineering assessment...</span>
              </div>
            ) : aiReport ? (
              <div className="flex flex-col gap-4">
                
                {/* Status displays */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className={`p-3 rounded-2xl border flex flex-col gap-1 items-center justify-center ${getOverallStatusColor(aiReport.overallStatus)}`}>
                    <span className="text-[8px] font-black text-neutral-450 uppercase tracking-wider">TEAM STATUS</span>
                    <span className="font-black leading-none mt-1 text-xs tracking-tight">{aiReport.overallStatus}</span>
                  </div>
                  
                  <div className={`p-3 rounded-2xl border flex flex-col gap-1 items-center justify-center bg-neutral-50/50 border-neutral-200 ${getRiskLevelColor(aiReport.riskLevel)}`}>
                    <span className="text-[8px] font-black text-neutral-450 uppercase tracking-wider">RISK LEVEL</span>
                    <span className="font-black leading-none mt-1 text-xs tracking-tight">{aiReport.riskLevel}</span>
                  </div>
                </div>

                {/* Prediction summary */}
                <div className="p-3 bg-brand-50/15 border border-brand-100 rounded-xl text-xs flex gap-2.5 items-start shadow-3xs">
                  <Info size={14} className="text-brand-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-neutral-450 uppercase tracking-widest">COMPLETION PREDICTION</span>
                    <span className="font-semibold text-neutral-800 mt-1 leading-normal">{aiReport.completionPrediction}</span>
                  </div>
                </div>

                {/* Focus list */}
                {aiReport.currentFocus && aiReport.currentFocus.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">CURRENT FOCUS</span>
                    <div className="flex flex-col gap-1.5">
                      {aiReport.currentFocus.map((f, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700 bg-neutral-50/40 p-2.5 rounded-xl border border-neutral-150/40 hover:border-neutral-200 transition-colors shadow-3xs">
                          <CheckCircle size={12} className="text-brand-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scope Guardian Section */}
                <div className="flex flex-col gap-2 bg-neutral-50/30 border border-neutral-200 rounded-2xl p-4 shadow-3xs">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-purple-650" />
                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">AI Scope Guardian</span>
                  </div>
                  
                  {aiReport.tasksToPostpone && aiReport.tasksToPostpone.length > 0 ? (
                    <div className="flex flex-col gap-3 mt-2">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">POSTPONE (SCOPE CUT)</span>
                        {aiReport.tasksToPostpone.map((p, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-red-700 bg-red-50/20 px-2.5 py-1.5 rounded-xl border border-red-100">
                            <Ban size={11} className="shrink-0 mt-0.5 text-red-500" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex flex-col gap-1 border-t border-neutral-200/60 pt-2.5">
                        <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Scope Reasoning</span>
                        <p className="text-[11px] text-neutral-500 leading-relaxed italic">{aiReport.reasoning}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-2 leading-relaxed bg-emerald-50/30 p-3 border border-emerald-100 rounded-xl flex items-start gap-2">
                      <CheckCircle size={13} className="shrink-0 mt-0.5" />
                      <span>Time margins are solid. Scope Guardian is not suggesting any feature cuts. Stick to the roadmap!</span>
                    </p>
                  )}
                </div>

                {/* Pitch Advice */}
                {aiReport.judgePreparationTips && aiReport.judgePreparationTips.length > 0 && (
                  <div className="flex flex-col gap-2 bg-neutral-950 text-white rounded-2xl p-4 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                    <div className="flex items-center gap-1.5 relative z-10 mb-1">
                      <Award size={14} className="text-orange-400 animate-pulse" />
                      <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">JUDGE DAY PITCH ADVICE</span>
                    </div>
                    <div className="flex flex-col gap-2 relative z-10">
                      {aiReport.judgePreparationTips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-[11px] leading-relaxed text-neutral-300">
                          <ArrowUpRight size={12} className="shrink-0 mt-0.5 text-orange-400" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

    </div>
  );
};

export default HackathonCommandCenter;
