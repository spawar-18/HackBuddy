import { useState, useEffect } from 'react';
import { 
  getTechStackDetails, 
  proposeTechStack, 
  submitTechStackVote, 
  addTechStackComment, 
  analyzeTechStack, 
  finalizeTechStack 
} from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Layers, ThumbsUp, AlertTriangle, XCircle, ChevronRight, Cpu, 
  MessageSquare, Send, CheckCircle2, ShieldAlert, Award, Star, RefreshCw, Undo, Edit3, ArrowLeft
} from 'lucide-react';

// Tech stack categories options
const frontendOptions = ['React', 'Next.js', 'Vue', 'Angular', 'Flutter', 'React Native', 'Other'];
const backendOptions = ['Node.js', 'Express.js', 'NestJS', 'Django', 'FastAPI', 'Spring Boot', 'Laravel', 'Other'];
const databaseOptions = ['MongoDB', 'PostgreSQL', 'MySQL', 'Firebase', 'Supabase', 'Redis', 'Other'];
const aiOptions = ['OpenAI', 'OpenRouter', 'Gemini', 'Claude', 'Featherless AI', 'HuggingFace', 'Other'];
const deploymentOptions = ['Vercel', 'Render', 'Railway', 'AWS', 'Azure', 'Firebase Hosting', 'Other'];

