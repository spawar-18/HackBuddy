import React, { useState, useEffect, useRef } from 'react';
import { 
  createProject, 
  getProjectByTeam, 
  updateProject, 
  deleteProject,
  analyzeProject,
  getChatHistory,
  sendChatMessage,
  generateTaskPlan,
  regenerateTaskPlan,
  updateTaskStatus
} from '../services/projectService';
import { toast } from 'react-hot-toast';
import { 
  FolderGit2, Plus, Trash2, Edit3, ListTodo, 
  Play, CheckCircle, Clock, ArrowLeft, Save, AlertTriangle, RefreshCw, Cpu,
  Layers, Users, Activity, Zap, BarChart3, GitBranch, Target, Star, ShieldAlert,
  ShoppingBag, ChevronDown, ChevronUp, Check, Info, Lightbulb, Ban, Award, 
  ArrowUpRight, HelpCircle, ShieldCheck, Compass, X
} from 'lucide-react';
import TaskMarketplace from './TaskMarketplace';
import TechStackConsensus from './TechStackConsensus';
import { useAuth } from '../context/AuthContext';


const parseInlineMarkdown = (text) => {
  if (!text) return '';
  // Simple replacement of **text** with strong elements
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
    }
    // Simple replacement of `code` with code styling
    const subParts = part.split(/(`.*?`)/g);
    return subParts.map((subPart, subIndex) => {
      if (subPart.startsWith('`') && subPart.endsWith('`')) {
        return (
          <code key={subIndex} style={{ 
            background: 'var(--bg-deep)', 
            padding: '2px 4px', 
            borderRadius: '4px', 
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--primary)'
          }}>
            {subPart.slice(1, -1)}
          </code>
        );
      }
      return subPart;
    });
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;

  // Split by newlines to process line by line
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    let content = line.trim();
    
    // 1. Headers (###, ##, #)
    if (content.startsWith('### ')) {
      return (
        <h4 key={idx} style={{ fontWeight: 700, fontSize: '1rem', marginTop: '12px', marginBottom: '6px', color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(content.slice(4))}
        </h4>
      );
    }
    if (content.startsWith('## ')) {
      return (
        <h3 key={idx} style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(content.slice(3))}
        </h3>
      );
    }
    if (content.startsWith('# ')) {
      return (
        <h2 key={idx} style={{ fontWeight: 800, fontSize: '1.2rem', marginTop: '16px', marginBottom: '10px', color: 'var(--text-primary)' }}>
          {parseInlineMarkdown(content.slice(2))}
        </h2>
      );
    }

    // 2. Unordered lists (- or *)
    if (content.startsWith('- ') || content.startsWith('* ')) {
      return (
        <ul key={idx} style={{ margin: '4px 0', paddingLeft: '1.2rem', listStyleType: 'disc' }}>
          <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {parseInlineMarkdown(content.slice(2))}
          </li>
        </ul>
      );
    }

    // 3. Numbered lists (1., 2., etc.)
    const numberedMatch = content.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      return (
        <ol key={idx} style={{ margin: '4px 0', paddingLeft: '1.2rem', listStyleType: 'decimal' }} start={numberedMatch[1]}>
          <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {parseInlineMarkdown(numberedMatch[2])}
          </li>
        </ol>
      );
    }

    // 4. Empty line
    if (content === '') {
      return <div key={idx} style={{ height: '8px' }} />;
    }

    // 5. Standard paragraph
    return (
      <p key={idx} style={{ fontSize: '0.88rem', margin: '4px 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        {parseInlineMarkdown(line)}
      </p>
    );
  });
};
const getStepMeta = (stepText) => {
  const text = (stepText || '').toLowerCase();
  if (text.includes('setup') || text.includes('repo') || text.includes('initial') || text.includes('environment')) {
    return { label: 'Environment Setup', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: FolderGit2 };
  }
  if (text.includes('database') || text.includes('schema') || text.includes('model') || text.includes('mongodb') || text.includes('sql')) {
    return { label: 'Database & Models', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Cpu };
  }
  if (text.includes('auth') || text.includes('login') || text.includes('api') || text.includes('backend') || text.includes('server') || text.includes('route') || text.includes('controller')) {
    return { label: 'Backend APIs', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Cpu };
  }
  if (text.includes('ui') || text.includes('page') || text.includes('screen') || text.includes('frontend') || text.includes('css') || text.includes('component') || text.includes('dashboard')) {
    return { label: 'UI & Components', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Layers };
  }
  if (text.includes('deploy') || text.includes('production') || text.includes('vercel') || text.includes('aws') || text.includes('host') || text.includes('render') || text.includes('publish')) {
    return { label: 'Deployment', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Zap };
  }
  return { label: 'Development Phase', color: 'bg-neutral-50 text-neutral-700 border-neutral-200', icon: Activity };
};


// Helper to render dynamic category icons for risks/features
const renderCategoryIcon = (iconName, size = 16, className = '') => {
  switch (iconName) {
    case 'cpu': return <Cpu size={size} className={className} />;
    case 'database': return <Layers size={size} className={className} />;
    case 'layout': return <Layers size={size} className={className} />;
    case 'activity': return <Activity size={size} className={className} />;
    case 'clock': return <Clock size={size} className={className} />;
    case 'shield': return <ShieldCheck size={size} className={className} />;
    case 'alert': return <AlertTriangle size={size} className={className} />;
    case 'check': return <Check size={size} className={className} />;
    case 'info': return <Info size={size} className={className} />;
    case 'lightbulb': return <Lightbulb size={size} className={className} />;
    case 'ban': return <Ban size={size} className={className} />;
    case 'award': return <Award size={size} className={className} />;
    case 'arrow': return <ArrowUpRight size={size} className={className} />;
    case 'help': return <HelpCircle size={size} className={className} />;
    case 'compass': return <Compass size={size} className={className} />;
    default: return <AlertTriangle size={size} className={className} />;
  }
};

// Robust Risk Parser
const parseRisk = (risk) => {
  if (typeof risk !== 'string') {
    return { title: 'Technical Risk', description: String(risk || ''), severity: 'Medium', category: 'Technical', icon: 'alert' };
  }
  const clean = risk.replace(/^[\s\-•*]+/, '').trim();
  let category = 'Technical';
  let icon = 'alert';
  let severity = 'Medium';
  
  const lower = clean.toLowerCase();
  
  if (lower.includes('ai') || lower.includes('llm') || lower.includes('gpt') || lower.includes('model') || lower.includes('openai')) {
    category = 'AI & LLM';
    icon = 'cpu';
  } else if (lower.includes('database') || lower.includes('db') || lower.includes('mongodb') || lower.includes('sql') || lower.includes('schema') || lower.includes('data')) {
    category = 'Database';
    icon = 'database';
  } else if (lower.includes('ui') || lower.includes('frontend') || lower.includes('ux') || lower.includes('design') || lower.includes('view') || lower.includes('screen') || lower.includes('css')) {
    category = 'Frontend/UI';
    icon = 'layout';
  } else if (lower.includes('scale') || lower.includes('load') || lower.includes('performance') || lower.includes('speed') || lower.includes('timeout') || lower.includes('latency')) {
    category = 'Scalability';
    icon = 'activity';
  } else if (lower.includes('scope') || lower.includes('time') || lower.includes('duration') || lower.includes('deadline') || lower.includes('creep') || lower.includes('timeline')) {
    category = 'Project Scope';
    icon = 'clock';
  } else if (lower.includes('auth') || lower.includes('security') || lower.includes('token') || lower.includes('login') || lower.includes('password') || lower.includes('credential')) {
    category = 'Security';
    icon = 'shield';
  }
  
  if (lower.includes('critical') || lower.includes('high') || lower.includes('timeout') || lower.includes('fail') || lower.includes('broke') || lower.includes('prevent') || lower.includes('severe')) {
    severity = 'High';
  } else if (lower.includes('low') || lower.includes('minor') || lower.includes('nice to have') || lower.includes('negligible')) {
    severity = 'Low';
  } else {
    severity = 'Medium';
  }
  
  let title = clean;
  let desc = clean;
  
  const splitIdx = clean.indexOf(':');
  const dashIdx = clean.indexOf(' - ');
  
  if (splitIdx > 0) {
    title = clean.substring(0, splitIdx).trim();
    desc = clean.substring(splitIdx + 1).trim();
  } else if (dashIdx > 0) {
    title = clean.substring(0, dashIdx).trim();
    desc = clean.substring(dashIdx + 3).trim();
  } else {
    const words = clean.split(/\s+/);
    if (words.length > 5) {
      title = words.slice(0, 4).join(' ');
      desc = clean;
    }
  }
  
  if (!title) title = 'Technical Risk';
  if (!desc) desc = clean;
  
  return { title, description: desc, severity, category, icon };
};

// Skill Parser
const parseSkill = (skill) => {
  if (typeof skill !== 'string') {
    return { name: String(skill || ''), importance: 'Medium', role: 'Fullstack' };
  }
  const clean = skill.replace(/^[\s\-•*]+/, '').trim();
  const lower = clean.toLowerCase();
  
  let role = 'Fullstack';
  let importance = 'Medium';
  
  if (lower.includes('react') || lower.includes('frontend') || lower.includes('css') || lower.includes('ui') || lower.includes('ux') || lower.includes('tailwind') || lower.includes('html') || lower.includes('design')) {
    role = 'Frontend';
    importance = 'High';
  } else if (lower.includes('node') || lower.includes('express') || lower.includes('backend') || lower.includes('api') || lower.includes('server') || lower.includes('rest')) {
    role = 'Backend';
    importance = 'High';
  } else if (lower.includes('database') || lower.includes('db') || lower.includes('mongo') || lower.includes('sql') || lower.includes('postgres') || lower.includes('prisma') || lower.includes('redis')) {
    role = 'Database';
    importance = 'Medium';
  } else if (lower.includes('cloud') || lower.includes('docker') || lower.includes('aws') || lower.includes('deploy') || lower.includes('devops') || lower.includes('infra') || lower.includes('ci') || lower.includes('git')) {
    role = 'DevOps';
    importance = 'Medium';
  } else if (lower.includes('ai') || lower.includes('llm') || lower.includes('ml') || lower.includes('python') || lower.includes('prompt') || lower.includes('openai') || lower.includes('langchain')) {
    role = 'AI Engineer';
    importance = 'High';
  }
  
  if (lower.includes('critical') || lower.includes('high') || lower.includes('essential') || lower.includes('crucial')) {
    importance = 'High';
  } else if (lower.includes('low') || lower.includes('basic') || lower.includes('nice') || lower.includes('minor')) {
    importance = 'Low';
  }
  
  return { name: clean, importance, role };
};

