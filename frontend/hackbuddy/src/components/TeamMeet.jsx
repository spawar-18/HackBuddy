import { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../services/socket';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  Users, Maximize2, Minimize2, Volume2, VolumeX, Wifi, WifiOff,
} from 'lucide-react';

// ─── ICE / STUN config ─────────────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
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

// ─── Video Tile ──────────────────────────────────────────────────────────────────
const VideoTile = ({ stream, name, avatar, audioOn, videoOn, isLocal, isLarge }) => {
  const videoRef = useRef(null);
  const [colors] = useState(() => getAvatarColor(name));

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const size = isLarge ? { width: '100%', height: '100%' } : { width: '100%', height: '100%' };

  return (
    <div style={{
      position: 'relative', borderRadius: 16, overflow: 'hidden',
      background: 'rgba(10,12,28,0.95)',
      border: '1.5px solid rgba(255,255,255,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      aspectRatio: '16/9',
      ...size,
    }}>
      {/* Video stream */}
      {stream && videoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        // Avatar fallback when camera is off
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${colors[0]}22, ${colors[1]}22)`,
        }}>
          {avatar ? (
            <img src={avatar} alt={name} style={{
              width: 72, height: 72, borderRadius: '50%',
              objectFit: 'cover', border: `3px solid ${colors[0]}`,
            }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff',
            }}>
              {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            Camera off
          </div>
        </div>
      )}

      {/* Name + mic indicator overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '24px 12px 10px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: '#fff',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '80%',
        }}>
          {name}{isLocal ? ' (You)' : ''}
        </span>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: audioOn ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
          border: `1.5px solid ${audioOn ? '#22c55e' : '#ef4444'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {audioOn
            ? <Mic size={12} color="#22c55e" />
            : <MicOff size={12} color="#ef4444" />
          }
        </div>
      </div>

      {/* Local badge */}
      {isLocal && (
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(99,102,241,0.85)', borderRadius: 6,
          padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#fff',
          backdropFilter: 'blur(4px)',
        }}>
          YOU
        </div>
      )}
    </div>
  );
};