const TechStackConsensus = ({ projectId, onBack }) => {
  const { user } = useAuth();
  
  // Data State
  const [proposal, setProposal] = useState(null);
  const [votes, setVotes] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [finalTechStack, setFinalTechStack] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Action Loading States
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [analyzingStack, setAnalyzingStack] = useState(false);
  const [finalizingStack, setFinalizingStack] = useState(false);

  // Form States
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    frontend: 'React',
    backend: 'Node.js',
    database: 'MongoDB',
    ai: 'Featherless AI',
    deployment: 'Vercel'
  });

  // Vote Form States
  const [voteType, setVoteType] = useState('Approve');
  const [confidenceScores, setConfidenceScores] = useState({
    frontend: 8,
    backend: 8,
    database: 8,
    ai: 8,
    deployment: 8
  });
  const [voteReason, setVoteReason] = useState('');
  const [suggestedAlternatives, setSuggestedAlternatives] = useState({
    frontend: '',
    backend: '',
    database: '',
    ai: '',
    deployment: ''
  });

  // Discussion Board States
  const [activeDiscussCategory, setActiveDiscussCategory] = useState('frontend');
  const [commentInput, setCommentInput] = useState('');

  // Modify Stack State
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [modifyForm, setModifyForm] = useState({
    frontend: '',
    backend: '',
    database: '',
    ai: '',
    deployment: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getTechStackDetails(projectId);
      if (res.success) {
        setProposal(res.proposal);
        setVotes(res.votes || []);
        setAnalysis(res.analysis);
        setFinalTechStack(res.finalTechStack);
        setIsOwner(res.isOwner);

        // Prepopulate modify form if proposal exists
        if (res.proposal) {
          setModifyForm({
            frontend: res.proposal.frontend,
            backend: res.proposal.backend,
            database: res.proposal.database,
            ai: res.proposal.ai,
            deployment: res.proposal.deployment
          });
        }
      }
    } catch (err) {
      console.error('Error fetching tech stack data:', err);
      toast.error('Failed to load tech stack consensus details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  // Confidence Labels
  const getConfidenceLabel = (score) => {
    if (score >= 9) return { text: 'Expert', color: 'text-emerald-600 bg-emerald-50 border-emerald-250' };
    if (score >= 7) return { text: 'Comfortable', color: 'text-blue-600 bg-blue-50 border-blue-250' };
    if (score >= 4) return { text: 'Intermediate', color: 'text-amber-600 bg-amber-50 border-amber-250' };
    return { text: 'Beginner', color: 'text-rose-600 bg-rose-50 border-rose-250' };
  };

  const handleProposeSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingProposal(true);
      const res = await proposeTechStack(projectId, proposalForm);
      if (res.success) {
        toast.success('Tech stack proposal submitted successfully!');
        setShowProposalForm(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit proposal.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if ((voteType === 'Reject' || voteType === 'Approve With Concerns') && !voteReason.trim()) {
      toast.error('Please provide a reason for your concern or rejection.');
      return;
    }

    try {
      setSubmittingVote(true);
      const voteData = {
        voteType,
        confidenceScores,
        reason: voteReason,
        suggestedAlternatives: Object.fromEntries(
          Object.entries(suggestedAlternatives).filter(([_, val]) => val !== '')
        )
      };

      const res = await submitTechStackVote(projectId, voteData);
      if (res.success) {
        toast.success('Your vote has been cast successfully!');
        // Clear fields
        setVoteReason('');
        setSuggestedAlternatives({ frontend: '', backend: '', database: '', ai: '', deployment: '' });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cast vote.');
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await addTechStackComment(projectId, {
        category: activeDiscussCategory,
        comment: commentInput.trim()
      });
      if (res.success) {
        setCommentInput('');
        toast.success('Comment added!');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    try {
      setAnalyzingStack(true);
      const res = await analyzeTechStack(projectId);
      if (res.success) {
        toast.success('AI Stack Consensus Analysis generated successfully!');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI timeout or failure during analysis.');
    } finally {
      setAnalyzingStack(false);
    }
  };

  const handleFinalizeAction = async (action, additionalData = {}) => {
    const confirmationMessages = {
      ACCEPT_RECOMMENDATION: 'Are you sure you want to finalize the stack using the AI recommendations?',
      KEEP_ORIGINAL: 'Are you sure you want to finalize the stack using your original proposed options?',
      MODIFY: 'Are you sure you want to finalize the stack using these modified selections?',
      RESTART_VOTING: 'Are you sure you want to restart voting? This will delete all current votes and AI reports.'
    };

    if (!window.confirm(confirmationMessages[action])) {
      return;
    }

    try {
      setFinalizingStack(true);
      const payload = { action, ...additionalData };
      const res = await finalizeTechStack(projectId, payload);
      if (res.success) {
        toast.success(`Action successfully executed: ${action}`);
        setShowModifyForm(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finalize tech stack.');
    } finally {
      setFinalizingStack(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 text-neutral-400">
        <RefreshCw className="animate-spin text-emerald-500 mb-3" size={32} />
        <span className="text-sm font-semibold">Loading consensus engine records...</span>
      </div>
    );
  }

  // Check if current user has already voted
  const userHasVoted = votes.some(v => v.userId === user?._id);

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      {/* Top Navigation / Breadcrumbs */}
      <div className="flex justify-between items-center p-5 rounded-2xl shadow-md relative overflow-hidden" style={{ backgroundColor: '#040817', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,240,255,1) 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}></div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(6, 78, 59, 0.4)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
            <Layers size={10} /> Collaboration Layer
          </span>
          <h2 className="text-xl font-extrabold tracking-tight mt-1.5" style={{ color: '#00f0ff' }}>AI Tech Stack Consensus Engine</h2>
          <p className="text-[11px] mt-1" style={{ color: 'rgba(0, 240, 255, 0.55)' }}>Select, vote, debate, and analyze technology readiness as a cohesive team</p>
        </div>
        <button
          onClick={onBack}
          className="relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0"
          style={{ backgroundColor: 'rgba(4, 8, 23, 0.8)', border: '1px solid rgba(0, 240, 255, 0.25)', color: 'rgba(0, 240, 255, 0.7)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#00f0ff'; e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0, 240, 255, 0.7)'; e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.25)'; }}
        >
          <ArrowLeft size={13} /> Back
        </button>
      </div>

      {/* FINALIZED STACK DISPLAY IF APPLICABLE */}
      {finalTechStack && finalTechStack.frontend && proposal?.status === 'Finalized' && (
        <div className="bg-emerald-50/50 border border-emerald-250 p-5 rounded-2xl flex flex-col gap-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Stack Finalized & Approved</h3>
                <p className="text-xs text-neutral-500 mt-0.5">This stack is now locked and feeds directly into the AI Task Splitter and scope systems.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['frontend', 'backend', 'database', 'ai', 'deployment'].map(cat => (
                <span key={cat} className="px-3 py-1 text-xs font-bold bg-white border border-emerald-200 text-emerald-700 rounded-lg shadow-2xs">
                  <span className="capitalize text-neutral-450 font-normal mr-1">{cat}:</span>
                  {finalTechStack[cat]}
                </span>
              ))}
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 border-t border-emerald-200/60 pt-3">
              <span className="text-[10px] text-emerald-700 font-semibold mr-auto">🔐 Owner Controls</span>
              <button
                onClick={() => {
                  setModifyForm({
                    frontend: finalTechStack.frontend,
                    backend: finalTechStack.backend,
                    database: finalTechStack.database,
                    ai: finalTechStack.ai,
                    deployment: finalTechStack.deployment
                  });
                  setShowModifyForm(true);
                  // Scroll down so user sees the form
                }}
                disabled={finalizingStack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Edit3 size={12} /> Edit & Re-finalize
              </button>
              <button
                onClick={() => handleFinalizeAction('RESTART_VOTING')}
                disabled={finalizingStack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Undo size={12} /> Re-open Voting
              </button>
            </div>
          )}
        </div>
      )}

      {/* CASE 1: No proposed stack exists yet */}
      {!proposal && !showProposalForm && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center flex flex-col items-center gap-4 max-w-[600px] mx-auto shadow-sm my-6">
          <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-center text-neutral-400">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">No Stack Proposal Registered</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-[340px] leading-relaxed mx-auto">
              A project has been defined, but the tech stack selections are currently empty. Propose a core stack to begin team voting and AI assessment.
            </p>
          </div>
          <button
            onClick={() => setShowProposalForm(true)}
            className="btn-primary text-xs py-2 px-4 shadow-xs"
          >
            Create Proposed Tech Stack
          </button>
        </div>
      )}

      {/* Proposal form */}
      {(showProposalForm || (proposal && proposal.status === 'Proposed' && showProposalForm)) && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div className="border-b border-neutral-100 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Propose Tech Stack</h3>
            <button
              onClick={() => setShowProposalForm(false)}
              className="text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleProposeSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Frontend</label>
              <select
                value={proposalForm.frontend}
                onChange={e => setProposalForm({ ...proposalForm, frontend: e.target.value })}
                className="input-field text-xs py-2 pr-8"
              >
                {frontendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Backend</label>
              <select
                value={proposalForm.backend}
                onChange={e => setProposalForm({ ...proposalForm, backend: e.target.value })}
                className="input-field text-xs py-2 pr-8"
              >
                {backendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Database</label>
              <select
                value={proposalForm.database}
                onChange={e => setProposalForm({ ...proposalForm, database: e.target.value })}
                className="input-field text-xs py-2 pr-8"
              >
                {databaseOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">AI/ML</label>
              <select
                value={proposalForm.ai}
                onChange={e => setProposalForm({ ...proposalForm, ai: e.target.value })}
                className="input-field text-xs py-2 pr-8"
              >
                {aiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Deployment</label>
              <select
                value={proposalForm.deployment}
                onChange={e => setProposalForm({ ...proposalForm, deployment: e.target.value })}
                className="input-field text-xs py-2 pr-8"
              >
                {deploymentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-5 flex justify-end gap-3 mt-2">
              <button
                type="submit"
                disabled={submittingProposal}
                className="btn-primary text-xs py-2 px-4 shadow-xs"
              >
                {submittingProposal ? 'Submitting...' : 'Submit Stack Proposal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MAIN CONSENSUS DASHBOARD (Proposal exists) */}
      {proposal && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Proposed Stack & Voting & Discussion (8 columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* SECTION 1: Current Proposed Stack */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <div className="border-b border-neutral-100 pb-3 flex justify-between items-center">
                <h3 className="text-xs font-bold text-neutral-505 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={14} className="text-brand-500" /> Current Proposed Stack
                </h3>
                {proposal.status !== 'Finalized' && (
                  <button
                    onClick={() => {
                      setProposalForm({
                        frontend: proposal.frontend,
                        backend: proposal.backend,
                        database: proposal.database,
                        ai: proposal.ai,
                        deployment: proposal.deployment
                      });
                      setShowProposalForm(true);
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    <Edit3 size={13} /> Update Proposal
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
                {[
                  { name: 'Frontend', value: proposal.frontend, color: 'border-l-indigo-500' },
                  { name: 'Backend', value: proposal.backend, color: 'border-l-blue-500' },
                  { name: 'Database', value: proposal.database, color: 'border-l-emerald-500' },
                  { name: 'AI/ML', value: proposal.ai, color: 'border-l-violet-500' },
                  { name: 'Deployment', value: proposal.deployment, color: 'border-l-amber-500' }
                ].map(item => (
                  <div key={item.name} className={`bg-neutral-50 border border-neutral-200 border-l-4 ${item.color} p-4 rounded-xl flex flex-col gap-1 hover:border-neutral-300 transition-colors`}>
                    <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest">{item.name}</span>
                    <span className="text-xs font-bold text-neutral-800 truncate" title={item.value}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: Voting Form */}
            {proposal.status !== 'Finalized' && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h3 className="text-xs font-bold text-neutral-505 uppercase tracking-widest">Cast Your Vote</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Rate your confidence and log concerns for consensus matching</p>
                </div>

                {userHasVoted ? (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 flex items-center gap-3 text-neutral-550">
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                    <div className="text-xs">
                      <span className="font-bold text-neutral-700">Vote Casted:</span> You have already cast your vote on this stack proposal. If the owner modifies the proposal or restarts voting, you can submit a new response.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVoteSubmit} className="flex flex-col gap-4">
                    {/* Vote Type Selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Recommendation Vote</span>
                      <div className="flex gap-2">
                        {[
                          { value: 'Approve', icon: ThumbsUp, color: 'border-emerald-200 text-emerald-600 bg-emerald-50/20', hover: 'hover:border-emerald-400' },
                          { value: 'Approve With Concerns', icon: AlertTriangle, color: 'border-amber-200 text-amber-600 bg-amber-50/20', hover: 'hover:border-amber-400' },
                          { value: 'Reject', icon: XCircle, color: 'border-rose-200 text-rose-600 bg-rose-50/20', hover: 'hover:border-rose-400' }
                        ].map(type => {
                          const Icon = type.icon;
                          const selected = voteType === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setVoteType(type.value)}
                              className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-bold transition-all duration-200 ${
                                selected 
                                  ? `${type.color.replace('bg-','')} border-current shadow-2xs font-extrabold` 
                                  : 'border-neutral-200 text-neutral-500 bg-white hover:bg-neutral-50'
                              }`}
                            >
                              <Icon size={14} />
                              <span>{type.value}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Confidence Slider/Inputs */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Confidence Scores (1-10)</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {['frontend', 'backend', 'database', 'ai', 'deployment'].map(cat => {
                          const score = confidenceScores[cat];
                          const label = getConfidenceLabel(score);
                          return (
                            <div key={cat} className="flex flex-col gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                              <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest capitalize">{cat}</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={score}
                                  onChange={e => {
                                    const val = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                                    setConfidenceScores({ ...confidenceScores, [cat]: val });
                                  }}
                                  className="form-input text-xs py-1 px-1.5 w-11 font-bold font-mono text-center shrink-0"
                                />
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-tight ${label.color}`}>
                                  {label.text}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={score}
                                onChange={e => setConfidenceScores({ ...confidenceScores, [cat]: parseInt(e.target.value) })}
                                className="w-full accent-brand-500 cursor-pointer h-1.5 bg-neutral-200 rounded-lg appearance-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reason Text */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        Reason / Negotiation Notes
                        {(voteType === 'Reject' || voteType === 'Approve With Concerns') && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <textarea
                        rows={2}
                        value={voteReason}
                        onChange={e => setVoteReason(e.target.value)}
                        placeholder="Detail any limitations, skill gaps, or timeline concerns..."
                        className="form-input text-xs"
                      />
                    </div>

                    {/* Alternative Suggestions */}
                    {(voteType === 'Reject' || voteType === 'Approve With Concerns') && (
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">Suggested Alternatives (Optional)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
                          {[
                            { key: 'frontend', options: frontendOptions },
                            { key: 'backend', options: backendOptions },
                            { key: 'database', options: databaseOptions },
                            { key: 'ai', options: aiOptions },
                            { key: 'deployment', options: deploymentOptions }
                          ].map(item => (
                            <div key={item.key} className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-widest">{item.key}</span>
                              <select
                                value={suggestedAlternatives[item.key]}
                                onChange={e => setSuggestedAlternatives({ ...suggestedAlternatives, [item.key]: e.target.value })}
                                className="input-field text-[11px] py-1.5 px-2 pr-6"
                              >
                                <option value="">No Suggestion</option>
                                {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={submittingVote}
                        className="btn-primary text-xs py-2 px-4 shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        {submittingVote ? <RefreshCw className="animate-spin" size={13} /> : <Send size={13} />}
                        Submit Vote
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* SECTION 3: Discussion Board */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <div className="border-b border-neutral-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-neutral-505 uppercase tracking-widest">Discussion Threads</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Debate options per stack category to negotiate choices</p>
                </div>
                <MessageSquare className="text-neutral-400" size={16} />
              </div>

              {/* Category selector */}
              <div className="flex border-b border-neutral-200 gap-1 p-1 bg-neutral-50 rounded-xl overflow-x-auto">
                {['frontend', 'backend', 'database', 'ai', 'deployment'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveDiscussCategory(cat)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0 ${
                      activeDiscussCategory === cat 
                        ? 'bg-white text-neutral-900 shadow-3xs border border-neutral-250' 
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Render thread comments */}
              <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto min-h-[80px] p-1">
                {proposal.discussions && proposal.discussions.filter(c => c.category === activeDiscussCategory).length > 0 ? (
                  proposal.discussions
                    .filter(c => c.category === activeDiscussCategory)
                    .map((comm, cIdx) => (
                      <div key={cIdx} className="bg-neutral-50 border border-neutral-200/60 p-3 rounded-xl flex flex-col gap-1 w-fit max-w-[90%]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-800">{comm.userName}</span>
                          <span className="text-[9px] text-neutral-450">{new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">{comm.comment}</p>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-6 text-xs text-neutral-400 italic">
                    No comments in this thread yet. Start the conversation below.
                  </div>
                )}
              </div>

              {/* Add comment form */}
              {proposal.status !== 'Finalized' && (
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder={`Write a comment on the Proposed ${activeDiscussCategory.toUpperCase()} choice...`}
                    className="flex-1 form-input text-xs"
                    disabled={submittingComment}
                  />
                  <button
                    type="submit"
                    className="btn-primary text-xs py-2 px-3 shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                    disabled={submittingComment || !commentInput.trim()}
                  >
                    {submittingComment ? 'Sending...' : 'Comment'}
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* RIGHT: AI Analysis & Final Decision (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* SECTION 4: AI Analysis Dashboard */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <div className="border-b border-neutral-100 pb-3 flex justify-between items-center">
                <h3 className="text-xs font-bold text-neutral-505 uppercase tracking-widest flex items-center gap-1.5">
                  <Cpu size={14} className="text-purple-500" /> AI Stack Evaluation
                </h3>
                {proposal.status !== 'Finalized' && votes.length > 0 && (
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={analyzingStack}
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold bg-transparent border-0 cursor-pointer disabled:opacity-50"
                  >
                    {analyzingStack ? 'Analyzing...' : 'Run Analysis'}
                  </button>
                )}
              </div>

              {/* If no analysis runs yet */}
              {!analysis ? (
                <div className="bg-neutral-50 border border-neutral-150 rounded-xl p-5 text-center flex flex-col items-center gap-3">
                  <Cpu className="text-neutral-450 animate-pulse" size={24} />
                  <p className="text-xs text-neutral-500 leading-normal">
                    {votes.length === 0 
                      ? 'AI analysis requires at least one vote to compile confidence aggregates. Cast votes first.' 
                      : 'Votes are ready! Trigger the AI model to analyze readiness and get alternative recommendations.'}
                  </p>
                  {votes.length > 0 && (
                    <button
                      onClick={handleRunAiAnalysis}
                      disabled={analyzingStack}
                      className="btn-primary text-xs py-1.5 px-3 bg-purple-600 hover:bg-purple-700 border-purple-600 shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      {analyzingStack ? <RefreshCw className="animate-spin" size={12} /> : null}
                      Analyze proposed stack
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-slide-up">
                  {/* Scores side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Readiness */}
                    <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-center">
                      <div className="text-2xl font-black text-brand-500 font-mono">{analysis.readinessScore}%</div>
                      <span className="text-[8px] font-bold text-neutral-400 tracking-wider uppercase mt-1 block">Readiness Score</span>
                    </div>

                    {/* Consensus */}
                    <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-center relative">
                      <div className="text-2xl font-black text-purple-500 font-mono">{analysis.consensusScore}%</div>
                      <span className="text-[8px] font-bold text-neutral-400 tracking-wider uppercase mt-1 block">Consensus Score</span>
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded border mt-1.5 inline-block ${
                        analysis.consensusScore >= 76 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : (analysis.consensusScore >= 51 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-200')
                      }`}>
                        {analysis.consensusScore >= 76 ? 'Strong' : (analysis.consensusScore >= 51 ? 'Moderate' : 'Disagreement')}
                      </span>
                    </div>
                  </div>

                  {/* Strengths */}
                  {analysis.strengths && analysis.strengths.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Strengths</span>
                      <ul className="list-disc pl-4 flex flex-col gap-1">
                        {analysis.strengths.map((str, idx) => (
                          <li key={idx} className="text-xs text-neutral-600 leading-normal">{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks */}
                  {analysis.risks && analysis.risks.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1 text-rose-600">
                        <ShieldAlert size={10} /> Risks & Skill Gaps
                      </span>
                      <ul className="list-disc pl-4 flex flex-col gap-1">
                        {analysis.risks.map((risk, idx) => (
                          <li key={idx} className="text-xs text-red-650 leading-normal">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Changes */}
                  {analysis.recommendedChanges && analysis.recommendedChanges.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest text-brand-600">Recommended Changes</span>
                      <ul className="list-disc pl-4 flex flex-col gap-1">
                        {analysis.recommendedChanges.map((ch, idx) => (
                          <li key={idx} className="text-xs text-neutral-600 leading-normal">{ch}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Stack Box */}
                  {analysis.recommendedStack && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 border-l-4 border-l-purple-500">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">Recommended Tech Stack</span>
                      <div className="flex flex-col gap-1.5">
                        {['frontend', 'backend', 'database', 'ai', 'deployment'].map(cat => {
                          const val = analysis.recommendedStack[cat];
                          const displayVal = Array.isArray(val) ? val.join(', ') : val;
                          return (
                            <div key={cat} className="flex justify-between items-center text-xs">
                              <span className="capitalize text-neutral-450">{cat}:</span>
                              <span className="font-bold text-purple-700">{displayVal || 'N/A'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reasoning & Final Recommendation */}
                  {analysis.reasoning && (
                    <div className="bg-neutral-50/50 border border-neutral-150 rounded-xl p-3">
                      <p className="text-xs text-neutral-600 leading-relaxed italic">
                        <span className="font-bold text-neutral-700 not-italic block mb-1">Architect Rationale:</span>
                        "{analysis.reasoning}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 5: Final Decision (Owner Actions) */}
            {(proposal.status !== 'Finalized' || (isOwner && showModifyForm)) && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h3 className="text-xs font-bold text-neutral-550 uppercase tracking-widest">Finalization Hub</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Finalize selections or clear votes to reset discussions</p>
                </div>

                {!isOwner ? (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-neutral-500 leading-normal">
                    🔒 <span className="font-bold text-neutral-700">Project Owner Only:</span> Final consensus actions are restricted to the Squad Leader. Ask the leader to review the AI analysis and approve the final stack.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Action 1: Accept AI Recommendations */}
                    <button
                      onClick={() => handleFinalizeAction('ACCEPT_RECOMMENDATION')}
                      disabled={finalizingStack || !analysis}
                      className="btn-primary text-xs py-2 px-3 bg-purple-650 hover:bg-purple-750 border-purple-650 cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5 shadow-2xs font-bold"
                    >
                      <Award size={13} />
                      Accept AI Recommendations
                    </button>

                    {/* Action 2: Keep Original Stack */}
                    <button
                      onClick={() => handleFinalizeAction('KEEP_ORIGINAL')}
                      disabled={finalizingStack}
                      className="btn-primary text-xs py-2 px-3 bg-emerald-650 hover:bg-emerald-750 border-emerald-650 cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5 shadow-2xs font-bold"
                    >
                      <ThumbsUp size={13} />
                      Keep Proposed Stack
                    </button>

                    {/* Action 3: Modify Stack */}
                    {showModifyForm ? (
                      <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50 flex flex-col gap-3 animate-slide-up">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Modify Stack to Finalize</span>
                        <div className="flex flex-col gap-2">
                          {/* Frontend */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-neutral-450 uppercase">Frontend</span>
                            <select
                              value={modifyForm.frontend}
                              onChange={e => setModifyForm({ ...modifyForm, frontend: e.target.value })}
                              className="input-field text-xs py-1.5 pr-8"
                            >
                              {frontendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          {/* Backend */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-neutral-450 uppercase">Backend</span>
                            <select
                              value={modifyForm.backend}
                              onChange={e => setModifyForm({ ...modifyForm, backend: e.target.value })}
                              className="input-field text-xs py-1.5 pr-8"
                            >
                              {backendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          {/* Database */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-neutral-450 uppercase">Database</span>
                            <select
                              value={modifyForm.database}
                              onChange={e => setModifyForm({ ...modifyForm, database: e.target.value })}
                              className="input-field text-xs py-1.5 pr-8"
                            >
                              {databaseOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          {/* AI */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-neutral-450 uppercase">AI/ML</span>
                            <select
                              value={modifyForm.ai}
                              onChange={e => setModifyForm({ ...modifyForm, ai: e.target.value })}
                              className="input-field text-xs py-1.5 pr-8"
                            >
                              {aiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          {/* Deployment */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-neutral-450 uppercase">Deployment</span>
                            <select
                              value={modifyForm.deployment}
                              onChange={e => setModifyForm({ ...modifyForm, deployment: e.target.value })}
                              className="input-field text-xs py-1.5 pr-8"
                            >
                              {deploymentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowModifyForm(false)}
                            className="btn-secondary text-[11px] py-1.5 px-2.5"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFinalizeAction('MODIFY', { modifiedStack: modifyForm })}
                            className="btn-primary text-[11px] py-1.5 px-2.5 bg-brand-500 border-brand-500 shadow-2xs"
                          >
                            Finalize & Modify
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowModifyForm(true)}
                        disabled={finalizingStack}
                        className="btn-secondary text-xs py-2 px-3 border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5 font-bold"
                      >
                        <Edit3 size={13} />
                        Modify & Finalize Stack
                      </button>
                    )}

                    <hr className="border-neutral-100" />

                    {/* Action 4: Restart Voting */}
                    <button
                      onClick={() => handleFinalizeAction('RESTART_VOTING')}
                      disabled={finalizingStack}
                      className="btn-danger text-xs py-2 px-3 border-red-200 text-red-700 bg-red-50/40 hover:bg-red-50 cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5 font-bold"
                    >
                      <Undo size={13} />
                      Restart Consensus Voting
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* List of votes cast (Team Readiness Info) */}
            {votes.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="border-b border-neutral-100 pb-2">
                  <h3 className="text-xs font-bold text-neutral-550 uppercase tracking-widest">Cast Votes ({votes.length})</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {votes.map((vote, vIdx) => {
                    const voteColors = {
                      'Approve': 'text-emerald-600 bg-emerald-50 border-emerald-100',
                      'Approve With Concerns': 'text-amber-600 bg-amber-50 border-amber-100',
                      'Reject': 'text-rose-600 bg-rose-50 border-rose-100'
                    };
                    return (
                      <div key={vIdx} className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-800">{vote.userName}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${voteColors[vote.voteType] || 'bg-slate-50'}`}>
                            {vote.voteType}
                          </span>
                        </div>
                        {vote.reason && (
                          <p className="text-[11px] text-neutral-500 leading-normal italic">
                            "{vote.reason}"
                          </p>
                        )}
                        {/* Selected Alternatives */}
                        {vote.suggestedAlternatives && Object.keys(vote.suggestedAlternatives).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 border-t border-neutral-200/50 pt-2 mt-1">
                            {Object.entries(vote.suggestedAlternatives).map(([key, val]) => (
                              <span key={key} className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-150">
                                Alt {key}: {val}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default TechStackConsensus;
