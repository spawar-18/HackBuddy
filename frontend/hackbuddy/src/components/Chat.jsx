import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getMyTeams } from '../services/teamService';
import TeamMeet from './TeamMeet';
import socket from '../services/socket';

import {
  Send, Users, MessageSquare, ArrowLeft, Hash, Circle,
  Smile, Paperclip, MoreVertical, Search, X, ChevronDown, Zap, Video
} from 'lucide-react';

// ─── Utility ───────────────────────────────────────────────────────────────────
const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};

const getAvatarColor = (name = '') => {
  const colors = [
    ['#6366f1', '#818cf8'], ['#8b5cf6', '#a78bfa'], ['#ec4899', '#f472b6'],
    ['#14b8a6', '#2dd4bf'], ['#f59e0b', '#fbbf24'], ['#10b981', '#34d399'],
    ['#3b82f6', '#60a5fa'], ['#ef4444', '#f87171'],
  ];
  let idx = 0;
  for (let i = 0; i < name.length; i++) idx += name.charCodeAt(i);
  return colors[idx % colors.length];
};

const Avatar = ({ name = '', avatar = null, size = 36, online = false }) => {
  const [colors] = useState(() => getAvatarColor(name));
  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          style={{
            width: size, height: size, borderRadius: '50%',
            objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)'
          }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: size * 0.38,
          border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0,
          fontFamily: 'Inter, sans-serif'
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {online && (
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28,
          background: '#22c55e', borderRadius: '50%',
          border: '2px solid #0f172a'
        }} />
      )}
    </div>
  );
};