// Feature Parser
const parseFeature = (feat, priority = 'High') => {
  if (typeof feat !== 'string') {
    return { name: String(feat || ''), priority, difficulty: 'Medium', time: '3 hours' };
  }
  const clean = feat.replace(/^[\s\-•*]+/, '').trim();
  const lower = clean.toLowerCase();
  
  let difficulty = 'Medium';
  let time = '3 hours';
  
  if (lower.includes('ai') || lower.includes('llm') || lower.includes('fine-tune') || lower.includes('integration') || lower.includes('sync') || lower.includes('socket') || lower.includes('real-time') || lower.includes('realtime') || lower.includes('git')) {
    difficulty = 'Hard';
    time = '5-6 hours';
  } else if (lower.includes('validation') || lower.includes('form') || lower.includes('spinner') || lower.includes('loading') || lower.includes('button') || lower.includes('styling') || lower.includes('input') || lower.includes('badge') || lower.includes('alert') || lower.includes('toast')) {
    difficulty = 'Easy';
    time = '1-2 hours';
  } else if (lower.includes('auth') || lower.includes('database') || lower.includes('schema') || lower.includes('api') || lower.includes('route') || lower.includes('controller') || lower.includes('model')) {
    difficulty = 'Medium';
    time = '3-4 hours';
  }
  
  const timeMatch = clean.match(/(\d+\s*-\s*\d+|\d+)\s*(h|hrs|hours?)/i);
  if (timeMatch) {
    time = timeMatch[0];
  }
  
  const diffMatch = clean.match(/(easy|medium|hard|complex)/i);
  if (diffMatch) {
    difficulty = diffMatch[0].charAt(0).toUpperCase() + diffMatch[0].slice(1).toLowerCase();
  }
  
  return { name: clean, priority, difficulty, time };
};

// Feature To Remove Parser
const parseFeatureToRemove = (feat) => {
  if (typeof feat !== 'string') {
    return { name: String(feat || ''), reason: 'Unnecessary complexity for a hackathon prototype.', timeSaved: '3 hours' };
  }
  const clean = feat.replace(/^[\s\-•*]+/, '').trim();
  let name = clean;
  let reason = 'High complexity and low priority for a hackathon MVP.';
  let timeSaved = '4-6 hours';
  
  const lower = clean.toLowerCase();
  
  const separators = [' - ', ':', ' because ', ' due to ', ' since '];
  for (const sep of separators) {
    const idx = lower.indexOf(sep);
    if (idx > 0) {
      name = clean.substring(0, idx).trim();
      reason = clean.substring(idx + sep.length).trim();
      reason = reason.charAt(0).toUpperCase() + reason.slice(1);
      break;
    }
  }
  
  if (lower.includes('ai') || lower.includes('llm') || lower.includes('agent') || lower.includes('fine-tune') || lower.includes('rag')) {
    timeSaved = '6-8 hours';
  } else if (lower.includes('message') || lower.includes('chat') || lower.includes('sync') || lower.includes('real-time') || lower.includes('socket')) {
    timeSaved = '4-5 hours';
  } else if (lower.includes('styling') || lower.includes('animation') || lower.includes('extra') || lower.includes('theme')) {
    timeSaved = '1-2 hours';
  }
  
  return { name, reason, timeSaved };
};

// Improvement Suggestion Parser
const parseImprovement = (suggestion, index) => {
  if (typeof suggestion !== 'string') {
    return { priority: 'Medium', recommendation: String(suggestion || ''), impact: 'Medium', difficulty: 'Medium', reasoning: '' };
  }
  const clean = suggestion.replace(/^[\s\-•*]+/, '').trim();
  
  const periodIdx = clean.indexOf('.');
  let recommendation = clean;
  let reasoning = 'Implementing this recommendation will streamline the application structure, reduce technical risk, and enhance the overall hackathon presentation.';
  
  if (periodIdx > 10 && periodIdx < clean.length - 1) {
    recommendation = clean.substring(0, periodIdx + 1).trim();
    reasoning = clean.substring(periodIdx + 1).trim();
  }
  
  let priority = index === 0 ? 'High' : (index === 1 ? 'Medium' : 'Low');
  let impact = 'High';
  let difficulty = 'Medium';
  
  const lower = clean.toLowerCase();
  if (lower.includes('easy') || lower.includes('simple') || lower.includes('setting') || lower.includes('temperature') || lower.includes('parameter') || lower.includes('text') || lower.includes('config')) {
    difficulty = 'Easy';
  } else if (lower.includes('complex') || lower.includes('architecture') || lower.includes('refactor') || lower.includes('rewrite') || lower.includes('migration') || lower.includes('heavy')) {
    difficulty = 'Hard';
  }
  
  if (lower.includes('critical') || lower.includes('major') || lower.includes('boost') || lower.includes('accuracy') || lower.includes('performance') || lower.includes('save') || lower.includes('guarantee')) {
    impact = 'High';
  } else {
    impact = 'Medium';
  }
  
  return { priority, recommendation, impact, difficulty, reasoning };
};

// Execution Step Parser
const parseExecutionStep = (step, index) => {
  if (typeof step !== 'string') {
    return { title: `Step ${index + 1}`, description: String(step || ''), timeframe: `Step ${index + 1}` };
  }
  const clean = step.replace(/^[\s\-•*\d\.]+\s*/, '').trim();
  let title = clean;
  let description = '';
  let timeframe = `Phase ${index + 1}`;
  
  const timeframeRegex = /\(([^)]+)\)$/;
  const match = clean.match(timeframeRegex);
  if (match) {
    timeframe = match[1];
    title = clean.replace(timeframeRegex, '').trim();
  } else {
    const prefixMatch = clean.match(/^((?:Day|Hour|Hours|Step)\s*\d+(?:\/\w+)?(?:\s*-\s*\d+)?)\s*[:-]\s*(.*)/i);
    if (prefixMatch) {
      timeframe = prefixMatch[1];
      title = prefixMatch[2];
    }
  }
  
  const colonIdx = title.indexOf(':');
  const dashIdx = title.indexOf(' - ');
  
  if (colonIdx > 0) {
    description = title.substring(colonIdx + 1).trim();
    title = title.substring(0, colonIdx).trim();
  } else if (dashIdx > 0) {
    description = title.substring(dashIdx + 3).trim();
    title = title.substring(0, dashIdx).trim();
  } else {
    description = title;
    title = `Phase ${index + 1}`;
  }
  
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }
  
  return { title, description, timeframe };
};

// Judge Score Calculator
const calculateJudgeScores = (feasibilityScore, judgePerspectiveText) => {
  const base = feasibilityScore || 7.0;
  
  let innovation = Math.min(10, Math.max(1, Math.round((base * 0.9 + 1) * 10) / 10));
  let complexity = Math.min(10, Math.max(1, Math.round((base * 0.85 + 0.5) * 10) / 10));
  let practicality = Math.min(10, Math.max(1, Math.round((base * 1.05) * 10) / 10));
  let presentation = Math.min(10, Math.max(1, Math.round((base * 0.95 + 0.2) * 10) / 10));
  
  const lower = (judgePerspectiveText || '').toLowerCase();
  if (lower.includes('innovat')) {
    innovation = Math.min(10, innovation + 0.5);
  }
  if (lower.includes('complex') || lower.includes('technic')) {
    complexity = Math.min(10, complexity + 0.5);
  }
  if (lower.includes('practic') || lower.includes('usab') || lower.includes('real')) {
    practicality = Math.min(10, practicality + 0.5);
  }
  
  const avg = Math.round(((innovation + complexity + practicality + presentation) / 4) * 10) / 10;
  
  return {
    judgeScore: avg,
    innovation,
    complexity,
    practicality,
    presentation,
    verdict: judgePerspectiveText || 'Focus on presenting a solid, working MVP with an emphasis on solving the core problem statement.'
  };
};

// Architecture Cards Generator
const generateArchitectureCards = (project, review) => {
  const reasoning = (review.reasoning || '').toLowerCase();
  const description = (project.description || '').toLowerCase();
  const suggestions = (review.improvementSuggestions || []).join(' ').toLowerCase();
  const risks = (review.projectRisks || []).join(' ').toLowerCase();
  
  const cards = [
    {
      id: 'frontend',
      name: 'Frontend Stack',
      status: 'Validated',
      strength: 'Responsive modular UI component framework is ready to scale.',
      suggestion: 'Utilize client-side state management cache to prevent duplicate loads.'
    },
    {
      id: 'backend',
      name: 'Backend Core',
      status: 'Validated',
      strength: 'RESTful API controller layer structured with input validation schemas.',
      suggestion: 'Ensure asynchronous request handlers have error boundary catch blocks.'
    },
    {
      id: 'database',
      name: 'Database Layer',
      status: 'Validated',
      strength: 'Data models optimized for document relationships and atomic updates.',
      suggestion: 'Add index constraints on frequent query filter keys.'
    },
    {
      id: 'ai',
      name: 'AI Pipeline',
      status: 'Validated',
      strength: 'OpenAI/Featherless LLM pipelines configured with retry fallback buffers.',
      suggestion: 'Add token length checks to avoid model window context truncation.'
    },
    {
      id: 'deployment',
      name: 'Deployment Devops',
      status: 'Validated',
      strength: 'Multi-stage container hosting and environment config pipeline ready.',
      suggestion: 'Setup health check endpoints and setup CD push triggers.'
    }
  ];
  
  cards.forEach(card => {
    let hasRisk = false;
    if (card.id === 'frontend') {
      hasRisk = risks.includes('ui') || risks.includes('frontend') || risks.includes('visual') || risks.includes('dashboard') || risks.includes('layout') || risks.includes('styling') || risks.includes('css');
      if (hasRisk) {
        card.status = 'Attention';
        card.strength = 'Standard visual layouts have been planned.';
        card.suggestion = 'Prioritize completing a single dashboard layout before building sub-views.';
      }
    } else if (card.id === 'backend') {
      hasRisk = risks.includes('backend') || risks.includes('api') || risks.includes('timeout') || risks.includes('route') || risks.includes('server') || risks.includes('controller');
      if (hasRisk) {
        card.status = 'Attention';
        card.strength = 'Server router logic has been prototyped.';
        card.suggestion = 'Optimize backend handler timeouts and verify payload validations.';
      }
    } else if (card.id === 'database') {
      hasRisk = risks.includes('database') || risks.includes('db') || risks.includes('mongo') || risks.includes('sql') || risks.includes('schema') || risks.includes('collection');
      if (hasRisk) {
        card.status = 'Attention';
        card.strength = 'Basic database schemas have been drafted.';
        card.suggestion = 'Create simpler document/relational structures to avoid join overhead.';
      }
    } else if (card.id === 'ai') {
      hasRisk = risks.includes('ai') || risks.includes('llm') || risks.includes('model') || risks.includes('token') || risks.includes('prompt') || risks.includes('openai');
      if (hasRisk) {
        card.status = 'Attention';
        card.strength = 'AI request routing pathways have been established.';
        card.suggestion = 'Implement quick response caching or deterministic fallbacks.';
      }
    } else if (card.id === 'deployment') {
      hasRisk = risks.includes('deploy') || risks.includes('hosting') || risks.includes('production') || risks.includes('aws') || risks.includes('vercel') || risks.includes('host') || risks.includes('ci');
      if (hasRisk) {
        card.status = 'Attention';
        card.strength = 'Standard hosting environments identified.';
        card.suggestion = 'Deploy a hello-world API within the first 6 hours of the hackathon.';
      }
    }
  });
  
  return cards;
};