// ─── Main TeamMeet Component ──────────────────────────────────────────────────────
const TeamMeet = ({ teamId, teamName, user, onClose }) => {
  const [peers, setPeers] = useState({}); // { socketId: { name, avatar, audioOn, videoOn, stream } }
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting | connected | error
  const [participantCount, setParticipantCount] = useState(1);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { socketId: RTCPeerConnection }
  const pendingCandidatesRef = useRef({}); // { socketId: RTCIceCandidate[] }
  const containerRef = useRef(null);

  const userId = user?._id || user?.id;
  const userName = user?.name || 'You';
  const userAvatar = user?.avatar || null;

  // ── Create RTCPeerConnection for a remote peer ──────────────────────────────
  const createPeerConnection = useCallback((remoteSocketId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // When we receive remote tracks, store them
    pc.ontrack = (e) => {
      const [remoteStream] = e.streams;
      setPeers(prev => ({
        ...prev,
        [remoteSocketId]: { ...(prev[remoteSocketId] || {}), stream: remoteStream },
      }));
    };

    // Relay ICE candidates via signaling server
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc-ice-candidate', {
          targetSocketId: remoteSocketId,
          candidate: e.candidate,
          fromSocketId: socket.id,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      }
    };

    peerConnectionsRef.current[remoteSocketId] = pc;
    return pc;
  }, []);

  // ── Initiate offer to a new peer ────────────────────────────────────────────
  const callPeer = useCallback(async (remoteSocketId) => {
    const pc = createPeerConnection(remoteSocketId);
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', {
        targetSocketId: remoteSocketId,
        offer,
        fromSocketId: socket.id,
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [createPeerConnection]);

  // ── Initialize local media + join room ──────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        setLocalStream(stream);

        if (!socket.connected) socket.connect();

        socket.emit('join-meet-room', {
          teamId, userId, userName, userAvatar,
        });
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Media/socket error:', err);
        if (mounted) setConnectionStatus('error');
        // Still join without media if permission denied
        if (!socket.connected) socket.connect();
        socket.emit('join-meet-room', { teamId, userId, userName, userAvatar });
      }
    };

    init();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, userId, userName, userAvatar]);

  // ── Socket.IO event listeners ───────────────────────────────────────────────
  useEffect(() => {
    // Existing peers in room when we join
    const onExistingPeers = (existingPeers) => {
      existingPeers.forEach(peer => {
        setPeers(prev => ({
          ...prev,
          [peer.socketId]: {
            name: peer.userName,
            avatar: peer.userAvatar,
            audioOn: peer.audioOn,
            videoOn: peer.videoOn,
            stream: null,
          },
        }));
        // We initiate call to each existing peer
        callPeer(peer.socketId);
      });
      setParticipantCount(1 + existingPeers.length);
    };

    // Someone new joined
    const onPeerJoined = (peer) => {
      setPeers(prev => ({
        ...prev,
        [peer.socketId]: {
          name: peer.userName,
          avatar: peer.userAvatar,
          audioOn: peer.audioOn,
          videoOn: peer.videoOn,
          stream: null,
        },
      }));
      setParticipantCount(prev => prev + 1);
      // The new peer will call us, so we just wait for the offer
    };

    // Receive WebRTC offer from a peer
    const onOffer = async ({ offer, fromSocketId }) => {
      let pc = peerConnectionsRef.current[fromSocketId];
      if (!pc) {
        pc = createPeerConnection(fromSocketId);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        // Flush pending candidates
        if (pendingCandidatesRef.current[fromSocketId]) {
          for (const c of pendingCandidatesRef.current[fromSocketId]) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          delete pendingCandidatesRef.current[fromSocketId];
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          targetSocketId: fromSocketId, answer, fromSocketId: socket.id,
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    // Receive WebRTC answer
    const onAnswer = async ({ answer, fromSocketId }) => {
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          // Flush pending candidates
          if (pendingCandidatesRef.current[fromSocketId]) {
            for (const c of pendingCandidatesRef.current[fromSocketId]) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            delete pendingCandidatesRef.current[fromSocketId];
          }
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    };

    // Receive ICE candidate
    const onIceCandidate = async ({ candidate, fromSocketId }) => {
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('ICE error:', err);
        }
      } else {
        // Queue until remote description is set
        if (!pendingCandidatesRef.current[fromSocketId]) {
          pendingCandidatesRef.current[fromSocketId] = [];
        }
        pendingCandidatesRef.current[fromSocketId].push(candidate);
      }
    };

    // Remote peer toggled mic/camera
    const onPeerMediaToggle = ({ socketId, audioOn, videoOn }) => {
      setPeers(prev => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), audioOn, videoOn },
      }));
    };

    // Someone left
    const onPeerLeft = ({ socketId }) => {
      const pc = peerConnectionsRef.current[socketId];
      if (pc) { pc.close(); delete peerConnectionsRef.current[socketId]; }
      setPeers(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setParticipantCount(prev => Math.max(1, prev - 1));
    };

    socket.on('existing-peers', onExistingPeers);
    socket.on('peer-joined', onPeerJoined);
    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('webrtc-ice-candidate', onIceCandidate);
    socket.on('peer-media-toggle', onPeerMediaToggle);
    socket.on('peer-left', onPeerLeft);

    return () => {
      socket.off('existing-peers', onExistingPeers);
      socket.off('peer-joined', onPeerJoined);
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('webrtc-ice-candidate', onIceCandidate);
      socket.off('peer-media-toggle', onPeerMediaToggle);
      socket.off('peer-left', onPeerLeft);
    };
  }, [callPeer, createPeerConnection]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      socket.emit('leave-meet-room');
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    };
  }, []);

  // ── Controls ────────────────────────────────────────────────────────────────
  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const newState = !audioOn;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = newState; });
    setAudioOn(newState);
    socket.emit('toggle-media', { audioOn: newState, videoOn });
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const newState = !videoOn;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = newState; });
    setVideoOn(newState);
    socket.emit('toggle-media', { audioOn, videoOn: newState });
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen share, revert to camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setScreenSharing(false);
      // Restore camera track in all peer connections
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(cameraTrack);
        });
      }
    } else {
      try {
        const sStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = sStream;
        setScreenStream(sStream);
        setScreenSharing(true);
        // Replace video track in all peer connections
        const screenTrack = sStream.getVideoTracks()[0];
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        // Auto-stop when user clicks browser's "stop sharing"
        screenTrack.onended = () => {
          setScreenSharing(false);
          screenStreamRef.current = null;
          setScreenStream(null);
          const cameraTrack2 = localStreamRef.current?.getVideoTracks()[0];
          if (cameraTrack2) {
            Object.values(peerConnectionsRef.current).forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(cameraTrack2);
            });
          }
        };
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  const endCall = () => {
    socket.emit('leave-meet-room');
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    onClose();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(v => !v);
  };

  // ── Layout computation ──────────────────────────────────────────────────────
  const remotePeers = Object.entries(peers);
  const totalTiles = 1 + remotePeers.length; // local + remotes
  const gridCols = totalTiles <= 1 ? 1 : totalTiles <= 4 ? 2 : totalTiles <= 9 ? 3 : 4;

  const localDisplayStream = screenSharing ? screenStream : localStream;

  return (
    <>
      <style>{`
        @keyframes meetFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes tileIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(99,102,241,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        .meet-ctrl-btn:hover { opacity: 0.85; transform: scale(1.08); }
        .meet-ctrl-btn:active { transform: scale(0.95); }
        .meet-ctrl-btn { transition: all 0.15s ease; }
        .end-call-btn:hover { background: #dc2626 !important; }
      `}</style>

      {/* ── Full-screen overlay ── */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'linear-gradient(135deg, #060714 0%, #0a0c1e 50%, #070a1a 100%)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
          animation: 'meetFadeIn 0.3s ease-out',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 16,
          background: 'rgba(6,7,20,0.8)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}>
          {/* Live badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
              display: 'inline-block', animation: 'pulse-ring 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: '0.06em' }}>
              LIVE
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}>
              #{teamName} — Team Meet
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: 1 }}>
              {participantCount} participant{participantCount !== 1 ? 's' : ''} connected
            </div>
          </div>

          {/* Connection status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 8,
            background: connectionStatus === 'connected'
              ? 'rgba(34,197,94,0.1)' : connectionStatus === 'error'
              ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${connectionStatus === 'connected' ? 'rgba(34,197,94,0.3)' : connectionStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`,
          }}>
            {connectionStatus === 'connected'
              ? <Wifi size={12} color="#22c55e" />
              : connectionStatus === 'error'
              ? <WifiOff size={12} color="#ef4444" />
              : <Wifi size={12} color="#fbbf24" />
            }
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'error' ? '#ef4444' : '#fbbf24',
            }}>
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Error' : 'Connecting…'}
            </span>
          </div>

          {/* Participant count pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <Users size={13} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              {participantCount}
            </span>
          </div>

          {/* Fullscreen toggle */}
          <button
            className="meet-ctrl-btn"
            onClick={toggleFullscreen}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isFullscreen
              ? <Minimize2 size={15} color="rgba(255,255,255,0.7)" />
              : <Maximize2 size={15} color="rgba(255,255,255,0.7)" />
            }
          </button>
        </div>

        {/* ── Video Grid ── */}
        <div style={{
          flex: 1, overflow: 'auto', padding: 16,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: 12,
          alignContent: 'start',
        }}>
          {/* Local tile */}
          <div style={{ animation: 'tileIn 0.3s ease-out' }}>
            <VideoTile
              stream={localDisplayStream}
              name={userName}
              avatar={userAvatar}
              audioOn={audioOn}
              videoOn={videoOn}
              isLocal
            />
          </div>

          {/* Remote peer tiles */}
          {remotePeers.map(([socketId, peer]) => (
            <div key={socketId} style={{ animation: 'tileIn 0.35s ease-out' }}>
              <VideoTile
                stream={peer.stream}
                name={peer.name || 'Participant'}
                avatar={peer.avatar}
                audioOn={peer.audioOn !== false}
                videoOn={peer.videoOn !== false}
                isLocal={false}
              />
            </div>
          ))}

          {/* Empty waiting state when alone */}
          {remotePeers.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '40px 24px', gap: 12,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 4,
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={24} color="#818cf8" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                Waiting for teammates…
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 300 }}>
                Share the chat link or ask your team members to click <strong style={{ color: '#818cf8' }}>Join Meet</strong> in the team chat.
              </div>
            </div>
          )}
        </div>

        {/* ── Controls Bar ── */}
        <div style={{
          height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '0 24px',
          background: 'rgba(6,7,20,0.9)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}>
          {/* Mute/Unmute */}
          <button
            className="meet-ctrl-btn"
            onClick={toggleAudio}
            title={audioOn ? 'Mute microphone' : 'Unmute microphone'}
            style={{
              width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: audioOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.25)',
              border: audioOn ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(239,68,68,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: audioOn ? 'none' : '0 0 16px rgba(239,68,68,0.25)',
            }}
          >
            {audioOn ? <Mic size={20} color="#fff" /> : <MicOff size={20} color="#ef4444" />}
          </button>

          {/* Camera toggle */}
          <button
            className="meet-ctrl-btn"
            onClick={toggleVideo}
            title={videoOn ? 'Turn off camera' : 'Turn on camera'}
            style={{
              width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: videoOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.25)',
              border: videoOn ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(239,68,68,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: videoOn ? 'none' : '0 0 16px rgba(239,68,68,0.25)',
            }}
          >
            {videoOn ? <Video size={20} color="#fff" /> : <VideoOff size={20} color="#ef4444" />}
          </button>

          {/* Screen share */}
          <button
            className="meet-ctrl-btn"
            onClick={toggleScreenShare}
            title={screenSharing ? 'Stop sharing screen' : 'Share screen'}
            style={{
              width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: screenSharing ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)',
              border: screenSharing ? '1.5px solid rgba(99,102,241,0.6)' : '1.5px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: screenSharing ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
            }}
          >
            {screenSharing
              ? <MonitorOff size={20} color="#818cf8" />
              : <Monitor size={20} color="#fff" />
            }
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* End call */}
          <button
            className="meet-ctrl-btn end-call-btn"
            onClick={endCall}
            title="End call"
            style={{
              width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239,68,68,0.45)',
              transition: 'all 0.15s ease',
            }}
          >
            <PhoneOff size={22} color="#fff" />
          </button>
        </div>
      </div>
    </>
  );
};

export default TeamMeet;