// ─── Message Bubble ─────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, isOwn, showAvatar, showName, showDate, dateLabel }) => {
  return (
    <>
      {showDate && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 12px',
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
            padding: '3px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            letterSpacing: '0.04em', userSelect: 'none'
          }}>{dateLabel}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 10,
        marginBottom: showAvatar ? 4 : 2,
        animation: 'msgSlideIn 0.25s ease-out',
      }}>
        {/* Avatar placeholder or actual avatar */}
        <div style={{ width: 36, flexShrink: 0 }}>
          {showAvatar && !isOwn && (
            <Avatar name={msg.userName} avatar={msg.userAvatar} size={36} online />
          )}
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          maxWidth: 'min(72%, 520px)',
        }}>
          {showName && !isOwn && (
            <span style={{
              fontSize: 12, fontWeight: 700, marginBottom: 4, marginLeft: 2,
              background: `linear-gradient(90deg, ${getAvatarColor(msg.userName)[0]}, ${getAvatarColor(msg.userName)[1]})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '0.01em'
            }}>
              {msg.userName}
            </span>
          )}

          <div style={{
            position: 'relative',
            background: isOwn
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'rgba(255,255,255,0.07)',
            border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: isOwn
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px',
            padding: '10px 14px',
            boxShadow: isOwn
              ? '0 4px 24px rgba(99,102,241,0.35)'
              : '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <p style={{
              margin: 0, fontSize: 14.5, lineHeight: 1.55,
              color: isOwn ? '#fff' : 'rgba(255,255,255,0.9)',
              wordBreak: 'break-word', whiteSpace: 'pre-wrap',
              fontFamily: 'Inter, sans-serif'
            }}>
              {msg.message}
            </p>
          </div>

          <span style={{
            fontSize: 10.5, color: 'rgba(255,255,255,0.28)',
            marginTop: 3, marginRight: isOwn ? 2 : 0,
            marginLeft: isOwn ? 0 : 2, fontVariantNumeric: 'tabular-nums'
          }}>
            {formatTime(msg.createdAt)}
          </span>
        </div>
      </div>
    </>
  );
};

// ─── Sidebar: Team Selector ──────────────────────────────────────────────────────
const TeamSidebar = ({ teams, selectedTeam, onSelect, currentUserId }) => {
  const [search, setSearch] = useState('');
  const filtered = teams.filter(t =>
    t.teamName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      width: 280, minWidth: 220, maxWidth: 320,
      background: 'rgba(15,18,36,0.98)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MessageSquare size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}>
              Team Chat
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
              {teams.length} workspace{teams.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.06)', borderRadius: 10,
          padding: '7px 10px', border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <Search size={13} color="rgba(255,255,255,0.35)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Find a team…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#fff', fontSize: 13, flex: 1,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={12} color="rgba(255,255,255,0.35)" />
            </button>
          )}
        </div>
      </div>

      {/* Teams List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '8px 8px 6px'
        }}>
          Channels
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            No teams found
          </div>
        )}

        {filtered.map(team => {
          const isActive = selectedTeam?._id === team._id;
          return (
            <button
              key={team._id}
              onClick={() => onSelect(team)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: isActive
                  ? 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.18))'
                  : 'transparent',
                borderLeft: isActive ? '3px solid #818cf8' : '3px solid transparent',
                transition: 'all 0.18s ease', marginBottom: 2,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Hash size={15} color={isActive ? '#818cf8' : 'rgba(255,255,255,0.4)'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{
                  fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.7)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {team.teamName}
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {team.members?.length || 0} members
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Members Panel ───────────────────────────────────────────────────────────────
const MembersPanel = ({ members = [], currentUserId }) => (
  <div style={{
    width: 220, minWidth: 180,
    background: 'rgba(13,15,30,0.97)',
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'
  }}>
    <div style={{
      padding: '20px 16px 12px',
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.08em'
      }}>
        <Users size={13} />
        Members — {members.length}
      </div>
    </div>

    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
      {/* Online section */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '4px 8px 8px'
      }}>
        Online — {members.length}
      </div>
      {members.map(m => {
        const id = m._id || m;
        const isYou = id?.toString() === currentUserId?.toString();
        return (
          <div
            key={id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 8px', borderRadius: 8, marginBottom: 2,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Avatar name={m.name || 'User'} avatar={m.avatar} size={32} online />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: isYou ? '#a78bfa' : 'rgba(255,255,255,0.8)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {m.name || 'Unknown'}{isYou ? ' (You)' : ''}
              </div>
              {m.skills && m.skills.length > 0 && (
                <div style={{
                  fontSize: 10.5, color: 'rgba(255,255,255,0.3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {m.skills.slice(0, 2).join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Main Chat Page ──────────────────────────────────────────────────────────────
const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);  // populated members
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [meetActive, setMeetActive] = useState(false);

  // Broadcast meet-started / meet-ended via socket so Dashboard can notify
  useEffect(() => {
    if (!selectedTeam) return;
    if (meetActive) {
      if (!socket.connected) socket.connect();
      socket.emit('meet-broadcast', {
        type: 'started',
        teamId: selectedTeam._id,
        teamName: selectedTeam.teamName,
        starterName: user?.name || 'A teammate',
      });
    } else {
      if (socket.connected) {
        socket.emit('meet-broadcast', {
          type: 'ended',
          teamId: selectedTeam._id,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetActive]);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const pollingRef = useRef(null);
  const lastMessageTimeRef = useRef(null);

  // ── Load teams ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyTeams();
        setTeams(data || []);
        if (data && data.length > 0) setSelectedTeam(data[0]);
      } catch (err) {
        console.error('Failed to load teams:', err);
      } finally {
        setLoadingTeams(false);
      }
    };
    load();
  }, []);

  // ── Load team info (members) when team changes ────────────────────────────────
  useEffect(() => {
    if (!selectedTeam) return;
    const fetchInfo = async () => {
      try {
        const res = await api.get(`/team-chat/${selectedTeam._id}/info`);
        if (res.data.success) setTeamInfo(res.data.team);
      } catch (err) {
        console.error('Failed to load team info:', err);
      }
    };
    fetchInfo();
  }, [selectedTeam]);

  // ── Load initial messages ─────────────────────────────────────────────────────
  const loadMessages = useCallback(async (teamId) => {
    setLoading(true);
    try {
      const res = await api.get(`/team-chat/${teamId}/messages?limit=100`);
      if (res.data.success) {
        setMessages(res.data.messages);
        if (res.data.messages.length > 0) {
          lastMessageTimeRef.current = res.data.messages[res.data.messages.length - 1].createdAt;
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTeam) return;
    setMessages([]);
    lastMessageTimeRef.current = null;
    loadMessages(selectedTeam._id);
    inputRef.current?.focus();
  }, [selectedTeam, loadMessages]);

  // ── Polling for new messages ──────────────────────────────────────────────────
  const pollMessages = useCallback(async () => {
    if (!selectedTeam) return;
    try {
      const since = lastMessageTimeRef.current;
      const url = since
        ? `/team-chat/${selectedTeam._id}/messages?since=${encodeURIComponent(since)}&limit=50`
        : `/team-chat/${selectedTeam._id}/messages?limit=50`;
      const res = await api.get(url);
      if (res.data.success && res.data.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const newOnes = res.data.messages.filter(m => !existingIds.has(m._id));
          if (newOnes.length === 0) return prev;
          lastMessageTimeRef.current = newOnes[newOnes.length - 1].createdAt;
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      // silent polling error
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (!selectedTeam) return;
    pollingRef.current = setInterval(pollMessages, 2000);
    return () => clearInterval(pollingRef.current);
  }, [selectedTeam, pollMessages]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (atBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, atBottom]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAtBottom(true);
  };

  // ── Send message ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || !selectedTeam || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update
    const optimistic = {
      _id: 'opt_' + Date.now(),
      teamId: selectedTeam._id,
      userId: user?._id || user?.id,
      userName: user?.name || 'You',
      userAvatar: user?.avatar || null,
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setAtBottom(true);

    try {
      const res = await api.post(`/team-chat/${selectedTeam._id}/messages`, { message: text });
      if (res.data.success) {
        setMessages(prev =>
          prev.map(m => m._id === optimistic._id ? res.data.message : m)
        );
        lastMessageTimeRef.current = res.data.message.createdAt;
      }
    } catch (err) {
      console.error('Send failed:', err);
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setInputText(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Group messages by date & consecutive sender ──────────────────────────────
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const prev = messages[idx - 1];
    const msgDate = formatDate(msg.createdAt);
    const prevDate = prev ? formatDate(prev.createdAt) : null;
    const showDate = msgDate !== prevDate;
    const showAvatar = !prev || prev.userId?.toString() !== msg.userId?.toString() || showDate;
    const showName = showAvatar;
    acc.push({ ...msg, showDate, showAvatar, showName, dateLabel: msgDate });
    return acc;
  }, []);

  const currentUserId = user?._id || user?.id;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        .chat-input:focus { outline: none; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .send-btn:hover { transform: scale(1.05); }
        .send-btn:active { transform: scale(0.97); }
      `}</style>

      <div style={{
        width: '100vw', height: '100vh',
        background: 'linear-gradient(135deg, #0a0b1a 0%, #0f1128 50%, #0d0f22 100%)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Inter, sans-serif', overflow: 'hidden',
      }}>

        {/* ── Top Bar ── */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 16,
          background: 'rgba(10,11,26,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0, zIndex: 10,
          backdropFilter: 'blur(12px)',
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}>
              Hack<span style={{ color: '#818cf8' }}>Buddy</span>
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginLeft: 4
            }}>
              Team Chat
            </span>
          </div>

          {selectedTeam && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Live dot — only when a meet is active */}
              {meetActive && (
                <>
                  <Circle size={8} color="#ef4444" fill="#ef4444" style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 12, color: '#f87171', fontWeight: 700, letterSpacing: '0.04em' }}>LIVE</span>
                </>
              )}

              {/* ── Start / Leave Meet button ── */}
              <button
                onClick={() => setMeetActive(v => !v)}
                style={{
                  marginLeft: 4, display: 'flex', alignItems: 'center', gap: 6,
                  background: meetActive
                    ? 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(220,38,38,0.18))'
                    : 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))',
                  border: meetActive
                    ? '1px solid rgba(239,68,68,0.45)'
                    : '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                  color: meetActive ? '#f87171' : '#a78bfa',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: meetActive ? '0 2px 12px rgba(239,68,68,0.25)' : '0 2px 12px rgba(99,102,241,0.25)',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <Video size={13} />
                {meetActive ? 'Leave Meet' : 'Start Meet'}
              </button>

              <button
                onClick={() => setShowMembers(v => !v)}
                style={{
                  marginLeft: 4, display: 'flex', alignItems: 'center', gap: 5,
                  background: showMembers ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                  border: showMembers ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                  color: showMembers ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                }}
              >
                <Users size={13} /> Members
              </button>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Team Sidebar */}
          {loadingTeams ? (
            <div style={{
              width: 280, background: 'rgba(15,18,36,0.98)',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)', fontSize: 13
            }}>
              Loading teams…
            </div>
          ) : (
            <TeamSidebar
              teams={teams}
              selectedTeam={selectedTeam}
              onSelect={(t) => { setSelectedTeam(t); setMessages([]); }}
              currentUserId={currentUserId}
            />
          )}

          {/* Chat Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

            {!selectedTeam ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)',
              }}>
                <MessageSquare size={52} strokeWidth={1.2} style={{ marginBottom: 16, opacity: 0.4 }} />
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,0.5)' }}>
                  Select a team to start chatting
                </div>
                <div style={{ fontSize: 13, maxWidth: 320, textAlign: 'center' }}>
                  {teams.length === 0
                    ? 'You haven\'t joined any teams yet. Create or join a team first.'
                    : 'Choose a channel from the left sidebar.'}
                </div>
                {teams.length === 0 && (
                  <button
                    onClick={() => navigate('/team/create')}
                    style={{
                      marginTop: 20, padding: '10px 24px',
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      border: 'none', borderRadius: 10, cursor: 'pointer',
                      color: '#fff', fontSize: 14, fontWeight: 700,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Create a Team
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Channel Header */}
                <div style={{
                  padding: '0 24px', height: 52, display: 'flex', alignItems: 'center',
                  gap: 10, borderBottom: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(10,12,25,0.8)', flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}>
                  <Hash size={16} color="#818cf8" />
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
                    {selectedTeam.teamName}
                  </span>
                  {selectedTeam.description && (
                    <>
                      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                        {selectedTeam.description}
                      </span>
                    </>
                  )}
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="chat-scroll"
                  style={{
                    flex: 1, overflowY: 'auto', overflowX: 'hidden',
                    padding: '16px 24px', display: 'flex', flexDirection: 'column',
                  }}
                >
                  {loading && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                      Loading messages…
                    </div>
                  )}

                  {!loading && messages.length === 0 && (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '60px 24px', textAlign: 'center'
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: 20, marginBottom: 16,
                        background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))',
                        border: '1px solid rgba(99,102,241,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Hash size={28} color="#818cf8" />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                        Welcome to #{selectedTeam.teamName}!
                      </div>
                      <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.35)', maxWidth: 360, lineHeight: 1.6 }}>
                        This is the beginning of your team chat. Say hi to your teammates! 🚀
                      </div>
                    </div>
                  )}

                  {groupedMessages.map((msg) => (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      isOwn={msg.userId?.toString() === currentUserId?.toString()}
                      showAvatar={msg.showAvatar}
                      showName={msg.showName}
                      showDate={msg.showDate}
                      dateLabel={msg.dateLabel}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Scroll to bottom button */}
                {!atBottom && (
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={scrollToBottom}
                      style={{
                        position: 'absolute', bottom: 8,
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: 'none', borderRadius: 20, padding: '6px 16px',
                        cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
                        fontFamily: 'Inter, sans-serif', transition: 'transform 0.15s',
                      }}
                    >
                      <ChevronDown size={14} /> New messages
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div style={{
                  padding: '14px 20px 18px',
                  background: 'rgba(10,12,25,0.9)',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  flexShrink: 0, backdropFilter: 'blur(8px)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-end', gap: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 14, padding: '10px 14px',
                    transition: 'border-color 0.2s',
                  }}
                    onFocus={() => { }}
                  >
                    <Smile size={18} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginBottom: 2, cursor: 'pointer' }} />
                    <textarea
                      ref={inputRef}
                      className="chat-input"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message #${selectedTeam.teamName}…`}
                      rows={1}
                      style={{
                        flex: 1, background: 'none', border: 'none',
                        color: '#fff', fontSize: 14, fontFamily: 'Inter, sans-serif',
                        resize: 'none', lineHeight: 1.5, maxHeight: 140,
                        overflowY: 'auto', paddingTop: 1,
                        '::placeholder': { color: 'rgba(255,255,255,0.3)' }
                      }}
                      onInput={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim() || sending}
                      className="send-btn"
                      style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: inputText.trim()
                          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                          : 'rgba(255,255,255,0.08)',
                        border: 'none', cursor: inputText.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', opacity: sending ? 0.6 : 1,
                        boxShadow: inputText.trim() ? '0 2px 12px rgba(99,102,241,0.45)' : 'none',
                      }}
                    >
                      <Send size={16} color={inputText.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
                    </button>
                  </div>
                  <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.2)',
                    marginTop: 6, marginLeft: 2
                  }}>
                    Press <kbd style={{
                      padding: '1px 5px', borderRadius: 4, fontSize: 10,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)'
                    }}>Enter</kbd> to send · <kbd style={{
                      padding: '1px 5px', borderRadius: 4, fontSize: 10,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)'
                    }}>Shift+Enter</kbd> for new line
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Members Panel */}
          {selectedTeam && showMembers && (
            <MembersPanel
              members={teamInfo?.members || selectedTeam?.members || []}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>

      {/* ── Team Meet Overlay ── */}
      {meetActive && selectedTeam && (
        <TeamMeet
          teamId={selectedTeam._id}
          teamName={selectedTeam.teamName}
          user={user}
          onClose={() => setMeetActive(false)}
        />
      )}
    </>
  );
};

export default Chat;