// Sub-Component 1: Feasibility Score Card
const FeasibilityScoreCard = ({ score, alignmentText, reasoningText }) => {
  const percentage = (score || 5) * 10;
  const radius = 36;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let statusText = 'Low Feasibility';
  let badgeColor = '#ef4444';
  let scoreColor = '#ef4444';
  let strokeColor = '#ef4444';

  if (score >= 8) {
    statusText = 'Ready to Build';
    badgeColor = '#10b981';
    scoreColor = '#10b981';
    strokeColor = '#10b981';
  } else if (score >= 5) {
    statusText = 'Moderate Feasibility';
    badgeColor = '#00f0ff';
    scoreColor = '#00f0ff';
    strokeColor = '#00f0ff';
  }

  let summary = 'A feasibility assessment based on project constraints and team capabilities.';
  if (alignmentText) {
    const firstSentence = alignmentText.split(/[.!?]+/)[0];
    if (firstSentence && firstSentence.length > 10) {
      summary = firstSentence + '.';
    }
  } else if (reasoningText) {
    const firstSentence = reasoningText.split(/[.!?]+/)[0];
    if (firstSentence && firstSentence.length > 10) {
      summary = firstSentence + '.';
    }
  }

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-lg flex flex-col gap-4 transition-all duration-300 hover:border-brand-500/50 glow-blue">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Feasibility Score</span>
        <span 
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono"
          style={{ 
            color: badgeColor, 
            borderColor: `${badgeColor}30`, 
            backgroundColor: `${badgeColor}10` 
          }}
        >
          {statusText}
        </span>
      </div>
      
      <div className="flex items-center gap-5">
        <div className="relative flex items-center justify-center w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="rgba(0, 240, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold font-mono" style={{ color: scoreColor }}>
              {score?.toFixed(1) || '0.0'}
            </span>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>/ 10</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00f0ff' }}>Prototype Readiness</span>
          <p className="text-xs leading-relaxed italic" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>
            "{summary}"
          </p>
        </div>
      </div>
    </div>
  );
};

