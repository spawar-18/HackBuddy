import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Bookmark, Bot, CheckCircle2, 
  ChevronDown, ChevronUp, Clock, Copy, Cpu, History, Info, Layers, 
  MessageSquare, RefreshCw, Shield, Sparkles, Terminal, ThumbsDown, 
  ThumbsUp, Zap
} from 'lucide-react';
import { getChatHistory, sendChatMessage } from '../services/projectService';

const SUGGESTED_QUESTIONS = [
  'How should I deploy this MERN stack?',
  'How can I improve my AI Task Splitter?',
  'What is blocking us in the Command Center?',
  'Can I integrate OpenRouter with HackBuddy?',
  'Which feature should we prioritize for demo?',
  'How do I fix authentication issues?',
  'What will judges ask in our pitch?',
  'Review our GitHub progress'
];

const TOPIC_LABELS = {
  authentication: 'Authentication',
  github: 'GitHub',
  ai_integration: 'AI Integration',
  deployment: 'Deployment',
  command_center: 'Command Center',
  architecture: 'Architecture',
  database: 'Database',
  frontend: 'Frontend',
  backend: 'Backend',
  tasks: 'Tasks & Sprint',
  marketplace: 'Marketplace',
  project_review: 'Project Review',
  ui: 'UI / UX Design',
  debugging: 'Debugging',
  architecture: 'Architecture',
  performance: 'Performance',
  security: 'Security',
  notifications: 'Notifications',
  testing: 'Testing',
  general_project: 'Project Guidance'
};

const parseInlineMarkdown = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-neutral-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-neutral-100 text-brand-700 text-[0.85em] font-mono border border-neutral-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, idx) => {
    const content = line.trim();
    if (content.startsWith('### ')) {
      return <h4 key={idx} className="font-bold text-sm mt-3 mb-1 text-neutral-900">{parseInlineMarkdown(content.slice(4))}</h4>;
    }
    if (content.startsWith('## ')) {
      return <h3 key={idx} className="font-bold text-base mt-3 mb-1 text-neutral-900 border-b border-neutral-100 pb-1">{parseInlineMarkdown(content.slice(3))}</h3>;
    }
    if (content.startsWith('# ')) {
      return <h2 key={idx} className="font-bold text-lg mt-4 mb-2 text-brand-800">{parseInlineMarkdown(content.slice(2))}</h2>;
    }
    if (content.startsWith('- ') || content.startsWith('* ')) {
      return (
        <ul key={idx} className="list-disc pl-5 my-1 text-neutral-700">
          <li className="text-sm">{parseInlineMarkdown(content.slice(2))}</li>
        </ul>
      );
    }
    const numberedMatch = content.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      return (
        <ol key={idx} className="list-decimal pl-5 my-1 text-neutral-700" start={numberedMatch[1]}>
          <li className="text-sm">{parseInlineMarkdown(numberedMatch[2])}</li>
        </ol>
      );
    }
    if (content.startsWith('```')) return null;
    if (content === '') return <div key={idx} className="h-2" />;
    return <p key={idx} className="text-sm text-neutral-700 my-1 leading-relaxed">{parseInlineMarkdown(line)}</p>;
  });
};

const AIMentor = ({ project, onBack }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [chatError, setChatError] = useState(null);
  const [projectContext, setProjectContext] = useState(null);
  const [lastMentorMeta, setLastMentorMeta] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [feedback, setFeedback] = useState({});
  const [activeTab, setActiveTab] = useState('context'); // 'context' or 'memory'
  const messagesContainerRef = useRef(null);

  const loadHistory = async () => {
    if (!project?._id) return;
    setChatError(null);
    try {
      setHistoryLoading(true);
      const res = await getChatHistory(project._id);
      if (res.success) {
        setChatMessages(res.messages || []);
        setProjectContext(res.projectContext || null);
        const lastAssistant = [...(res.messages || [])].reverse().find((m) => m.role === 'assistant');
        if (lastAssistant?.metadata) setLastMentorMeta(lastAssistant.metadata);
      }
    } catch (err) {
      setChatError('Failed to load conversation history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [project?._id]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const handleSendChatMessage = async (msgText) => {
    const textToSend = msgText || chatInput;
    if (!textToSend?.trim() || chatLoading || !project?._id) return;

    setChatError(null);
    setChatLoading(true);

    const tempUserMsg = {
      _id: `temp_user_${Date.now()}`,
      role: 'user',
      message: textToSend.trim(),
      createdAt: new Date().toISOString()
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);
    setChatInput('');

    try {
      const res = await sendChatMessage(project._id, textToSend.trim());
      if (res.success) {
        setChatMessages((prev) => {
          const filtered = prev.filter((m) => !m._id.startsWith('temp_'));
          return [...filtered, res.userMessage, res.assistantMessage];
        });
        if (res.mentor) setLastMentorMeta(res.mentor);
        // Refresh local project context details
        if (res.projectContext) setProjectContext(res.projectContext);
      }
    } catch (err) {
      setChatError(err.response?.data?.message || 'Failed to reach AI Mentor.');
      setChatMessages((prev) => prev.filter((m) => !m._id.startsWith('temp_')));
    } finally {
      setChatLoading(false);
      // Wait a moment and pull latest context details again
      setTimeout(async () => {
        try {
          const freshHistory = await getChatHistory(project._id);
          if (freshHistory.success && freshHistory.projectContext) {
            setProjectContext(freshHistory.projectContext);
          }
        } catch (_) {}
      }, 2000);
    }
  };

  const toggleSection = (messageId, section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [`${messageId}_${section}`]: !prev[`${messageId}_${section}`]
    }));
  };

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      /* ignore */
    }
  };

  const currentFeature = projectContext?.currentFeature || project?.featuresToBuild?.[0] || 'Core MVP';
  const techStack = projectContext?.techStack || project?.finalTechStack || {};

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4 w-full h-[660px]">
      {/* Redesigned Context & Memory Sidebar Panel */}
      <aside className="hidden xl:flex flex-col gap-3 bg-white border border-neutral-200 rounded-xl p-4 overflow-y-auto shadow-xs">
        
        {/* Tab Toggle buttons */}
        <div className="flex border-b border-neutral-200 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`flex-1 text-center py-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'context'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Active Context
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={`flex-1 text-center py-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'memory'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Memory & Timeline
          </button>
        </div>

        {activeTab === 'context' ? (
          /* Active State Context Details */
          <div className="space-y-4 text-xs mt-1">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Layers size={10} className="text-neutral-500" /> Current Project
              </span>
              <p className="font-semibold text-neutral-900 mt-1">{project?.projectName}</p>
              {project?.track && (
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[9px] font-medium">
                  Track: {project.track}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Terminal size={10} className="text-neutral-500" /> Current Feature
              </span>
              <span className="inline-flex mt-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold border border-brand-100">
                {currentFeature}
              </span>
            </div>

            {projectContext?.currentImplementation && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Current Implementation</span>
                <p className="mt-1 text-neutral-700 bg-neutral-50 p-1.5 rounded font-mono border border-neutral-100 text-[10px]">
                  {projectContext.currentImplementation}
                </p>
              </div>
            )}

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Cpu size={10} className="text-neutral-500" /> Tech Stack
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {Object.entries(techStack).filter(([, v]) => v).map(([key, value]) => (
                  <span key={key} className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-medium border border-neutral-200" title={key}>
                    {value}
                  </span>
                ))}
              </div>
            </div>

            {lastMentorMeta && (
              <div className="border-t border-neutral-100 pt-3 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Classified Intent</span>
                  <p className="mt-0.5 text-neutral-800 font-semibold flex items-center gap-1">
                    <Sparkles size={11} className="text-brand-500" />
                    {TOPIC_LABELS[lastMentorMeta.topic] || lastMentorMeta.topic}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Retrieved Context</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(lastMentorMeta.contextSections || []).map((section) => (
                      <span key={section} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-medium border border-emerald-100">
                        {section}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Confidence</span>
                    <p className="mt-0.5 font-bold text-neutral-900 text-sm">
                      {lastMentorMeta.confidence ?? '—'}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Latency</span>
                    <p className="mt-0.5 font-semibold text-neutral-600 text-xs flex items-center gap-0.5">
                      <Clock size={11} /> {lastMentorMeta.latencyMs ?? 0}ms
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Memory, Timeline & Decision Store */
          <div className="space-y-4 text-xs mt-1">
            {projectContext?.summary && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Bookmark size={10} className="text-neutral-500" /> Rolling Summary
                </span>
                <p className="mt-1 text-neutral-600 italic bg-neutral-50 p-2 rounded border border-neutral-100 leading-relaxed">
                  "{projectContext.summary}"
                </p>
              </div>
            )}

            {projectContext?.currentDebuggingSession && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <AlertCircle size={10} /> Active Bug / Debugging
                </span>
                <p className="mt-1 text-neutral-700 bg-amber-50/40 p-1.5 rounded border border-amber-100 font-medium">
                  {projectContext.currentDebuggingSession}
                </p>
              </div>
            )}

            {projectContext?.currentDeploymentIssue && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1">
                  <Shield size={10} /> Active Deployment Blocker
                </span>
                <p className="mt-1 text-neutral-700 bg-red-50/40 p-1.5 rounded border border-red-100 font-medium">
                  {projectContext.currentDeploymentIssue}
                </p>
              </div>
            )}

            {lastMentorMeta?.relatedTasks?.length > 0 && (
              <div className="border-t border-neutral-100 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <CheckCircle2 size={10} className="text-neutral-500" /> Related Tasks
                </span>
                <ul className="mt-1.5 space-y-1">
                  {lastMentorMeta.relatedTasks.map((t, idx) => (
                    <li key={idx} className="text-[11px] text-neutral-700 font-medium bg-neutral-50 px-2 py-1 rounded border border-neutral-100">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastMentorMeta?.recommendations?.length > 0 && (
              <div className="border-t border-neutral-100 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Sparkles size={10} className="text-neutral-500" /> Key Decisions Memory
                </span>
                <ul className="mt-1.5 space-y-1.5">
                  {lastMentorMeta.recommendations.slice(0, 4).map((rec, idx) => (
                    <li key={idx} className="text-[11px] text-neutral-600 flex gap-1.5 leading-normal">
                      <Sparkles size={11} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main Chat Panel */}
      <div className="flex flex-col overflow-hidden bg-white border border-neutral-200 rounded-xl shadow-xs min-h-0">
        <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900">AI Project Mentor</h2>
                {lastMentorMeta?.provider && (
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-wider">
                    {lastMentorMeta.provider}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-500">
                Senior engineering copilot for {project?.projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer border-0 bg-transparent hover:bg-neutral-50 p-1.5 rounded-lg transition-all"
          >
            <ArrowLeft size={12} /> Back
          </button>
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-neutral-50/60 min-h-0">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <RefreshCw className="animate-spin text-brand-500 mb-2" size={20} />
              <span className="text-xs font-semibold">Loading mentor session...</span>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                <MessageSquare size={24} />
              </div>
              <h4 className="font-bold text-neutral-900">Your project engineering copilot</h4>
              <p className="text-xs text-neutral-500 max-w-md mt-1 leading-relaxed">
                I know your features, tasks, GitHub status, hackathon timeline, and prior advice.
                Ask about architecture, deployment, debugging, AI integration, or execution strategy.
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const meta = msg.metadata || (msg.role === 'assistant' && msg._id === chatMessages[chatMessages.length - 1]?._id ? lastMentorMeta : null);
              const isAssistant = msg.role === 'assistant';

              return (
                <div key={msg._id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] ${isAssistant ? 'w-full max-w-2xl' : ''}`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-3xs ${
                       isAssistant
                         ? 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-xs'
                         : 'bg-neutral-950 text-white rounded-tr-xs'
                    }`}>
                      {isAssistant ? renderMarkdown(msg.message) : msg.message}

                      {isAssistant && meta && (
                        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                          
                          {/* Generation details metadata */}
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {meta.confidence != null && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 flex items-center gap-0.5">
                                <CheckCircle2 size={10} /> {meta.confidence}% confidence
                              </span>
                            )}
                            {meta.topic && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100">
                                {TOPIC_LABELS[meta.topic] || meta.topic}
                              </span>
                            )}
                            {meta.latencyMs != null && (
                              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium flex items-center gap-0.5 border border-neutral-200">
                                <Clock size={10} /> {meta.latencyMs}ms gen time
                              </span>
                            )}
                            {meta.provider && (
                              <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-100 text-[9px] font-bold tracking-wider">
                                {meta.provider}
                              </span>
                            )}
                          </div>

                          {meta.recommendations?.length > 0 && (
                            <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/40">
                              <button
                                type="button"
                                onClick={() => toggleSection(msg._id, 'recs')}
                                className="flex items-center justify-between w-full text-[10px] font-bold uppercase text-neutral-500 cursor-pointer border-0 bg-transparent"
                              >
                                <span className="flex items-center gap-1"><Sparkles size={11} className="text-amber-500" /> Recommendations</span>
                                {expandedSections[`${msg._id}_recs`] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                              {expandedSections[`${msg._id}_recs`] && (
                                <ul className="mt-1.5 space-y-1.5 pl-1.5 border-t border-neutral-100/60 pt-1.5">
                                  {meta.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-xs text-neutral-600 flex gap-1.5 leading-normal">
                                      <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {meta.followUpActions?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {meta.followUpActions.slice(0, 3).map((action, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSendChatMessage(action)}
                                  className="px-3 py-1 rounded-full bg-brand-50 hover:bg-brand-100 border border-brand-100 text-[10px] font-semibold text-brand-700 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1 border-t border-neutral-100/60 mt-1">
                            <button type="button" onClick={() => copyMessage(msg.message)} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors border-0 bg-transparent cursor-pointer" title="Copy answer">
                              <Copy size={12} />
                            </button>
                            <button type="button" onClick={() => setFeedback((f) => ({ ...f, [msg._id]: 'up' }))} className={`p-1.5 rounded transition-colors border-0 bg-transparent cursor-pointer ${feedback[msg._id] === 'up' ? 'bg-emerald-50 text-emerald-600' : 'text-neutral-400 hover:text-neutral-700'}`}>
                              <ThumbsUp size={12} />
                            </button>
                            <button type="button" onClick={() => setFeedback((f) => ({ ...f, [msg._id]: 'down' }))} className={`p-1.5 rounded transition-colors border-0 bg-transparent cursor-pointer ${feedback[msg._id] === 'down' ? 'bg-red-50 text-red-600' : 'text-neutral-400 hover:text-neutral-700'}`}>
                              <ThumbsDown size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={`text-[9px] mt-2 text-right ${isAssistant ? 'text-neutral-400' : 'text-white/60'}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-neutral-200 p-3 rounded-2xl rounded-tl-xs text-xs flex items-center gap-2 shadow-3xs">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:240ms]" />
                </span>
                <span className="font-semibold text-neutral-500">Mentor is analyzing project database...</span>
              </div>
            </div>
          )}

          {chatError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs text-center font-medium animate-shake">
              {chatError}
            </div>
          )}
        </div>

        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-neutral-200 bg-white shrink-0 scrollbar-none">
          {SUGGESTED_QUESTIONS.map((suggested) => (
            <button
              key={suggested}
              type="button"
              disabled={chatLoading}
              onClick={() => handleSendChatMessage(suggested)}
              className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 rounded-full cursor-pointer transition-all whitespace-nowrap"
            >
              {suggested}
            </button>
          ))}
        </div>

        <div className="p-3 bg-white border-t border-neutral-200 flex gap-2 items-end shrink-0">
          <textarea
            rows={1}
            disabled={chatLoading}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChatMessage();
              }
            }}
            placeholder="Ask about architecture, deployment, tasks, GitHub, AI..."
            className="flex-1 form-input"
            style={{ resize: 'none', maxHeight: '80px' }}
          />
          <button
            type="button"
            disabled={chatLoading || !chatInput.trim()}
            onClick={() => handleSendChatMessage()}
            className="btn-primary text-xs py-2 px-4 shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Zap size={14} /> Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIMentor;