// Sub-Component 2: Insight Card (Alignment)
const AlignmentCard = ({ alignmentText }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-lg flex flex-col gap-4 transition-all duration-300 hover:border-brand-500/50 glow-blue">
      <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Problem-Solution Alignment</span>
      
      <div className="flex items-center gap-3 flex-wrap">
        <div 
          className="flex items-center gap-1 border px-2 py-0.5 rounded-md text-[10px] font-semibold"
          style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
        >
          <Check size={10} /> AI Understanding
        </div>
        <div 
          className="flex items-center gap-1 border px-2 py-0.5 rounded-md text-[10px] font-semibold"
          style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
        >
          <Check size={10} /> Problem Clarity
        </div>
        <div 
          className="flex items-center gap-1 border px-2 py-0.5 rounded-md text-[10px] font-semibold"
          style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
        >
          <Check size={10} /> Solution Fit
        </div>
      </div>
      
      <div className="relative">
        <p className={`text-xs leading-relaxed transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`} style={{ color: 'rgba(0, 240, 255, 0.85)' }}>
          {alignmentText}
        </p>
        
        {alignmentText && alignmentText.length > 150 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-0.5 text-[10px] font-bold hover:text-brand-300 mt-2 cursor-pointer uppercase tracking-wider transition-colors border-0 bg-transparent"
            style={{ color: '#00f0ff' }}
          >
            {isExpanded ? (
              <>Show Less <ChevronUp size={12} /></>
            ) : (
              <>Show More <ChevronDown size={12} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Sub-Component 3: Risks List
const ProjectRisksList = ({ risks }) => {
  if (!risks || risks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Project Risks & Scope Blockers</span>
      <div className="grid grid-cols-1 gap-2.5">
        {risks.map((rawRisk, idx) => {
          const parsed = parseRisk(rawRisk);
          
          let severityColor = '#60a5fa';
          if (parsed.severity === 'High') {
            severityColor = '#f87171';
          } else if (parsed.severity === 'Medium') {
            severityColor = '#fbbf24';
          }

          return (
            <div 
              key={idx} 
              className="bg-neutral-50 border border-neutral-200 hover:border-brand-500/50 transition-all duration-300 rounded-xl p-4 flex gap-3.5 items-start group shadow-md glow-blue"
            >
              <div 
                className="p-2 rounded-lg text-neutral-300 group-hover:text-brand-400 transition-colors"
                style={{ backgroundColor: 'rgba(0, 240, 255, 0.08)' }}
              >
                {renderCategoryIcon(parsed.icon, 16)}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold leading-tight" style={{ color: '#ffffff' }}>
                    {parsed.title}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span 
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{ color: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.12)' }}
                    >
                      {parsed.category}
                    </span>
                    <span 
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider"
                      style={{ 
                        color: severityColor, 
                        borderColor: `${severityColor}30`, 
                        backgroundColor: `${severityColor}10` 
                      }}
                    >
                      {parsed.severity}
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>
                  {parsed.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-Component 4: Missing Skills
const MissingSkillsList = ({ skills }) => {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Identified Skill Gaps</span>
      <div className="flex flex-wrap gap-2">
        {skills.map((rawSkill, idx) => {
          const parsed = parseSkill(rawSkill);
          let impColor = '#60a5fa';
          if (parsed.importance === 'High') {
            impColor = '#f87171';
          } else if (parsed.importance === 'Medium') {
            impColor = '#fbbf24';
          }

          return (
            <div 
              key={idx}
              className="bg-neutral-50 border border-neutral-200 hover:border-brand-500/50 transition-all duration-300 rounded-lg py-2 px-3 flex items-center gap-2.5 shadow-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00f0ff' }}></div>
              <div className="flex flex-col">
                <span className="text-xs font-bold" style={{ color: '#ffffff' }}>{parsed.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-semibold uppercase" style={{ color: 'rgba(0, 240, 255, 0.6)' }}>{parsed.role}</span>
                  <span 
                    className="text-[8px] font-bold px-1 rounded border uppercase tracking-wider font-mono"
                    style={{ 
                      color: impColor, 
                      borderColor: `${impColor}30`, 
                      backgroundColor: `${impColor}10` 
                    }}
                  >
                    {parsed.importance}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-Component 5: Must Build Features
const MustBuildFeaturesList = ({ features }) => {
  if (!features || features.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Must Build Features (Core MVP)</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {features.map((rawFeat, idx) => {
          const parsed = parseFeature(rawFeat, 'High');
          let diffColor = '#fbbf24';
          if (parsed.difficulty === 'Hard') {
            diffColor = '#f87171';
          } else if (parsed.difficulty === 'Easy') {
            diffColor = '#34d399';
          }

          return (
            <div 
              key={idx}
              className="bg-neutral-50 border border-neutral-200 hover:border-brand-500/50 transition-all duration-300 rounded-xl p-3.5 flex flex-col gap-2 shadow-md hover:-translate-y-0.5 glow-blue"
            >
              <div className="flex justify-between items-start gap-2">
                <span 
                  className="text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider font-mono"
                  style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
                >
                  Critical MVP
                </span>
                <div className="flex items-center gap-1 font-mono">
                  <Clock size={10} style={{ color: 'rgba(0, 240, 255, 0.5)' }} />
                  <span className="text-[9px] font-bold uppercase" style={{ color: 'rgba(0, 240, 255, 0.6)' }}>{parsed.time}</span>
                </div>
              </div>
              <span className="text-xs font-bold leading-tight flex-1" style={{ color: '#ffffff' }}>
                {parsed.name}
              </span>
              <div className="flex justify-end mt-1 font-mono">
                <span 
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider"
                  style={{ 
                    color: diffColor, 
                    borderColor: `${diffColor}30`, 
                    backgroundColor: `${diffColor}10` 
                  }}
                >
                  {parsed.difficulty}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-Component 6: Optional Features Collapsible List
const OptionalFeaturesList = ({ features }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!features || features.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-neutral-50 border border-neutral-200 hover:border-brand-500/50 transition-all duration-300 rounded-xl p-4 cursor-pointer w-full text-left shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={14} style={{ color: '#fbbf24' }} />
          <span className="text-xs font-bold text-neutral-200">Optional Features (Nice to Have)</span>
          <span 
            className="text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono"
            style={{ color: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.12)' }}
          >
            {features.length}
          </span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-neutral-450" /> : <ChevronDown size={16} className="text-neutral-450" />}
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1 border-l-2 border-l-brand-500/30 pl-3.5 transition-all duration-300 animate-slide-up">
          {features.map((rawFeat, idx) => {
            const parsed = parseFeature(rawFeat, 'Low');
            let diffColor = '#fbbf24';
            if (parsed.difficulty === 'Hard') {
              diffColor = '#f87171';
            } else if (parsed.difficulty === 'Easy') {
              diffColor = '#34d399';
            }

            return (
              <div 
                key={idx}
                className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl flex flex-col gap-1.5 hover:border-brand-500/50 transition-colors duration-300"
              >
                <div className="flex justify-between items-center">
                  <span 
                    className="text-[8px] font-semibold border px-1.5 py-0.5 rounded uppercase tracking-wider font-mono"
                    style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.25)', backgroundColor: 'rgba(96, 165, 250, 0.08)' }}
                  >
                    Optional
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>{parsed.time}</span>
                </div>
                <span className="text-xs font-semibold leading-tight animate-pulse" style={{ color: 'rgba(0, 240, 255, 0.95)' }}>
                  {parsed.name}
                </span>
                <div className="flex justify-end mt-1 font-mono">
                  <span 
                    className="text-[8px] font-bold px-1 py-0.5 rounded border uppercase tracking-wider"
                    style={{ 
                      color: diffColor, 
                      borderColor: `${diffColor}30`, 
                      backgroundColor: `${diffColor}10` 
                    }}
                  >
                    {parsed.difficulty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Sub-Component 7: Features To Remove warning list
const FeaturesToRemoveList = ({ features }) => {
  if (!features || features.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Features Recommended for Removal</span>
      <div className="grid grid-cols-1 gap-2.5">
        {features.map((rawFeat, idx) => {
          const parsed = parseFeatureToRemove(rawFeat);

          return (
            <div 
              key={idx}
              className="bg-neutral-50 border border-red-500/30 border-l-4 border-l-red-500 rounded-xl p-4 flex gap-3 shadow-md hover:border-red-500/50 transition-colors duration-300"
            >
              <div className="p-2 rounded-lg text-red-400 h-fit" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                <Ban size={16} />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <span className="text-xs font-bold leading-tight" style={{ color: '#f87171' }}>
                    {parsed.name}
                  </span>
                  <span 
                    className="text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider font-mono"
                    style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}
                  >
                    Save ~{parsed.timeSaved}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(0, 240, 255, 0.75)' }}>
                  {parsed.reason}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-Component 8: Improvement Suggestions
const ImprovementCard = ({ suggestion, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const parsed = parseImprovement(suggestion, index);

  let priorityColor = '#60a5fa';
  if (parsed.priority === 'High') {
    priorityColor = '#f87171';
  } else if (parsed.priority === 'Medium') {
    priorityColor = '#fbbf24';
  }

  let diffColor = '#fbbf24';
  if (parsed.difficulty === 'Hard') {
    diffColor = '#f87171';
  } else if (parsed.difficulty === 'Easy') {
    diffColor = '#34d399';
  }

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex gap-3 shadow-md hover:border-brand-500/50 transition-all duration-300 glow-blue">
      <div 
        className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold font-mono shrink-0"
        style={{ color: '#00f0ff', borderColor: 'rgba(0, 240, 255, 0.25)', backgroundColor: 'rgba(0, 240, 255, 0.08)' }}
      >
        {index + 1}
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <span className="text-xs font-bold leading-tight" style={{ color: '#ffffff' }}>
            {parsed.recommendation}
          </span>
          <div className="flex items-center gap-1 font-mono">
            <span 
              className="text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider"
              style={{ 
                color: priorityColor, 
                borderColor: `${priorityColor}30`, 
                backgroundColor: `${priorityColor}10` 
              }}
            >
              {parsed.priority}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2 text-[9px] font-semibold font-mono">
          <span className="px-1.5 py-0.5 rounded uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)', backgroundColor: 'rgba(0, 240, 255, 0.06)' }}>Impact: {parsed.impact}</span>
          <span className="px-1.5 py-0.5 rounded uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)', backgroundColor: 'rgba(0, 240, 255, 0.06)' }}>Difficulty: {parsed.difficulty}</span>
        </div>

        <div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-0.5 text-[9px] font-bold hover:text-neutral-300 mt-1 cursor-pointer uppercase tracking-wider transition-colors border-0 bg-transparent"
            style={{ color: 'rgba(0, 240, 255, 0.6)' }}
          >
            {isExpanded ? (
              <>Hide Reasoning <ChevronUp size={10} /></>
            ) : (
              <>View Reasoning <ChevronDown size={10} /></>
            )}
          </button>
          
          {isExpanded && (
            <p 
              className="text-xs mt-2 leading-relaxed p-2.5 rounded-lg border animate-slide-up"
              style={{ backgroundColor: 'rgba(0, 240, 255, 0.04)', borderColor: 'rgba(0, 240, 255, 0.15)', color: 'rgba(0, 240, 255, 0.75)' }}
            >
              {parsed.reasoning}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ImprovementSuggestionsList = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Mentor Architecture Recommendations</span>
      <div className="flex flex-col gap-2.5">
        {suggestions.map((suggestion, idx) => (
          <ImprovementCard key={idx} suggestion={suggestion} index={idx} />
        ))}
      </div>
    </div>
  );
};

// Sub-Component 9: Judge Perspective Simulated Metrics
const JudgePerspectiveCard = ({ score, perspectiveText }) => {
  const scores = calculateJudgeScores(score, perspectiveText);

  const metrics = [
    { label: 'Innovation', val: scores.innovation, color: 'bg-indigo-500' },
    { label: 'Technical Complexity', val: scores.complexity, color: 'bg-violet-500' },
    { label: 'Practicality', val: scores.practicality, color: 'bg-emerald-500' },
    { label: 'Presentation Value', val: scores.presentation, color: 'bg-amber-500' }
  ];

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-lg flex flex-col gap-4.5 transition-all duration-300 hover:border-brand-500/50 glow-blue animate-slide-up">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Judge Evaluation Simulation</span>
        <div className="flex items-baseline gap-0.5 font-mono">
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>Score: </span>
          <span className="text-lg font-extrabold" style={{ color: '#00f0ff' }}>{scores.judgeScore}</span>
          <span className="text-[10px] font-semibold" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>/10</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2.5">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
              <span style={{ color: 'rgba(0, 240, 255, 0.75)' }}>{metric.label}</span>
              <span className="font-mono text-neutral-200">{metric.val.toFixed(1)}/10</span>
            </div>
            <div 
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(0, 240, 255, 0.08)' }}
            >
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${metric.color}`}
                style={{ width: `${metric.val * 10}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      <div 
        className="border rounded-xl p-3.5 flex gap-2.5 items-start mt-1"
        style={{ backgroundColor: 'rgba(0, 240, 255, 0.05)', borderColor: 'rgba(0, 240, 255, 0.15)' }}
      >
        <div className="p-1.5 rounded-lg text-brand-400 shrink-0" style={{ backgroundColor: 'rgba(0, 240, 255, 0.08)' }}>
          <Award size={14} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#00f0ff' }}>Final Judge Verdict</span>
          <p className="text-xs leading-relaxed italic" style={{ color: 'rgba(0, 240, 255, 0.9)' }}>
            "{scores.verdict}"
          </p>
        </div>
      </div>
    </div>
  );
};

// Sub-Component 10: Interactive Milestone Timeline
const ExecutionTimeline = ({ strategy }) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!strategy || strategy.length === 0) return null;

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-lg flex flex-col gap-4 transition-all duration-300 hover:border-brand-500/50 glow-blue animate-slide-up">
      <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Execution Strategy Timeline</span>
      
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 scrollbar-none">
        {strategy.map((step, idx) => {
          const parsed = parseExecutionStep(step, idx);
          const isSelected = activeStep === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className="flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-1.5 rounded-lg border text-center transition-all duration-300 cursor-pointer"
              style={{
                backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(0, 240, 255, 0.03)',
                borderColor: isSelected ? '#00f0ff' : 'rgba(0, 240, 255, 0.15)',
                color: isSelected ? '#00f0ff' : 'rgba(0, 240, 255, 0.5)'
              }}
            >
              <span className="text-[9px] uppercase tracking-wider whitespace-nowrap font-mono">{parsed.timeframe}</span>
              <div 
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ backgroundColor: isSelected ? '#00f0ff' : 'rgba(0, 240, 255, 0.25)' }}
              ></div>
            </button>
          );
        })}
      </div>

      <div 
        className="border rounded-xl p-4 flex gap-3.5 items-start transition-all duration-300 animate-slide-up min-h-[90px]"
        style={{ backgroundColor: 'rgba(0, 240, 255, 0.04)', borderColor: 'rgba(0, 240, 255, 0.12)' }}
      >
        <div 
          className="font-mono text-sm font-black w-10 h-10 flex items-center justify-center shrink-0 rounded-lg"
          style={{ color: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.08)' }}
        >
          {activeStep + 1}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between items-baseline gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: '#ffffff' }}>{parseExecutionStep(strategy[activeStep], activeStep).title}</span>
            <span 
              className="text-[8px] font-bold border px-1 rounded uppercase tracking-widest font-mono"
              style={{ color: '#00f0ff', borderColor: 'rgba(0, 240, 255, 0.25)', backgroundColor: 'rgba(0, 240, 255, 0.08)' }}
            >
              {parseExecutionStep(strategy[activeStep], activeStep).timeframe}
            </span>
          </div>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'rgba(0, 240, 255, 0.75)' }}>
            {parseExecutionStep(strategy[activeStep], activeStep).description}
          </p>
        </div>
      </div>
      
      <div 
        className="flex items-center justify-between text-[8px] font-bold uppercase border-t pt-3 mt-1 px-1"
        style={{ borderColor: 'rgba(0, 240, 255, 0.12)', color: 'rgba(0, 240, 255, 0.45)' }}
      >
        <span className="flex items-center gap-1"><Compass size={10} /> Milestones Roadmap</span>
        <span>Click tabs to preview details</span>
      </div>
    </div>
  );
};

// Sub-Component 11: Architecture Validation List
const ArchitectureValidationList = ({ project, review }) => {
  const cards = generateArchitectureCards(project, review);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>System Architecture Validation</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card, idx) => {
          const isAttention = card.status === 'Attention';
          const badgeColor = isAttention ? '#fbbf24' : '#34d399';
          const icon = isAttention ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />;

          return (
            <div 
              key={idx}
              className="bg-neutral-50 border border-neutral-200 hover:border-brand-500/50 transition-all duration-300 rounded-xl p-4 flex flex-col gap-2.5 shadow-md hover:-translate-y-0.5 glow-blue"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-bold" style={{ color: '#ffffff' }}>{card.name}</span>
                <span 
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 uppercase tracking-wider font-mono"
                  style={{ 
                    color: badgeColor, 
                    borderColor: `${badgeColor}30`, 
                    backgroundColor: `${badgeColor}10` 
                  }}
                >
                  {icon} {card.status}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-mono" style={{ color: '#10b981' }}>Strength</span>
                  <p className="leading-relaxed mt-0.5" style={{ color: 'rgba(0, 240, 255, 0.85)' }}>{card.strength}</p>
                </div>
                <div 
                  className="border-t pt-1.5 mt-0.5"
                  style={{ borderColor: 'rgba(0, 240, 255, 0.12)' }}
                >
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-mono" style={{ color: '#00f0ff' }}>Optimization</span>
                  <p className="leading-relaxed mt-0.5" style={{ color: 'rgba(0, 240, 255, 0.65)' }}>{card.suggestion}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


const ProjectHub = ({ teamId, initialView }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [splitterLoading, setSplitterLoading] = useState(false);
  const [splitterStatus, setSplitterStatus] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'create', 'edit'
  const [activeTaskPlanTab, setActiveTaskPlanTab] = useState('roadmap');
  const [hoveredMember, setHoveredMember] = useState(null);
  const messagesContainerRef = useRef(null);
  const [quickFeatureInput, setQuickFeatureInput] = useState('');
  const [quickFeatureSaving, setQuickFeatureSaving] = useState(false);

  const handleQuickAddFeature = async () => {
    const trimmed = quickFeatureInput.trim();
    if (!trimmed || !project) return;
    const updated = [...(project.featuresToBuild || []), trimmed];
    setQuickFeatureSaving(true);
    try {
      const res = await updateProject(project._id, { featuresToBuild: updated });
      if (res.success) {
        setProject(prev => ({ ...prev, featuresToBuild: updated }));
        setQuickFeatureInput('');
        toast.success('Feature added!');
      }
    } catch (err) {
      console.error('Failed to add feature:', err);
      toast.error('Failed to add feature.');
    } finally {
      setQuickFeatureSaving(false);
    }
  };

  const handleQuickRemoveFeature = async (idx) => {
    if (!project) return;
    const updated = (project.featuresToBuild || []).filter((_, i) => i !== idx);
    try {
      const res = await updateProject(project._id, { featuresToBuild: updated });
      if (res.success) {
        setProject(prev => ({ ...prev, featuresToBuild: updated }));
        toast.success('Feature removed.');
      }
    } catch (err) {
      console.error('Failed to remove feature:', err);
      toast.error('Failed to remove feature.');
    }
  };

  // Auto-scroll chat window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, chatLoading]);
  
  // Form State
  const [projectName, setProjectName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [description, setDescription] = useState('');
  const [track, setTrack] = useState('');
  const [duration, setDuration] = useState('');
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [status, setStatus] = useState('Planning');

  // Load project on mount/teamId change
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const res = await getProjectByTeam(teamId);
        if (res.success && res.project) {
          setProject(res.project);
          // Navigate directly to task-plan view if requested
          if (initialView === 'task-plan' && res.project.taskPlanGeneratedAt) {
            setView('task-plan');
          } else {
            setView('dashboard');
          }
        } else {
          setProject(null);
          setView('create-prompt'); // Prompt to create project
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        toast.error('Failed to load project details.');
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchProject();
    }
  }, [teamId]);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  // Sync edit form fields when entering edit view
  const enterEditMode = () => {
    if (project) {
      setProjectName(project.projectName);
      setProblemStatement(project.problemStatement);
      setDescription(project.description);
      setTrack(project.track);
      setDuration(project.duration);
      setFeatures(project.featuresToBuild || []);
      setNewFeature('');
      setStatus(project.status);
      setView('edit');
    }
  };

  // Sync create form fields
  const enterCreateMode = () => {
    setProjectName('');
    setProblemStatement('');
    setDescription('');
    setTrack('');
    setDuration('');
    setFeatures([]);
    setNewFeature('');
    setStatus('Planning');
    setView('create');
  };

  // Add a feature dynamically
  const handleAddFeature = (e) => {
    e.preventDefault();
    if (!newFeature.trim()) return;
    if (features.includes(newFeature.trim())) {
      toast.error('Feature already listed.');
      return;
    }
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  // Remove a feature dynamically
  const handleRemoveFeature = (indexToRemove) => {
    setFeatures(features.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRunAnalysis = async () => {
    if (!project) return;
    
    // Validation: Empty features list
    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      toast.error('Empty features list: Please configure at least one feature before running project analysis.');
      return;
    }

    try {
      setReviewLoading(true);
      const isRegen = !!project.projectReviewGeneratedAt;
      const res = await analyzeProject(project._id);
      
      if (res.success) {
        setProject(prev => ({
          ...prev,
          projectReview: res.projectReview,
          projectReviewGeneratedAt: res.projectReviewGeneratedAt
        }));
        
        if (isRegen) {
          toast.success('Project review regenerated successfully.');
        } else {
          toast.success('Project review generated successfully.');
        }
        
        setView('review-report');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to analyze project.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleGenerateTaskPlan = async () => {
    if (!project) return;
    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      toast.error('Please configure at least one feature before generating a task plan.');
      return;
    }

    let interval;
    try {
      setSplitterLoading(true);
      const statuses = [
        'Analyzing Project...',
        'Generating Task Plan...',
        'Assigning Tasks...',
        'Building Execution Strategy...'
      ];
      let index = 0;
      setSplitterStatus(statuses[0]);
      interval = setInterval(() => {
        index++;
        if (index < statuses.length) {
          setSplitterStatus(statuses[index]);
        }
      }, 1000);

      const res = await generateTaskPlan(project._id);
      if (res.success) {
        setProject(prev => ({
          ...prev,
          taskPlan: res.taskPlan,
          taskPlanGeneratedAt: res.taskPlanGeneratedAt
        }));
        toast.success('Task plan generated successfully!');
        setView('task-plan');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate task plan.');
    } finally {
      clearInterval(interval);
      setSplitterLoading(false);
      setSplitterStatus('');
    }
  };

  const handleRegenerateTaskPlan = async () => {
    if (!project) return;
    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      toast.error('Please configure at least one feature before regenerating the task plan.');
      return;
    }

    let interval;
    try {
      setSplitterLoading(true);
      const statuses = [
        'Analyzing Project...',
        'Generating Task Plan...',
        'Assigning Tasks...',
        'Building Execution Strategy...'
      ];
      let index = 0;
      setSplitterStatus(statuses[0]);
      interval = setInterval(() => {
        index++;
        if (index < statuses.length) {
          setSplitterStatus(statuses[index]);
        }
      }, 1000);

      const res = await regenerateTaskPlan(project._id);
      if (res.success) {
        setProject(prev => ({
          ...prev,
          taskPlan: res.taskPlan,
          taskPlanGeneratedAt: res.taskPlanGeneratedAt
        }));
        toast.success('Task plan regenerated successfully!');
        setView('task-plan');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to regenerate task plan.');
    } finally {
      clearInterval(interval);
      setSplitterLoading(false);
      setSplitterStatus('');
    }
  };

  const handleUpdateTaskStatus = async (memberName, taskName, newStatus) => {
    if (!project) return;
    try {
      const res = await updateTaskStatus(project._id, {
        memberName,
        taskName,
        status: newStatus
      });
      if (res.success) {
        setProject(prev => ({
          ...prev,
          taskPlan: res.taskPlan
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update task status.');
    }
  };

  const openMentorChat = async () => {
    setView('mentor-chat');
    setChatError(null);
    try {
      setHistoryLoading(true);
      const res = await getChatHistory(project._id);
      if (res.success) {
        setChatMessages(res.messages || []);
      }
    } catch (err) {
      console.error(err);
      setChatError('Failed to load chat history. You can still send new messages.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendChatMessage = async (msgText) => {
    const textToSend = msgText || chatInput;
    if (!textToSend || !textToSend.trim()) return;
    if (chatLoading) return;

    setChatError(null);
    setChatLoading(true);
    
    // Optimistic update
    const tempUserMsg = {
      _id: 'temp_user_' + Date.now(),
      role: 'user',
      message: textToSend.trim(),
      createdAt: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setChatInput('');

    try {
      const res = await sendChatMessage(project._id, textToSend.trim());
      if (res.success) {
        // Replace temp message with saved messages
        setChatMessages(prev => {
          const filtered = prev.filter(m => !m._id.startsWith('temp_'));
          return [...filtered, res.userMessage, res.assistantMessage];
        });
      }
    } catch (err) {
      console.error(err);
      setChatError(err.response?.data?.message || 'Failed to send message to AI Mentor.');
      // Remove temp message on failure
      setChatMessages(prev => prev.filter(m => !m._id.startsWith('temp_')));
    } finally {
      setChatLoading(false);
    }
  };

  // Handle Create Submit
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('Project name is required.');
      return;
    }
    if (!problemStatement.trim()) {
      toast.error('Problem statement is required.');
      return;
    }
    if (problemStatement.trim().length < 20) {
      toast.error('Problem statement must be at least 20 characters long.');
      return;
    }

    try {
      setActionLoading(true);
      const projectData = {
        projectName: projectName.trim(),
        problemStatement: problemStatement.trim(),
        description: description.trim(),
        track: track.trim(),
        duration: duration.trim(),
        featuresToBuild: features,
        teamId
      };
      const res = await createProject(projectData);
      if (res.success) {
        setProject(res.project);
        toast.success('Project created successfully!');
        setView('dashboard');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Submit
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }
    if (!problemStatement.trim()) {
      toast.error('Problem statement is required.');
      return;
    }
    if (problemStatement.trim().length < 20) {
      toast.error('Problem statement must be at least 20 characters long.');
      return;
    }

    try {
      setActionLoading(true);
      const projectData = {
        projectName: projectName.trim(),
        problemStatement: problemStatement.trim(),
        description: description.trim(),
        track: track.trim(),
        duration: duration.trim(),
        featuresToBuild: features,
        status
      };
      const res = await updateProject(project._id, projectData);
      if (res.success) {
        setProject(res.project);
        toast.success('Project updated successfully!');
        setView('dashboard');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? All project configurations will be permanently removed.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await deleteProject(project._id);
      if (res.success) {
        setProject(null);
        toast.success('Project deleted successfully.');
        setView('create-prompt');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (statusVal) => {
    switch (statusVal) {
      case 'Planning':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">
            <Clock size={12} /> Planning
          </span>
        );
      case 'In Progress':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700">
            <Play size={12} /> In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle size={12} /> Completed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="details-card flex flex-col justify-center items-center py-8 text-slate-400">
        <RefreshCw className="animate-spin text-primary mb-2" size={24} />
        <span className="text-xs font-semibold">Loading project hub...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <FolderGit2 size={20} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-neutral-500 tracking-wider uppercase">Project Hub</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Manage project details, tracks, and features</p>
          </div>
        </div>
        {view === 'dashboard' && project && (
          <div className="flex flex-col items-end gap-1.5">
            {getStatusBadge(project.status)}
            {project.projectReviewGeneratedAt && (
              <button
                type="button"
                onClick={openMentorChat}
                className="btn-secondary text-[10px] py-1 px-2.5 cursor-pointer w-fit border-brand-200 bg-brand-50/20 text-brand-700 hover:bg-brand-50/40"
              >
                Open AI Mentor
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && project && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">{project.projectName}</h1>
            <div className="flex gap-4 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1.5">
              {project.track && <span>Track: <b className="text-brand-600">{project.track}</b></span>}
              {project.duration && <span>Duration: <b className="text-brand-600">{project.duration}</b></span>}
            </div>
          </div>

          {/* Problem Statement */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Problem Statement</span>
            <div className="bg-neutral-50 border border-neutral-200 border-l-4 border-l-red-500 rounded-lg p-4">
              <p className="text-xs font-semibold text-neutral-800 leading-relaxed">
                {project.problemStatement}
              </p>
            </div>
          </div>

          {project.description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Description</span>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <p className="text-xs text-neutral-600 leading-relaxed">{project.description}</p>
              </div>
            </div>
          )}

          {/* Features Checklist */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Features Checklist</span>
            <div className="flex flex-col gap-2">
              {project.featuresToBuild && project.featuresToBuild.length > 0 ? (
                project.featuresToBuild.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-neutral-50 border border-neutral-200/60 rounded-lg px-3 py-2 text-xs font-medium text-neutral-700 group">
                    <ListTodo size={14} className="text-brand-500 shrink-0" />
                    <span className="flex-1">{feature}</span>
                    <button
                      onClick={() => handleQuickRemoveFeature(idx)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 bg-transparent border-0 cursor-pointer transition-all"
                      title="Remove feature"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-400 italic">
                  No features configured yet. Add one below.
                </p>
              )}

              {/* Inline Add Feature */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={quickFeatureInput}
                  onChange={e => setQuickFeatureInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuickAddFeature()}
                  placeholder="Add a feature... (press Enter)"
                  className="flex-1 bg-neutral-50 border border-neutral-200 border-dashed rounded-lg px-3 py-2 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
                  disabled={quickFeatureSaving}
                />
                <button
                  onClick={handleQuickAddFeature}
                  disabled={quickFeatureSaving || !quickFeatureInput.trim()}
                  className="shrink-0 p-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white border-0 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Add feature"
                >
                  {quickFeatureSaving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                </button>
              </div>
            </div>
          </div>

          {/* AI Project Review Trigger Block */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 border-l-4 border-l-brand-500 flex flex-col gap-3 mt-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-brand-500" />
              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                AI Project Review
              </h3>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Analyze the project's feasibility, risks, scope, missing skills, and improvement opportunities.
            </p>
            
            {reviewLoading ? (
              <div className="flex items-center gap-2.5 py-1 text-neutral-500 text-xs">
                <RefreshCw className="animate-spin text-brand-500" size={14} />
                <span>Analyzing Project...</span>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap mt-1">
                {!project.projectReviewGeneratedAt ? (
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit"
                  >
                    Analyze Project
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('review-report')}
                      className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit"
                    >
                      View Review
                    </button>
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      className="btn-secondary text-xs py-1.5 px-3 cursor-pointer w-fit"
                    >
                      Regenerate Review
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Task Splitter Trigger Block */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 border-l-4 border-l-purple-500 flex flex-col gap-3 mt-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-purple-500" />
              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                AI Task Splitter
              </h3>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Decompose your project features, infer missing technical tasks, map roles to members, and generate a step-by-step roadmap.
            </p>
            
            {splitterLoading ? (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-100"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-[6px] rounded-full bg-purple-50 flex items-center justify-center">
                      <Cpu size={12} className="text-purple-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-700">{splitterStatus}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">This may take up to 2 minutes</p>
                  </div>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full w-3/5 bg-gradient-to-r from-purple-500 to-violet-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap mt-1">
                {!project.taskPlanGeneratedAt ? (
                  <button
                    type="button"
                    onClick={handleGenerateTaskPlan}
                    className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit bg-purple-600 hover:bg-purple-700 border-purple-600"
                  >
                    Generate Task Plan
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('task-plan')}
                      className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit bg-purple-600 hover:bg-purple-700 border-purple-600"
                    >
                      View Task Plan
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateTaskPlan}
                      className="btn-secondary text-xs py-1.5 px-3 cursor-pointer w-fit"
                    >
                      Regenerate Task Plan
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Stack Consensus Engine Trigger Block */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 border-l-4 border-l-emerald-500 flex flex-col gap-3 mt-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  AI Stack Consensus Engine
                </h3>
              </div>
              {project.finalTechStack && project.finalTechStack.frontend && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 uppercase tracking-wider">Finalized</span>
              )}
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Collaboratively choose frontend, backend, database, AI, and deployment selections. Cast votes, log concerns, and review AI stack readiness analytics.
            </p>
            <div className="flex gap-2 flex-wrap mt-1">
              <button
                type="button"
                onClick={() => setView('tech-stack')}
                className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs w-fit bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
              >
                Open Tech Stack selection
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-neutral-100 pt-4 mt-2">
            <button 
              onClick={enterEditMode}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer"
              disabled={actionLoading}
            >
              <Edit3 size={14} /> Edit Project
            </button>
            <button 
              onClick={handleDeleteProject}
              className="btn-danger text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer"
              disabled={actionLoading}
            >
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        </div>
      )}

      {view === 'review-report' && project && project.projectReviewGeneratedAt && (
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-brand-500 animate-pulse" />
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider text-shadow-sm">
                AI Project Review Dashboard
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200 text-xs font-semibold cursor-pointer border-0 bg-transparent transition-colors"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          {project.projectReviewGeneratedAt && (
            <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mt-[-10px] font-mono">
              Analysis Generated: {new Date(project.projectReviewGeneratedAt).toLocaleString()}
            </div>
          )}

          {/* Redesigned 2-column Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 items-start animate-slide-up">
            
            {/* Left Column */}
            <div className="flex flex-col gap-5">
              {/* 1. Feasibility Score */}
              <FeasibilityScoreCard 
                score={project.projectReview.feasibilityScore} 
                alignmentText={project.projectReview.problemSolutionAlignment} 
                reasoningText={project.projectReview.reasoning}
              />

              {/* 2. Problem-Solution Alignment */}
              <AlignmentCard alignmentText={project.projectReview.problemSolutionAlignment} />

              {/* 10. Execution Strategy Timeline */}
              <ExecutionTimeline strategy={project.projectReview.executionStrategy} />

              {/* 9. Judge Perspective Simulated Metrics */}
              <JudgePerspectiveCard 
                score={project.projectReview.feasibilityScore} 
                perspectiveText={project.projectReview.judgePerspective} 
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-5">
              {/* 3. Project Risks */}
              <ProjectRisksList risks={project.projectReview.projectRisks} />

              {/* 4. Missing Skills */}
              <MissingSkillsList skills={project.projectReview.missingSkills} />

              {/* 5. Must Build Features */}
              <MustBuildFeaturesList features={project.projectReview.mustBuildFeatures} />

              {/* 6. Optional Features */}
              <OptionalFeaturesList features={project.projectReview.optionalFeatures} />

              {/* 7. Features To Remove */}
              <FeaturesToRemoveList features={project.projectReview.featuresToRemove} />

              {/* 8. Improvement Suggestions */}
              <ImprovementSuggestionsList suggestions={project.projectReview.improvementSuggestions} />

              {/* 12. Additional reasoning */}
              {project.projectReview.reasoning && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-lg flex flex-col gap-2 transition-all duration-300 hover:border-brand-500/50 glow-blue">
                  <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Architect's Reasoning Summary</span>
                  <p className="text-xs leading-relaxed italic" style={{ color: 'rgba(0, 240, 255, 0.75)' }}>
                    "{project.projectReview.reasoning}"
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* 11. System Architecture Validation Full-Width */}
          <div className="mt-2 animate-slide-up">
            <ArchitectureValidationList project={project} review={project.projectReview} />
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={reviewLoading}
              className="btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs transition-all hover:scale-[1.02]"
            >
              Regenerate Review
            </button>
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="btn-secondary text-xs py-1.5 px-3 cursor-pointer transition-all hover:scale-[1.02]"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* AI Task Splitter Results View */}
      {view === 'task-plan' && project && project.taskPlanGeneratedAt && (() => {
        const plan = project.taskPlan;
        const coreCount = plan.projectTasks?.coreFeatures?.length || 0;
        const techCount = plan.projectTasks?.technicalTasks?.length || 0;
        const deployCount = plan.projectTasks?.deploymentTasks?.length || 0;
        const totalTasks = coreCount + techCount + deployCount;
        const allAssigned = (plan.assignments || []).flatMap(a => a.assignedTasks || []);
        const completedCount = allAssigned.filter(t => t.status === 'Completed').length;
        const inProgressCount = allAssigned.filter(t => t.status === 'In Progress').length;
        const completionPct = allAssigned.length > 0 ? Math.round((completedCount / allAssigned.length) * 100) : 0;
        const memberGradients = ['from-violet-500 to-purple-600','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-rose-500 to-pink-500'];
        const memberBgColors = ['bg-violet-50 text-violet-600 border-violet-200','bg-blue-50 text-blue-600 border-blue-200','bg-emerald-50 text-emerald-600 border-emerald-200','bg-amber-50 text-amber-600 border-amber-200','bg-rose-50 text-rose-600 border-rose-200'];
        const barFills = ['bg-gradient-to-r from-violet-500 to-purple-500','bg-gradient-to-r from-blue-500 to-cyan-500','bg-gradient-to-r from-emerald-500 to-teal-500','bg-gradient-to-r from-amber-500 to-orange-500','bg-gradient-to-r from-rose-500 to-pink-500'];

        return (
          <div className="flex flex-col gap-6 animate-slide-up">
            {/* ═══ Header Banner ═══ */}
            <div 
              className="relative overflow-hidden rounded-2xl p-6 shadow-lg border border-neutral-200"
              style={{ 
                backgroundColor: 'var(--color-neutral-100)', 
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.08)'
              }}
            >
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border font-mono"
                      style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.25)', backgroundColor: 'rgba(192, 132, 252, 0.08)' }}
                    >
                      <Cpu size={10} className="animate-pulse" /> AI Agent Intelligence
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: 'rgba(0, 240, 255, 0.65)' }}>Task Splitter & Roadmap</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{project.projectName}</h2>
                  {project.taskPlanGeneratedAt && (
                    <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: 'rgba(0, 240, 255, 0.65)' }}>
                      <Clock size={11} /> Plan generated {new Date(project.taskPlanGeneratedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end">
                  <button type="button" onClick={() => setView('dashboard')}
                    className="btn-secondary text-xs px-3.5 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button type="button" onClick={handleRegenerateTaskPlan} disabled={splitterLoading}
                    className="btn-secondary text-xs px-3.5 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {splitterLoading ? <RefreshCw className="animate-spin text-purple-400" size={13} /> : <RefreshCw size={13} />} Regenerate Plan
                  </button>
                </div>
              </div>

              {/* Progress Summary Track */}
              <div 
                className="relative z-10 mt-6 pt-5 border-t flex flex-col md:flex-row md:items-center gap-4"
                style={{ borderColor: 'rgba(0, 240, 255, 0.15)' }}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(0, 240, 255, 0.75)' }}>Aggregate Completion Scope</span>
                    <span className="text-xs font-black text-white font-mono">{completionPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden p-[2px] border border-neutral-200" style={{ backgroundColor: 'rgba(0, 240, 255, 0.08)' }}>
                    <div className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(124,58,237,0.45)]" style={{ width: `${completionPct}%` }}></div>
                  </div>
                </div>
                <div 
                  className="flex items-center gap-3 border rounded-xl px-4 py-2 shrink-0 shadow-sm"
                  style={{ backgroundColor: 'rgba(0, 240, 255, 0.04)', borderColor: 'rgba(0, 240, 255, 0.15)' }}
                >
                  <Activity size={14} className="animate-pulse" style={{ color: '#10b981' }} />
                  <div className="text-left">
                    <div className="text-xs font-black text-white leading-none">
                      {completedCount} <span className="font-normal" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>/ {allAssigned.length}</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 block" style={{ color: 'rgba(0, 240, 255, 0.7)' }}>Tasks Completed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ Navigation Tabs ═══ */}
            <div 
              className="flex border-b gap-1 p-1 rounded-xl overflow-x-auto scrollbar-none"
              style={{ 
                backgroundColor: 'rgba(0, 240, 255, 0.03)', 
                borderColor: 'rgba(0, 240, 255, 0.15)' 
              }}
            >
              {[
                { id: 'roadmap', label: 'Roadmap Timeline', icon: GitBranch },
                { id: 'team', label: 'Team Workload', icon: Users },
                { id: 'tasks', label: 'Task Checklist', icon: ListTodo },
                { id: 'insights', label: 'MVP Focus & Risks', icon: Target },
                { id: 'marketplace', label: 'Task Marketplace', icon: ShoppingBag },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTaskPlanTab === tab.id;
                const activeColors = {
                  roadmap: '#c084fc',
                  team: '#60a5fa',
                  tasks: '#34d399',
                  insights: '#fbbf24',
                  marketplace: '#818cf8'
                };
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTaskPlanTab(tab.id)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shrink-0 border"
                    style={{
                      backgroundColor: isActive ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                      borderColor: isActive ? 'rgba(0, 240, 255, 0.4)' : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(0, 240, 255, 0.55)'
                    }}
                  >
                    <Icon 
                      size={13} 
                      style={{ color: isActive ? activeColors[tab.id] : 'rgba(0, 240, 255, 0.45)' }} 
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ═══ Tab Contents ═══ */}

            {/* Tab 1: Execution Roadmap Timeline */}
            {activeTaskPlanTab === 'roadmap' && (
              <div className="flex flex-col gap-1.5 animate-slide-up">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-505 uppercase tracking-widest">Execution Roadmap</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Sequential implementation plan generated specifically for your team structure</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100 uppercase tracking-widest font-mono">
                    {plan.executionOrder?.length || 0} Phases
                  </span>
                </div>
                
                <div className="relative mt-2 pl-2 md:pl-4">
                  <div className="flex flex-col">
                    {plan.executionOrder?.map((step, idx) => {
                      const meta = getStepMeta(step);
                      const StepIcon = meta.icon;
                      const isFirst = idx === 0;
                      const isLast = idx === plan.executionOrder.length - 1;
                      const cleanText = step.replace(/^\d+\.\s*/, '');
                      return (
                        <div key={idx} className="flex gap-4 relative group items-stretch">
                          {/* Timeline vertical bar & counter */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 z-10 ${
                              isFirst 
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 border-transparent text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]' 
                                : 'bg-white border-neutral-200 text-neutral-505 group-hover:border-purple-300 group-hover:text-purple-600'
                            }`}>
                              {idx + 1}
                            </div>
                            {!isLast && (
                              <div className="w-[2px] grow bg-neutral-200 my-1.5 group-hover:bg-purple-250 transition-colors"></div>
                            )}
                          </div>
                          {/* Card details */}
                          <div className="flex-1 pb-6">
                            <div className="bg-white border border-neutral-200/80 hover:border-purple-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-purple-500 transition-all duration-300"></div>
                              
                              <div className="flex items-start gap-3.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 border ${
                                  isFirst ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-neutral-50 border-neutral-100 text-neutral-450'
                                }`}>
                                  <StepIcon size={15} />
                                </div>
                                <div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border mb-1.5 ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                  <h4 className="text-xs font-semibold text-neutral-750 leading-relaxed group-hover:text-neutral-900 transition-colors">
                                    {cleanText}
                                  </h4>
                                </div>
                              </div>
                              
                              <div className="shrink-0 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-50 px-2 py-1 rounded-md border border-neutral-150 font-mono">
                                  Step {idx + 1}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Team Assignments & Workloads */}
            {activeTaskPlanTab === 'team' && (() => {
              const percentages = plan.workloadDistribution?.map(d => d.percentage || 0) || [];
              const maxPct = Math.max(...percentages, 0);
              const minPct = Math.min(...percentages, 0);
              const diffPct = maxPct - minPct;
              
              const strokeHexColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];

              return (
                <div className="flex flex-col gap-6 animate-slide-up">
                  {/* Workload Distribution Analytics */}
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-neutral-405 uppercase tracking-widest flex items-center gap-1.5">
                        <BarChart3 size={13} className="text-neutral-505" /> Workload Allocation Analysis
                      </h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Complexity allocation derived from task counts, deliverables scope, and skills compatibility</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Left: Interactive Donut Chart */}
                      <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-6 p-5 bg-neutral-50/45 border border-neutral-150 rounded-2xl">
                        
                        {/* Circle Donut Wrapper */}
                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 origin-center">
                            {/* Base Track */}
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="rgba(0, 240, 255, 0.08)"
                              strokeWidth="8.5"
                            />
                            {/* Segment Circles */}
                            {(() => {
                              let accumulatedOffset = 0;
                              return plan.workloadDistribution?.map((dist, idx) => {
                                const segmentLength = ((dist.percentage || 0) / 100) * 238.76;
                                const strokeDashoffset = -accumulatedOffset;
                                accumulatedOffset += segmentLength;
                                const strokeColor = strokeHexColors[idx % strokeHexColors.length];
                                const isHovered = hoveredMember && hoveredMember.member === dist.member;

                                return (
                                  <circle
                                    key={idx}
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    fill="transparent"
                                    stroke={strokeColor}
                                    strokeWidth={isHovered ? 11.5 : 8.5}
                                    strokeDasharray={`${segmentLength} 238.76`}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-250 cursor-pointer origin-center"
                                    onMouseEnter={() => setHoveredMember(dist)}
                                    onMouseLeave={() => setHoveredMember(null)}
                                  />
                                );
                              });
                            })()}
                          </svg>

                          {/* Center Text Panel */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
                            {hoveredMember ? (
                              <>
                                <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider truncate max-w-[85px] leading-none">
                                  {hoveredMember.member}
                                </span>
                                <span className="text-sm font-black text-neutral-905 font-mono mt-1">
                                  {hoveredMember.percentage}%
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                                  Balance
                                </span>
                                <span className={`text-[10px] font-extrabold mt-1.5 px-2 py-0.5 rounded-md border text-center leading-none ${
                                  diffPct > 30 ? 'bg-red-50 text-red-700 border-red-100' :
                                  diffPct > 15 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                  {diffPct > 30 ? 'Skewed' : diffPct > 15 ? 'Moderate' : 'Optimal'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Donut stats panel */}
                        <div className="flex flex-col gap-2.5 w-full sm:flex-1 lg:w-full">
                          <div className="flex justify-between items-center text-xs border-b border-neutral-200/50 pb-2">
                            <span className="text-neutral-500 font-medium">Workload Delta</span>
                            <span className="font-bold text-neutral-800 font-mono">{diffPct}% max diff</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-b border-neutral-200/50 pb-2">
                            <span className="text-neutral-500 font-medium">Team Members</span>
                            <span className="font-bold text-neutral-800 font-mono">{plan.assignments?.length || 0} dev(s)</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-500 font-medium">Average Load</span>
                            <span className="font-bold text-neutral-800 font-mono">
                              {Math.round(100 / (plan.assignments?.length || 1))}% / dev
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Right: Detailed List and Bars */}
                      <div className="lg:col-span-7 flex flex-col gap-3">
                        {plan.workloadDistribution?.map((dist, idx) => {
                          const colorIdx = idx % barFills.length;
                          const isHovered = hoveredMember && hoveredMember.member === dist.member;
                          const hexColor = strokeHexColors[colorIdx];
                          const memberTasks = plan.assignments?.find(a => a.member === dist.member)?.assignedTasks || [];
                          
                          return (
                            <div 
                              key={idx} 
                              onMouseEnter={() => setHoveredMember(dist)}
                              onMouseLeave={() => setHoveredMember(null)}
                              className={`border rounded-xl p-3.5 flex flex-col gap-2.5 transition-all duration-200 ${
                                isHovered 
                                  ? 'bg-neutral-50 border-purple-305 shadow-3xs' 
                                  : 'bg-neutral-50/20 border-neutral-150 hover:border-neutral-250 hover:bg-neutral-50/50'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${memberGradients[colorIdx]} flex items-center justify-center text-white font-extrabold text-[10px] shrink-0 shadow-3xs`}>
                                    {dist.member.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-neutral-850 block">{dist.member}</span>
                                    <span className="text-[10px] text-neutral-450 block font-semibold">{memberTasks.length} tasks assigned</span>
                                  </div>
                                </div>
                                <span className="text-sm font-black text-neutral-900 font-mono" style={{ color: isHovered ? hexColor : undefined }}>
                                  {dist.percentage}%
                                </span>
                              </div>
                              <div className="h-2 bg-neutral-200/85 rounded-full overflow-hidden p-[1px]">
                                <div className={`h-full rounded-full ${barFills[colorIdx]} transition-all duration-1000 ease-out`} style={{ width: `${dist.percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Team Member Task Boards */}
                  <div className="flex flex-col gap-1.5">
                    <div className="mb-2">
                      <h3 className="text-xs font-bold text-neutral-405 uppercase tracking-widest">Team Boards</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">Track individual milestones and click checkmarks to quickly toggle completion</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {plan.assignments?.map((assign, idx) => {
                        const memberTasks = assign.assignedTasks || [];
                        const memberCompleted = memberTasks.filter(t => t.status === 'Completed').length;
                        const memberProgress = memberTasks.length > 0 ? Math.round((memberCompleted / memberTasks.length) * 100) : 0;
                        const colorIdx = idx % memberGradients.length;
                        return (
                          <div key={idx} className="bg-white border border-neutral-205 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-purple-200 transition-all duration-300 flex flex-col group">
                            {/* Card Header with user identity */}
                            <div className="p-4 bg-neutral-50/50 border-b border-neutral-100">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${memberGradients[colorIdx]} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs`}>
                                  {assign.member.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-neutral-905 truncate group-hover:text-purple-650 transition-colors">
                                    {assign.member}
                                  </h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {assign.skills.map((s, sIdx) => (
                                      <span key={sIdx} className={`px-2 py-0.5 text-[8px] font-bold rounded-md border tracking-wider uppercase ${memberBgColors[colorIdx]}`}>
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-base font-extrabold text-neutral-900 font-mono leading-none">
                                    {memberCompleted}<span className="text-xs text-neutral-450 font-normal">/{memberTasks.length}</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-neutral-455 uppercase tracking-widest mt-1 inline-block">Done</span>
                                </div>
                              </div>
                              
                              <div className="mt-3.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ease-out ${barFills[colorIdx]}`} style={{ width: `${memberProgress}%` }}></div>
                                </div>
                                <span className="text-[9px] font-bold text-neutral-500 font-mono">{memberProgress}%</span>
                              </div>
                            </div>

                            {/* Checklist Section */}
                            <div className="p-4 flex flex-col gap-2 max-h-[300px] overflow-y-auto grow">
                              {memberTasks.map((t, tIdx) => {
                                const sc = { 
                                  'Not Started': { dot: 'bg-neutral-350', bg: 'bg-neutral-50/50 border-neutral-100 hover:border-neutral-205', tx: 'text-neutral-500 border-neutral-200 bg-white' }, 
                                  'In Progress': { dot: 'bg-amber-400 animate-pulse', bg: 'bg-amber-50/20 border-amber-100/70 hover:border-amber-200/50', tx: 'text-amber-700 border-amber-200 bg-amber-50/30' }, 
                                  'Completed': { dot: 'bg-emerald-500', bg: 'bg-emerald-50/15 border-emerald-100 hover:border-emerald-200/40', tx: 'text-emerald-700 border-emerald-200 bg-emerald-50/30' } 
                                };
                                const cfg = sc[t.status] || sc['Not Started'];
                                const isCompleted = t.status === 'Completed';
                                
                                return (
                                  <div key={tIdx} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 ${cfg.bg}`}>
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateTaskStatus(assign.member, t.task, isCompleted ? 'Not Started' : 'Completed')}
                                      className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-all duration-200 ${
                                        isCompleted 
                                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs' 
                                          : 'bg-white border-neutral-250 text-transparent hover:border-emerald-400 hover:text-emerald-500/20'
                                      }`}
                                    >
                                      <CheckCircle size={10} className={isCompleted ? 'stroke-[3.5]' : ''} />
                                    </button>
                                    
                                    <span className={`text-xs font-semibold flex-1 leading-relaxed ${isCompleted ? 'text-neutral-400 line-through font-normal' : 'text-neutral-705'}`}>
                                      {t.task}
                                    </span>
                                    
                                    <select 
                                      value={t.status} 
                                      onChange={(e) => handleUpdateTaskStatus(assign.member, t.task, e.target.value)}
                                      className={`text-[9px] font-bold rounded-lg px-2 py-1 bg-white border cursor-pointer hover:border-neutral-305 focus:outline-none transition-colors ${cfg.tx}`}
                                    >
                                      <option value="Not Started">⏳ Not Started</option>
                                      <option value="In Progress">🔄 In Progress</option>
                                      <option value="Completed">✅ Completed</option>
                                    </select>
                                  </div>
                                );
                              })}
                            </div>

                            {/* AI Placement explanation */}
                            {assign.reason && (
                              <div className="px-4 pb-4 mt-auto border-t border-neutral-50 pt-3 bg-neutral-50/30">
                                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 flex gap-2">
                                  <Cpu size={12} className="text-purple-400 mt-0.5 shrink-0" />
                                  <p className="text-[10px] text-neutral-500 leading-relaxed">
                                    <span className="font-bold text-neutral-600">AI Assignment logic: </span>
                                    {assign.reason}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tab 3: Detailed Task Checklist */}
            {activeTaskPlanTab === 'tasks' && (
              <div className="flex flex-col gap-1.5 animate-slide-up">
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-neutral-405 uppercase tracking-widest">Milestones Overview</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Complete list of scope elements split by task types</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Core Features */}
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
                    <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500"></div>
                    <div className="p-4 flex flex-col gap-3 grow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={13} className="text-purple-500" /> Core Features
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-[10px] font-extrabold">{coreCount}</span>
                      </div>
                      <div className="flex flex-col gap-2 grow">
                        {plan.projectTasks?.coreFeatures?.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-neutral-50/50 hover:bg-purple-50/20 border border-neutral-100 rounded-xl transition-all duration-150 group">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 shrink-0 group-hover:bg-purple-500"></span>
                            <span className="text-xs font-semibold text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{task}</span>
                          </div>
                        )) || <span className="text-xs text-neutral-405 italic">None</span>}
                      </div>
                    </div>
                  </div>

                  {/* Technical Tasks */}
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                    <div className="p-4 flex flex-col gap-3 grow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu size={13} className="text-blue-500" /> Technical Tasks
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-extrabold">{techCount}</span>
                      </div>
                      <div className="flex flex-col gap-2 grow">
                        {plan.projectTasks?.technicalTasks?.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-neutral-50/50 hover:bg-blue-50/20 border border-neutral-100 rounded-xl transition-all duration-150 group">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0 group-hover:bg-blue-500"></span>
                            <span className="text-xs font-semibold text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{task}</span>
                          </div>
                        )) || <span className="text-xs text-neutral-405 italic">None</span>}
                      </div>
                    </div>
                  </div>

                  {/* Deployment Tasks */}
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <div className="p-4 flex flex-col gap-3 grow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap size={13} className="text-emerald-500 animate-pulse" /> Deployment Tasks
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold">{deployCount}</span>
                      </div>
                      <div className="flex flex-col gap-2 grow">
                        {plan.projectTasks?.deploymentTasks?.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-neutral-50/50 hover:bg-emerald-50/20 border border-neutral-100 rounded-xl transition-all duration-150 group">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0 group-hover:bg-emerald-500"></span>
                            <span className="text-xs font-semibold text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{task}</span>
                          </div>
                        )) || <span className="text-xs text-neutral-405 italic">None</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Insights & MVP Focus */}
            {activeTaskPlanTab === 'insights' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up">
                {/* Critical Tasks */}
                <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200">
                  <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Zap size={16} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Critical for Demo</h3>
                        <p className="text-[10px] text-amber-600/70 mt-0.5">MVP Core Deliverables</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {plan.criticalTasks?.map((task, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 bg-amber-50/30 border border-amber-100 rounded-xl">
                          <AlertTriangle size={12} className="text-amber-505 mt-0.5 shrink-0" />
                          <span className="text-xs font-semibold text-amber-850 leading-relaxed">{task}</span>
                        </div>
                      )) || <p className="text-xs text-neutral-450 italic">None identified</p>}
                    </div>
                  </div>
                </div>

                {/* Recommended Focus */}
                <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200">
                  <div className="h-1.5 bg-gradient-to-r from-purple-400 to-violet-500"></div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-650 flex items-center justify-center shrink-0">
                        <Target size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-purple-805 uppercase tracking-widest">Judging Impact</h3>
                        <p className="text-[10px] text-purple-600/70 mt-0.5">Focus areas to stand out</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {plan.recommendedFocus?.map((focus, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 bg-purple-50/30 border border-purple-100 rounded-xl">
                          <Star size={12} className="text-purple-500 mt-0.5 shrink-0" />
                          <span className="text-xs font-semibold text-purple-855 leading-relaxed">{focus}</span>
                        </div>
                      )) || <p className="text-xs text-neutral-450 italic">None identified</p>}
                    </div>
                  </div>
                </div>

                {/* Risk Alerts */}
                <div className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-red-300 transition-all duration-200">
                  <div className="h-1.5 bg-gradient-to-r from-red-400 to-rose-500"></div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-650 flex items-center justify-center shrink-0">
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-red-805 uppercase tracking-widest">Risk Alerts</h3>
                        <p className="text-[10px] text-red-650/70 mt-0.5">Keep an eye on these pitfalls</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {plan.warnings?.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 bg-red-50/30 border border-red-100 rounded-xl">
                          <AlertTriangle size={12} className="text-red-505 mt-0.5 shrink-0" />
                          <span className="text-xs font-semibold text-red-855 leading-relaxed">{warning}</span>
                        </div>
                      )) || <p className="text-xs text-neutral-450 italic">None identified</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Task Marketplace */}
            {activeTaskPlanTab === 'marketplace' && (
              <TaskMarketplace 
                projectId={project._id}
                teamId={teamId}
                onRefreshProject={async () => {
                  try {
                    const res = await getProjectByTeam(teamId);
                    if (res.success && res.project) {
                      setProject(res.project);
                    }
                  } catch (err) {
                    console.error('Error refreshing project details:', err);
                  }
                }}
              />
            )}
          </div>
        );
      })()}

      {/* AI Mentor Chat View */}
      {view === 'mentor-chat' && project && (
        <div className="flex flex-col overflow-hidden bg-white border border-neutral-200 rounded-xl h-[550px] shadow-xs w-full">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-100 bg-white sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Cpu size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900 leading-tight">AI Mentor</h2>
                <p className="text-[10px] text-neutral-400 leading-none mt-0.5">
                  Ask questions about your project scope, risks, pitch, and execution.
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer border-0 bg-transparent"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          {/* Messages Window */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-neutral-50/50 min-h-0"
          >
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                <RefreshCw className="animate-spin text-brand-500 mb-2" size={20} />
                <span className="text-xs font-semibold">Loading conversation history...</span>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-4">
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                  <Cpu size={24} />
                </div>
                <h4 className="font-bold text-neutral-900 text-sm">Ask the AI Mentor anything</h4>
                <p className="text-xs text-neutral-500 max-w-[340px] leading-relaxed mt-1 mb-3 mx-auto">
                  The AI mentor is fully context-aware of your problem statement, deliverables, team profile, and review report.
                </p>
                <div className="text-[10px] text-neutral-400 font-medium italic">
                  Try clicking one of the suggested questions below to start.
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div 
                  key={msg._id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-3xs ${
                    msg.role === 'user' 
                      ? 'bg-neutral-900 text-white rounded-tr-xs' 
                      : 'bg-white border border-neutral-200/80 text-neutral-800 rounded-tl-xs'
                  }`}>
                    {msg.role === 'user' ? msg.message : renderMarkdown(msg.message)}
                    <div className={`text-[9px] mt-1.5 text-right ${msg.role === 'user' ? 'text-white/60' : 'text-neutral-400'}`}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Thinking / Typing indicator */}
            {chatLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white border border-neutral-200 text-neutral-800 p-3 rounded-2xl rounded-tl-xs text-xs flex items-center gap-2">
                  <RefreshCw className="animate-spin text-brand-500" size={12} />
                  <span className="font-semibold text-neutral-500">AI Mentor is drafting response...</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {chatError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs text-center">
                {chatError}
              </div>
            )}
          </div>

          {/* Quick Action Suggested Chips */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-neutral-200 bg-white shrink-0 scrollbar-none">
            {[
              'Why is my score low?',
              'How can we improve?',
              'What will judges like?',
              'Which feature should we prioritize?',
              'What should we remove?',
              'Can we finish on time?',
              'What should our demo flow be?',
              'What questions might judges ask?'
            ].map((suggested, idx) => (
              <button
                key={idx}
                type="button"
                disabled={chatLoading}
                onClick={() => handleSendChatMessage(suggested)}
                className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-full cursor-pointer transition-all shadow-3xs whitespace-nowrap"
              >
                {suggested}
              </button>
            ))}
          </div>

          {/* Text input area */}
          <div className="p-3 bg-white border-t border-neutral-200 flex gap-2 items-center sticky bottom-0 z-10 shrink-0">
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
              placeholder="Ask about your project..."
              className="flex-1 form-input"
              style={{ resize: 'none', maxHeight: '42px' }}
            />
            <button
              type="button"
              disabled={chatLoading || !chatInput.trim()}
              onClick={() => handleSendChatMessage()}
              className="btn-primary text-xs py-2 px-4 shadow-xs shrink-0 cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Tech Stack Consensus View */}
      {view === 'tech-stack' && project && (
        <TechStackConsensus 
          projectId={project._id} 
          onBack={() => {
            setView('dashboard');
            getProjectByTeam(teamId).then(res => {
              if (res.success && res.project) {
                setProject(res.project);
              }
            }).catch(err => console.error(err));
          }} 
        />
      )}

      {/* Prompt Create View */}
      {view === 'create-prompt' && (
        <div className="flex flex-col items-center text-center py-8 px-4 gap-4 w-full">
          <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shadow-xs">
            <FolderGit2 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">No Active Project</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
              Your team hasn't registered a project. Define your hackathon idea, select tracks, and manage development deliverables.
            </p>
          </div>
          <button 
            className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer" 
            onClick={enterCreateMode}
          >
            <Plus size={15} /> Define Team Project
          </button>
        </div>
      )}

      {/* Create / Edit Form View */}
      {(view === 'create' || view === 'edit') && (
        <form onSubmit={view === 'create' ? handleCreateProject : handleUpdateProject} className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-2 mb-2">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              {view === 'create' ? 'Define Hackathon Project' : 'Edit Project Details'}
            </span>
            <button 
              type="button" 
              onClick={() => setView(project ? 'dashboard' : 'create-prompt')}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer border-0 bg-transparent"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          {/* Project Name */}
          <div className="form-group">
            <label className="input-label">Project Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. HackBuddy Copilot" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          {/* Track and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="input-label">Track (e.g. AI/ML, Web3)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. AI/ML" 
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="input-label">Hackathon Duration (e.g. 24h, 3 days)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 36 hours" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          {/* Problem Statement */}
          <div className="form-group">
            <label className="input-label">Problem Statement *</label>
            <textarea 
              rows={3}
              className="form-input resize-none" 
              placeholder="Describe the problem your project is solving."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              required
            />
            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              Minimum 20 characters
            </span>
          </div>

          {/* Project Description */}
          <div className="form-group">
            <label className="input-label">Project Description</label>
            <textarea 
              rows={3}
              className="form-input resize-none" 
              placeholder="Provide a detailed description of your hackathon project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Status (Edit only) */}
          {view === 'edit' && (
            <div className="form-group">
              <label className="input-label">Project Status</label>
              <select
                className="form-input cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}

          {/* Dynamic Features Manager */}
          <div className="form-group">
            <label className="input-label">Configure Deliverables / Features</label>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col gap-3 mt-1">
              {/* Added Features Row */}
              <div className="flex flex-wrap gap-2">
                {features.length > 0 ? (
                  features.map((feature, index) => (
                    <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold rounded-lg hover:border-brand-200 transition-all">
                      <span className="max-w-[200px] truncate">{feature}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFeature(index)} 
                        className="p-0.5 text-brand-500 hover:text-red-650 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-neutral-400 italic font-semibold">No features defined yet. Add features below.</span>
                )}
              </div>

              {/* Input Feature Row */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="form-input flex-1" 
                  placeholder="e.g. Build backend API auth gateway"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature(e);
                    }
                  }}
                />
                <button 
                  type="button" 
                  onClick={handleAddFeature}
                  className="btn-secondary text-xs px-3 cursor-pointer"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
            disabled={actionLoading}
          >
            <Save size={15} /> {view === 'create' ? 'Create Project Profile' : 'Save Modifications'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ProjectHub;
