import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { 
  Users, LogIn, Plus, X, MessageSquare, Activity, Crown, Clock, Target, Check, AlertCircle, RefreshCw, Send, Settings, User, UserCheck, UserX, Landmark,
  Cat, Dog, Ghost, Bot, Skull, Lock,
  BookOpen, Library, Coffee, Brain, ShieldHalf, Swords, Flame, Sparkles, Castle, Mountain
} from 'lucide-react';
import { AppState, Team, TeamMessage, TeamEvent, TeamMember, TeamSettingProposal } from '../../types';
import { cn, getTitleForLevel } from '../../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ProfileModal } from '../settings/ProfileModal';
import { ConfirmModal } from '../modals/ConfirmModal';

interface TeamModuleProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const renderAvatar = (avatarValue: string | undefined, size: number = 14) => {
  if (!avatarValue) {
    return <User size={size} className="text-slate-500 m-auto" />;
  }
  const icons: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
    User, Cat, Dog, Ghost, Bot, Skull
  };
  
  // Normalize string for safety
  const safeAvatarValue = avatarValue.charAt(0).toUpperCase() + avatarValue.slice(1).toLowerCase();
  
  const IconComponent = icons[safeAvatarValue] || icons[avatarValue];
  if (IconComponent) {
    return <IconComponent size={size} className="text-indigo-400 m-auto drop-shadow-md" />;
  }
  if (avatarValue.startsWith('http') || avatarValue.startsWith('data:')) {
    return <img src={avatarValue} className="w-full h-full object-cover rounded-full" alt="" />;
  }
  return <User size={size} className="text-slate-500 m-auto" />;
};

export const GUILD_ICONS = [
  { id: 'book', icon: BookOpen },
  { id: 'library', icon: Library },
  { id: 'coffee', icon: Coffee },
  { id: 'brain', icon: Brain },
  { id: 'shield', icon: ShieldHalf },
  { id: 'swords', icon: Swords },
  { id: 'target', icon: Target },
  { id: 'crown', icon: Crown },
  { id: 'flame', icon: Flame },
  { id: 'sparkles', icon: Sparkles },
  { id: 'castle', icon: Castle },
  { id: 'mountain', icon: Mountain },
];

export const renderGuildIcon = (iconId: string | undefined, size: number = 24, className?: string) => {
  const match = GUILD_ICONS.find(i => i.id === iconId);
  if (match) {
    const Icon = match.icon;
    return <Icon size={size} className={className || "text-indigo-400"} />;
  }
  return <Landmark size={size} className={className || "text-indigo-400"} />;
};

export function getTeamCycleState(team: Team) {
  let cycleProgress = 0;
  let memberProgress: Record<string, number> = {};

  if (team.config.targetType === 'total_time' || !team.config.targetType) {
    cycleProgress = team.members.reduce((acc, m) => acc + (m.totalFocusTime || 0), 0);
    team.members.forEach(m => memberProgress[m.userId] = (m.totalFocusTime || 0));
  } else {
    const now = new Date();
    const resetHour = parseInt(team.config.resetTime?.split(':')[0] || '0');
    let start = new Date(now);
    start.setHours(resetHour, 0, 0, 0);
    if (now.getHours() < resetHour) start.setDate(start.getDate() - 1);
    
    if (team.config.targetType === 'weekly_time') {
      const day = start.getDay();
      start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
    } else if (team.config.targetType === 'monthly_time') {
      start.setDate(1);
    } else if (team.config.targetType === 'yearly_time') {
      start.setMonth(0, 1);
    }
    const currentCycleStart = start.getTime();

    cycleProgress = team.members.reduce((acc, m) => {
      let mProg = 0;
      if (m.cycleTargetType === team.config.targetType && m.cycleStart === currentCycleStart && m.cycleFocusTime) {
        mProg = m.cycleFocusTime;
      }
      memberProgress[m.userId] = mProg;
      return acc + mProg;
    }, 0);
  }

  return { cycleProgress, memberProgress };
}

export const TeamModule: React.FC<TeamModuleProps> = ({ state, setState }) => {
  const [view, setView] = useState<'lobby' | 'team'>(state.teamId ? 'team' : 'lobby');
  const [lobbyTeams, setLobbyTeams] = useState<any[]>([]);
  const [team, setTeam] = useState<Team | null>(state.lastTeamData?.team || null);
  const [messages, setMessages] = useState<TeamMessage[]>(state.lastTeamData?.messages || []);
  const [events, setEvents] = useState<TeamEvent[]>(state.lastTeamData?.events || []);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'events'>('chat');
  const [chatInput, setChatInput] = useState('');
  
  // Create / Settings Modal
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [showJoin, setShowJoin] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [showPlazaModal, setShowPlazaModal] = useState(false);
  const [showDetailedGoal, setShowDetailedGoal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    isAlert?: boolean;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const customAlert = (message: string, title = 'Notification') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      isAlert: true,
      type: 'info'
    });
  };

  const customConfirm = (message: string, onConfirm: () => void, title = 'Confirm', type: 'danger' | 'warning' | 'info' = 'warning', confirmText = 'Confirm') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      isAlert: false,
      type,
      confirmText,
      onConfirm
    });
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setUnlockError('');
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlockPassword })
      });
      if (!res.ok) {
        setUnlockError('Invalid password');
        setIsUnlocking(false);
        return;
      }
    } catch (err) {
      setUnlockError('Verification failed');
      setIsUnlocking(false);
      return;
    }

    setIsUnlocking(false);
    setUnlockPassword('');
    setState(s => ({ ...s, isRedisUnlocked: true }));
    setShowUnlockModal(false);
    setShowCreate(true);
  };

  const fetchLobby = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        if (data.teams) setLobbyTeams(data.teams);
      }
    } catch (e) {
      // transient network error, ignore
    }
    setLoading(false);
  };

  const fetchTeam = async () => {
    if (!state.teamId) return;
    try {
      const res = await fetch(`/api/teams?id=${state.teamId}`, {
        headers: {
          'x-secret-code': state.secretCode || '',
          'x-user-name': encodeURIComponent(state.userName || 'Scholar'),
          'x-user-avatar': state.userAvatar || 'User',
          'x-user-bio': encodeURIComponent(state.userBio || ''),
          'x-user-title': encodeURIComponent(state.userTitle || getTitleForLevel(state.level || 1)),
          'x-user-level': String(state.level || 1),
          'x-user-unique-id': state.userUniqueId || ''
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.team) {
        setTeam(data.team);
        setMessages(data.messages || []);
        setEvents(data.events || []);
        setView('team');
        setState(s => ({ ...s, lastTeamData: { team: data.team, messages: data.messages, events: data.events } }));
      } else {
        setState(s => ({ ...s, teamId: undefined }));
        setView('lobby');
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (state.teamId) {
      fetchTeam();
      const interval = setInterval(fetchTeam, 10000); // Poll every 10s
      return () => clearInterval(interval);
    } else {
      setView('lobby');
      fetchLobby();
    }
  }, [state.teamId]);

  const getOrGenerateIdentity = () => {
    if (state.secretCode) return state.secretCode;
    let newCode;
    try {
      newCode = crypto.randomUUID();
    } catch (e) {
      newCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    setState(s => ({ ...s, secretCode: newCode }));
    return newCode;
  };

  const joinTeam = async (id: string) => {
    const identityCode = getOrGenerateIdentity();
    setLoading(true);
    try {
      const res = await fetch('/api/teams?action=join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: id, 
          secretCode: identityCode,
          userName: state.userName || 'Scholar',
          userUniqueId: state.userUniqueId || '',
          userAvatar: state.userAvatar || 'User',
          userBio: state.userBio,
          userTitle: state.userTitle,
          userLevel: state.level || 1
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.pendingApproval) {
          customAlert("Your application request has been submitted to the team captain for approval.", "Application Sent");
        } else {
          setState(s => ({ ...s, teamId: id }));
        }
      } else {
        customAlert(data.error || 'Failed to join', "Error Joining Guild");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleApplicant = async (applicantId: string, accept: boolean) => {
    const identityCode = getOrGenerateIdentity();
    if (!state.teamId) return;
    try {
      const res = await fetch('/api/teams?action=handle_applicant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: state.teamId,
          secretCode: identityCode,
          userName: state.userName || 'Scholar',
          userUniqueId: state.userUniqueId || '',
          applicantId,
          accept
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchTeam();
      } else {
        customAlert(data.error || 'Failed to handle request', "Error");
      }
    } catch (e) {
      console.error(e);
    }
  };


  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const sendMessage = async () => {
    const identityCode = getOrGenerateIdentity();
    if (!chatInput.trim() || !state.teamId || isSendingMessage) return;
    const msg = chatInput.trim();
    setChatInput('');
    setIsSendingMessage(true);
    
    const fakeId = "temp-" + Date.now();
    // Optimistic UI update
    const fakeMessage: TeamMessage = {
      id: fakeId,
      userId: team?.myUserId || identityCode,
      name: state.userName || 'Scholar',
      avatar: state.userAvatar || 'User',
      content: msg,
      timestamp: Date.now()
    };
    setMessages(prev => [fakeMessage, ...prev]);

    try {
      const res = await fetch('/api/teams?action=message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: state.teamId, 
          secretCode: identityCode,
          userName: state.userName || 'Scholar',
          userUniqueId: state.userUniqueId || '',
          userAvatar: state.userAvatar || 'User',
          userBio: state.userBio,
          userTitle: state.userTitle,
          userLevel: state.level || 1,
          content: msg
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send');
      }
      // Replace fake message with actual message returned from server
      if (data.message) {
        setMessages(prev => prev.map(m => m.id === fakeId ? data.message : m));
      } else {
        await fetchTeam();
      }
    } catch (e: any) {
      console.error(e);
      // Revert optimistic message
      setMessages(prev => prev.filter(m => m.id !== fakeId));
      setChatInput(msg); // restore input
      customAlert(e.message || "Message failed to send. Please try again.", "Send Failed");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const proposeSettings = async (cfg: any) => {
    const identityCode = getOrGenerateIdentity();
    if (!state.teamId) return;
    try {
      const res = await fetch('/api/teams?action=settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: state.teamId, 
          secretCode: identityCode,
          userName: state.userName || 'Scholar',
          userUniqueId: state.userUniqueId || '',
          ...cfg
        })
      });
      const data = await res.json();
      if (!data.success) customAlert(data.error || 'Failed to update settings', 'Settings Error');
      setShowSettings(false);
      fetchTeam();
    } catch (e) {
      console.error(e);
    }
  };

  const voteProposal = async (accept: boolean) => {
     const identityCode = getOrGenerateIdentity();
     if (!state.teamId) return;
     try {
       await fetch('/api/teams?action=vote', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           teamId: state.teamId, 
           secretCode: identityCode, 
           userName: state.userName || 'Scholar',
           userUniqueId: state.userUniqueId || '',
           accept 
         })
       });
       fetchTeam();
     } catch (e) {
       console.error(e);
     }
  };

  const renderLobby = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
        <button
          onClick={() => setShowPlazaModal(true)}
          className="w-full sm:w-auto px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/20 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
          id="btn-plaza-tab"
        >
          <Landmark size={14} /> Plaza
        </button>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowJoin(true)}
            className="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <LogIn size={14} /> Join Guild
          </button>
          <button 
            onClick={() => {
              if (!state.isRedisUnlocked) {
                setShowUnlockModal(true);
              } else {
                setShowCreate(true);
              }
            }}
            className="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Create Guild
          </button>
        </div>
      </div>

      {loading && lobbyTeams.length === 0 ? (
        <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-indigo-500" /></div>
      ) : lobbyTeams.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-slate-700/50 rounded-2xl text-slate-500">
          No public guilds available. Be the first to create one!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lobbyTeams.map(t => (
            <div key={t.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between group hover:border-indigo-500/30 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl inline-flex">{renderGuildIcon(t.avatar, 20)}</span>
                  <h4 className="text-white font-bold text-lg">{t.name}</h4>
                </div>
                <p className="text-slate-400 text-xs line-clamp-2">{t.description || 'No description'}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Users size={12} /> {t.memberCount} Members
                </span>
                <button 
                  onClick={() => joinTeam(t.id)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-bold transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProposal = () => {
    if (!team?.currentProposal || team.currentProposal.status !== 'pending') return null;
    
    // Check if I have voted. Need my user ID. Let's just assume we don't have user ID in state, so we hash secretCode?
    // We can just try to vote, backend will block if already voted. Actually we can check UI if we want.
    // For simplicity, just show the banner.
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div>
          <h4 className="text-amber-400 font-bold text-sm flex items-center gap-2 mb-1">
            <AlertCircle size={16} /> Pending Team Goal Change
          </h4>
          <p className="text-xs text-amber-500/80">
            A member proposed changing the goal to {team.currentProposal.targetValue}m ({team.currentProposal.targetType}). Reward: {team.currentProposal.rewardContent}. Waiting for unanimous vote.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => voteProposal(true)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-colors">
            Accept
          </button>
          <button onClick={() => voteProposal(false)} className="px-3 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg text-xs font-bold transition-colors">
            Reject
          </button>
        </div>
      </div>
    );
  };

  const renderTeamDashboard = () => {
    if (!team) return (
      <div className="flex flex-col h-[500px] items-center justify-center text-slate-500">
         <RefreshCw className="animate-spin mb-4" size={24} />
         <p className="text-sm font-bold animate-pulse">Summoning Guild Data...</p>
      </div>
    );
    
    // Calc total progress
    const { cycleProgress: totalProgress } = getTeamCycleState(team);
    const target = team.config.targetValue;
    const isCompleted = target > 0 && totalProgress >= target;
    const isCaptain = team.members.find(x => x.userId === team.myUserId)?.isCaptain;

    return (
      <div className="flex flex-col lg:h-[550px] min-h-[500px] h-auto">
        {renderProposal()}
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4 max-w-full truncate">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-2xl">
              {renderGuildIcon((team as any).avatar, 28)}
            </div>
            <div className="truncate max-w-full">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1 truncate pr-2">{team.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 md:line-clamp-1 pr-1">{team.description}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              onClick={() => setShowPlazaModal(true)}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/20 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              title="Sanctum Plaza"
            >
              <Landmark size={14} /> <span>Plaza</span>
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-colors">
              <Settings size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
          {/* Left: Progress & Members */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar pr-2">
            <div 
              onClick={() => setShowDetailedGoal(true)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center cursor-pointer group hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-indigo-500/5 transition-opacity transition-opacity" />
              {isCompleted && <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full pointer-events-none" />}
              
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5 relative z-10">
                <Target size={12} className={isCompleted ? "text-indigo-500" : "text-indigo-400"} />
                Team Goal ({{'daily_time': 'Daily', 'weekly_time': 'Weekly', 'monthly_time': 'Monthly', 'yearly_time': 'Yearly', 'total_time': 'Total'}[team.config.targetType] || 'Total'})
              </div>
              
              {team.config.targetType !== 'total_time' && (
                <div className="inline-flex justify-center items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-slate-950 border border-slate-800 shadow-sm relative z-10">
                  <Clock size={10} className="text-indigo-400" />
                  <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest whitespace-nowrap">
                    CYCLE: {(() => {
                      const now = new Date();
                      const resetHour = parseInt(team.config.resetTime?.split(':')[0] || '0');
                      let start = new Date(now);
                      start.setHours(resetHour, 0, 0, 0);
                      if (now.getHours() < resetHour) start.setDate(start.getDate() - 1);
                      let end = new Date(start);
                      
                      if (team.config.targetType === 'weekly_time') {
                        const day = start.getDay();
                        start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                        end = new Date(start);
                        end.setDate(end.getDate() + 7);
                      } else if (team.config.targetType === 'monthly_time') {
                        start.setDate(1);
                        end = new Date(start);
                        end.setMonth(end.getMonth() + 1);
                      } else if (team.config.targetType === 'yearly_time') {
                        start.setMonth(0, 1);
                        end = new Date(start);
                        end.setFullYear(end.getFullYear() + 1);
                      } else {
                        end.setDate(end.getDate() + 1);
                      }
                      
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      return `${pad(start.getMonth()+1)}/${pad(start.getDate())} ${pad(start.getHours())}:00 — ${pad(end.getMonth()+1)}/${pad(end.getDate())} ${pad(end.getHours())}:00`;
                    })()}
                  </span>
                </div>
              )}
              
              <div className="flex justify-center items-end gap-1 mb-3 relative z-10">
                <span className={cn("text-4xl font-black tabular-nums tracking-tighter leading-none transition-colors", isCompleted ? "text-indigo-500 drop-shadow-sm" : "text-white")}>
                  {totalProgress}
                </span>
                <span className="text-sm font-bold text-slate-500 mb-1">/ {target} <span className="text-[10px] uppercase">min</span></span>
              </div>
              
              <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative z-10 shadow-inner">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${Math.min(100, (totalProgress / Math.max(1, target)) * 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_ease-in-out_infinite]" />
                </div>
              </div>
              
              <div className="mt-3 flex justify-center items-center gap-2 relative z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {Math.round(Math.min(100, (totalProgress / Math.max(1, target)) * 100))}% Completed
                </span>
                {isCompleted && <div className="text-[9px] font-black text-white-pure bg-indigo-500 px-2 py-0.5 rounded-sm uppercase tracking-widest flex items-center gap-1 shadow-sm"><Check size={10} /> Victory</div>}
              </div>
              
              {team.config.rewardContent && (
                <div className="mt-5 pt-4 border-t border-slate-800/50 flex flex-col items-center justify-center gap-1.5 relative z-10">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
                    <Crown size={12} className="text-indigo-400" /> Vault Reward
                  </div>
                  <div className="text-xs font-bold text-indigo-300 w-full px-2 text-center leading-relaxed break-words line-clamp-2">
                    {team.config.rewardContent}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 min-h-[220px] lg:min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Members ({team.members.length})</div>

              <div className="space-y-3">
                {[...team.members].sort((a,b) => (b.level||1) - (a.level||1)).map(m => {
                  const isOnline = m.lastActive && (Date.now() - m.lastActive < 5 * 60 * 1000);
                  return (
                  <div 
                    key={m.userId} 
                    className="flex justify-between items-center group cursor-pointer hover:bg-slate-900/50 p-1.5 -mx-1.5 rounded-lg transition-colors"
                    onClick={() => setViewingProfile(m.userId)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden text-lg">
                          {renderAvatar(m.avatar, 14)}
                        </div>
                        {isOnline ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-950 shadow-[0_0_5px_rgba(16,185,129,0.5)] z-10" />
                        ) : null}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                          {m.name} {m.isCaptain && <Crown size={12} className="text-amber-500" />}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {m.uniqueId && <span className="font-mono text-[9px] text-indigo-400/80 font-semibold">#{m.uniqueId.startsWith('SD-') ? m.uniqueId.replace('SD-', 'ID-') : m.uniqueId}</span>}
                          <span className="text-[10px] text-slate-500">{m.totalFocusTime}m focus</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Lv. {m.level || 1}</span>
                      {isCaptain && m.userId !== team.myUserId && (
                        <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              customConfirm("Are you sure you want to banish this member from the guild? Their stats will immediately be removed from today's Goal statistics.", async () => {
                                 const identityCode = state.secretCode || getOrGenerateIdentity();
                                 await fetch('/api/teams?action=kick', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      teamId: team.id, 
                                      secretCode: identityCode, 
                                      userName: state.userName || 'Scholar',
                                      userUniqueId: state.userUniqueId || '',
                                      targetMemberId: m.userId 
                                    })
                                 });
                                 fetchTeam();
                              }, "Banish Member", "danger", "Banish");
                           }}
                           className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-md transition-all sm:opacity-50 sm:group-hover:opacity-100 opacity-100 flex"
                           title="Kick out of Fellowship"
                        >
                           <UserX size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )})}
              </div>

              {isCaptain && (team as any).applicants && (team as any).applicants.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-sans">
                    <UserCheck size={12} /> Pending Applicants ({(team as any).applicants.length})
                  </div>
                  <div className="space-y-3">
                    {((team as any).applicants || []).map((app: any) => (
                      <div key={app.userId} className="bg-indigo-950/10 border border-indigo-500/10 p-2.5 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                              {renderAvatar(app.avatar, 12)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white leading-tight">{app.name}</span>
                              <span className="text-[9px] text-slate-500">Lv.{app.level || 1} {app.title || "Wandering Scholar"}</span>
                            </div>
                          </div>
                        </div>
                        {app.bio && (
                          <p className="text-[10px] text-slate-400 italic bg-slate-900/40 p-1.5 rounded-lg border border-slate-900/60 break-words">
                            "{app.bio}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={() => handleApplicant(app.userId, true)}
                            className="flex-1 py-1.5 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-400 font-bold text-[10px] rounded-lg transition-colors border border-indigo-500/20 font-sans"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleApplicant(app.userId, false)}
                            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-[10px] rounded-lg transition-colors border border-slate-800/80 font-sans"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right: Board */}
          <div className="w-full lg:w-2/3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col h-[450px] sm:h-[500px] lg:h-auto lg:flex-1 shrink-0 lg:shrink">
            <div className="flex border-b border-slate-800 p-1">
              <button 
                onClick={() => setActiveTab('chat')} 
                className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-colors", activeTab === 'chat' ? "bg-slate-800 text-white" : "text-slate-500")}
              >
                Message Board
              </button>
              <button 
                onClick={() => setActiveTab('events')} 
                className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-colors", activeTab === 'events' ? "bg-slate-800 text-white" : "text-slate-500")}
              >
                Event Log
              </button>
            </div>
            
            {activeTab === 'chat' && team.currentProposal && (
               <div className="p-4 border-b border-slate-800 bg-indigo-950/20 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                     <div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Target size={12}/> Proposal Pending</div>
                        <div className="text-sm text-slate-300 flex items-center gap-2">
                           <span className="font-bold text-white">Target:</span> {team.currentProposal.targetValue} min <span className="text-slate-600">•</span>
                           <span className="font-bold text-white">Reward:</span> {team.currentProposal.rewardContent}
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-2">
                        {team.currentProposal.votes[team.myUserId || ''] === undefined ? (
                           <div className="flex gap-2">
                             <button onClick={() => voteProposal(true)} className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl hover:bg-emerald-500/20 transition-colors uppercase tracking-widest">Accept</button>
                             <button onClick={() => voteProposal(false)} className="px-4 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl hover:bg-rose-500/20 transition-colors uppercase tracking-widest">Reject</button>
                           </div>
                        ) : (
                           <span className="text-[10px] font-bold text-indigo-400 py-1.5 uppercase tracking-widest bg-indigo-500/10 px-3 rounded-xl border border-indigo-500/20">Voted Successfully</span>
                        )}
                     </div>
                  </div>
                  <div className="w-full bg-slate-900 border border-slate-800 h-2 mt-2 rounded-full overflow-hidden flex">
                     <div className="bg-amber-400 h-full transition-all" style={{ width: `${(Object.keys(team.currentProposal.votes).length / Math.max(1, team.members.length)) * 100}%` }} />
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 mt-1.5 text-right uppercase tracking-widest">
                     {Object.keys(team.currentProposal.votes).length} / {team.members.length} Voted
                  </div>
               </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col-reverse">
              {activeTab === 'chat' ? (
                <div className="space-y-4 flex flex-col justify-end">
                  {messages.slice().reverse().map(m => {
                    const isMe = m.userId === team?.myUserId;
                    const senderMember = team?.members?.find(member => member.userId === m.userId);
                    const rawId = senderMember?.uniqueId || (isMe ? state.userUniqueId : null);
                    const senderUniqueId = rawId ? (rawId.startsWith('SD-') ? rawId.replace('SD-', 'ID-') : rawId) : null;
                    return (
                      <div key={m.id} className={cn("flex flex-col w-full", isMe ? "items-end" : "items-start")}>
                        <div className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                          <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden shrink-0 translate-y-1 flex items-center justify-center">
                            {renderAvatar(m.avatar, 14)}
                          </div>
                          <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                            <div className={cn("flex items-center gap-2 mb-1", isMe ? "flex-row-reverse" : "flex-row")}>
                              <span className="text-xs font-bold text-slate-400">
                                {m.name} {senderUniqueId ? `(${senderUniqueId})` : ''}
                              </span>
                              <span className="text-[9px] text-slate-600">{new Date(m.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className={cn(
                              "text-sm p-3 rounded-2xl w-fit max-w-[280px] break-words",
                              isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-slate-800 text-slate-300 rounded-bl-none border border-slate-700/50"
                            )}>
                              {m.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && <div className="text-center text-slate-600 mt-auto mb-auto text-sm">No messages yet.</div>}
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((e, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", 
                        e.type === 'join' ? "bg-emerald-500/20 text-emerald-400" :
                        e.type === 'focus' ? "bg-indigo-500/20 text-indigo-400" :
                        "bg-amber-500/20 text-amber-400"
                      )}>
                        {e.type === 'focus' ? <Activity size={10} /> : e.type === 'join' ? <LogIn size={10} /> : <Target size={10} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-300">{e.content}</span>
                        <span className="text-[9px] text-slate-600">{new Date(e.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {activeTab === 'chat' && (
              <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isSendingMessage && sendMessage()}
                    placeholder="Message the guild..."
                    disabled={isSendingMessage}
                    className="w-full bg-slate-950 border border-slate-700 text-sm text-white rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={isSendingMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 p-1.5 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden group mb-6">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Users size={120} />
      </div>

      <div className="relative z-10">
        <h2 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-2 mb-6">
          <Users className="text-indigo-400" />
          Fellowship
        </h2>
        
        {view === 'lobby' ? renderLobby() : renderTeamDashboard()}
      </div>

      {showSettings && team && (
        <SettingsModal 
           team={team} 
           onClose={() => setShowSettings(false)} 
           onSave={proposeSettings} 
           isCaptain={team.members.find(x => x.userId === team.myUserId)?.isCaptain}
           onLeave={() => {
             const isCap = team.members.find(x => x.userId === team.myUserId)?.isCaptain;
             const msg = isCap 
               ? "Are you sure you want to disband this guild? This will remove all members."
               : "Are you sure you want to leave this guild?";
             const title = isCap ? "Disband Guild" : "Leave Guild";
             
             customConfirm(msg, async () => {
                const identityCode = getOrGenerateIdentity();
                await fetch('/api/teams?action=leave', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ teamId: team.id, secretCode: identityCode, userName: state.userName || 'Scholar', userUniqueId: state.userUniqueId || '' })
                });
                setState(s => ({ ...s, teamId: undefined }));
                setShowSettings(false);
             }, title, 'danger', isCap ? 'Disband' : 'Leave');
           }}
        />
      )}

      {showUnlockModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm border-0 m-0">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl overflow-hidden"
          >
            <button 
              onClick={() => {
                setShowUnlockModal(false);
                setUnlockPassword('');
                setUnlockError('');
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Unlock Guild Creation</h3>
              <p className="text-sm text-slate-400">Please enter the developer password to access guild creation tools.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm text-center tracking-widest"
                />
                {unlockError && <p className="text-red-400 text-xs text-center mt-1">{unlockError}</p>}
              </div>
              
              <button 
                onClick={handleUnlock}
                disabled={isUnlocking || !unlockPassword}
                className="w-full py-3 bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-xl hover:bg-indigo-500"
              >
                {isUnlocking ? 'Verifying...' : 'Unlock Features'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {showCreate && (
        <CreateTeamModal 
           onClose={() => setShowCreate(false)}
           onCreate={async (cfg: any) => {
             const identityCode = getOrGenerateIdentity();
             const res = await fetch('/api/teams?action=create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   name: cfg.name,
                   description: cfg.description,
                   avatar: cfg.avatar,
                   config: cfg.config,
                   secretCode: identityCode,
                   userName: state.userName || 'Scholar',
                   userUniqueId: state.userUniqueId || '',
                   userAvatar: state.userAvatar,
                   userBio: state.userBio,
                   userTitle: state.userTitle,
                   userLevel: state.level || 1
                })
             });
             const data = await res.json();
             if (data.success && data.teamId) {
               setState(s => ({...s, teamId: data.teamId}));
               setShowCreate(false);
             }
           }}
        />
      )}
      
      {showJoin && (
        <JoinTeamModal 
           onClose={() => setShowJoin(false)}
           onJoin={(id: string) => {
             joinTeam(id);
             setShowJoin(false);
           }}
        />
      )}
      
      {viewingProfile && team && (
        <TeamMemberProfileModal 
           member={team.members.find(m => m.userId === viewingProfile)!}
           onClose={() => setViewingProfile(null)}
           isCurrentUserCaptain={team.members.find(m => m.userId === team.myUserId || (!!m.uniqueId && !!state.userUniqueId && m.uniqueId === state.userUniqueId))?.isCaptain}
           isTargetSelf={viewingProfile === team.myUserId || (!!state.userUniqueId && team.members.find(m => m.userId === viewingProfile)?.uniqueId === state.userUniqueId)}
           onTransferCaptain={(targetId) => {
              customConfirm("Are you sure you want to transfer guild leadership? You will become a regular member.", async () => {
                 const identityCode = state.secretCode || getOrGenerateIdentity();
                 await fetch('/api/teams?action=transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      teamId: team.id, 
                      secretCode: identityCode, 
                      userName: state.userName || 'Scholar',
                      userUniqueId: state.userUniqueId || '',
                      targetMemberId: targetId 
                    })
                 });
                 setViewingProfile(null);
              }, "Transfer Leadership", "warning", "Transfer");
           }}
           onKickMember={(targetId) => {
              customConfirm("Are you sure you want to banish this member from the guild?", async () => {
                 const identityCode = state.secretCode || getOrGenerateIdentity();
                 await fetch('/api/teams?action=kick', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      teamId: team.id, 
                      secretCode: identityCode, 
                      userName: state.userName || 'Scholar',
                      userUniqueId: state.userUniqueId || '',
                      targetMemberId: targetId 
                    })
                 });
                 setViewingProfile(null);
                 // Optimistically UI update
                 fetchTeam();
              }, "Banish Member", "danger", "Banish");
           }}
           currentUserName={state.userName || 'Scholar'}
           onReclaimCaptain={(targetId) => {
              customConfirm("Are you sure this is your old account? Claiming it will restore your captaincy and delete the old duplicate entity.", async () => {
                 const identityCode = state.secretCode || getOrGenerateIdentity();
                 await fetch('/api/teams?action=reclaim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      teamId: team.id, 
                      secretCode: identityCode,
                      userName: state.userName || 'Scholar',
                      userUniqueId: state.userUniqueId || ''
                    })
                 });
                 setViewingProfile(null);
                 fetchTeam();
              }, "Reclaim Captain Account", "info", "Reclaim");
           }}
        />
      )}
      
      {showPlazaModal && (
        <PlazaModal onClose={() => setShowPlazaModal(false)} />
      )}
      
      {showDetailedGoal && team && (
         <DetailedGoalModal team={team} onClose={() => setShowDetailedGoal(false)} />
      )}

      {confirmDialog.isOpen && createPortal(
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 max-w-sm w-full relative">
             <h3 className={cn("text-xl font-black italic tracking-widest mb-2 uppercase", 
               confirmDialog.type === 'danger' ? "text-red-500" : 
               confirmDialog.type === 'info' ? "text-indigo-400" : "text-amber-500")}>
               {confirmDialog.title}
             </h3>
             <p className="text-slate-300 text-sm mb-8">{confirmDialog.message}</p>
             <div className="flex gap-4">
               {!confirmDialog.isAlert && (
                 <button 
                   onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                   className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors tracking-widest text-xs"
                 >
                   CANCEL
                 </button>
               )}
               <button 
                 onClick={() => {
                   setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                   if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                 }}
                 className={cn(
                   "flex-1 py-3 font-bold rounded-xl transition-colors tracking-widest text-xs uppercase",
                   confirmDialog.type === 'danger' ? "bg-red-600 hover:bg-red-500 text-white" :
                   confirmDialog.type === 'info' ? "bg-indigo-600 hover:bg-indigo-500 text-white" :
                   "bg-amber-600 hover:bg-amber-500 text-white"
                 )}
               >
                 {confirmDialog.isAlert ? "OK" : (confirmDialog.confirmText || 'CONFIRM')}
               </button>
             </div>
           </div>
         </div>,
         document.body
      )}
    </div>
  );
};

const CreateTeamModal = ({ onClose, onCreate }: any) => {
  const [cfg, setCfg] = useState({
     name: '',
     description: '',
     avatar: 'shield',
     config: {
        permission: 'captain_only',
        targetType: 'total_time',
        targetValue: 1000,
        rewardType: 'text',
        rewardContent: '',
        resetTime: '00:00'
     }
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!cfg.name.trim()) {
      setError('A guild must have a name.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onCreate(cfg);
    } catch (e: any) {
      setError(e.message || 'Failed to create guild. Please ensure Cloud Sync is enabled.');
    }
    setIsSubmitting(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] rounded-3xl p-6 sm:p-8 max-w-2xl w-full relative overflow-hidden my-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-slate-800/50 p-2 rounded-full z-20">
          <X size={20}/>
        </button>
        
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-14 h-14 bg-slate-950 text-indigo-400 flex items-center justify-center rounded-2xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] shrink-0">
            <Landmark size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Found a Guild</h3>
            <p className="text-xs text-slate-400 font-medium tracking-tight mt-0.5">Gather scholars under one banner and forge your legacy.</p>
          </div>
        </div>
         
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10">
          {/* Left Column: Identity */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Landmark size={16} className="text-indigo-400" /> Guild Identity
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Guild Icon</label>
                <div className="flex flex-wrap gap-2">
                  {GUILD_ICONS.map(iconConfig => (
                    <button 
                      key={iconConfig.id}
                      onClick={() => setCfg({...cfg, avatar: iconConfig.id})}
                      className={cn(
                        "w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all bg-slate-950 border",
                        cfg.avatar === iconConfig.id 
                          ? "border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] bg-indigo-500/10 scale-110 z-10" 
                          : "border-slate-800 hover:border-slate-600 hover:scale-105"
                      )}
                    >
                      {renderGuildIcon(iconConfig.id, 20)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-1 mb-1 block">Guild Name <span className="text-rose-500">*</span></label>
                <input type="text" value={cfg.name} onChange={e => setCfg({...cfg, name: e.target.value})}
                   placeholder="e.g. Knights of Knowledge"
                   className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 hover:border-slate-600 rounded-xl px-4 py-3 text-sm text-white transition-colors outline-none" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Guild Philosophy / Description</label>
                <textarea value={cfg.description} onChange={e => setCfg({...cfg, description: e.target.value})}
                   placeholder="What unites your members? Describe your shared purpose..."
                   className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 hover:border-slate-600 rounded-xl px-4 py-3 text-sm text-white min-h-[120px] transition-colors outline-none resize-none" />
              </div>
            </div>
          </div>

          {/* Right Column: Goal System */}
          <div className="space-y-6">
             <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
               <Target size={16} className="text-emerald-400" /> Goal Configuration
             </h4>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Target Rules</label>
                 <select 
                   value={cfg.config.targetType} 
                   onChange={e => setCfg({...cfg, config: {...cfg.config, targetType: e.target.value}})}
                   className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                 >
                   <option value="total_time">Cumulative Focus</option>
                   <option value="daily_time">Daily Routine</option>
                   <option value="weekly_time">Weekly Challenge</option>
                   <option value="monthly_time">Monthly Marathon</option>
                   <option value="yearly_time">Yearly Epic Goal</option>
                 </select>
               </div>
               
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Target Value</label>
                 <input type="number" value={cfg.config.targetValue} onChange={e => setCfg({...cfg, config: {...cfg.config, targetValue: parseInt(e.target.value) || 0}})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none tabular-nums" />
               </div>
             </div>

             {cfg.config.targetType !== 'total_time' && (
               <div className="pt-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block flex items-center gap-2"><Clock size={12} className="text-indigo-400" /> Goal Refresh Schedule</label>
                 <select 
                   value={cfg.config.resetTime || '00:00'} 
                   onChange={e => setCfg({...cfg, config: {...cfg.config, resetTime: e.target.value}})}
                   className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                 >
                   <option value="00:00">Midnight (00:00)</option>
                   <option value="03:00">Late Night (03:00 AM)</option>
                   <option value="04:00">Early Morning (04:00 AM)</option>
                   <option value="05:00">Dawn (05:00 AM)</option>
                   <option value="06:00">Morning (06:00 AM)</option>
                 </select>
               </div>
             )}

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Reward Base</label>
                 <select 
                   value={cfg.config.rewardType} 
                   onChange={e => setCfg({...cfg, config: {...cfg.config, rewardType: e.target.value}})}
                   className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                 >
                   <option value="text">Honor / Promise</option>
                   <option value="coins">Shared Gold</option>
                   <option value="xp">Shared XP</option>
                 </select>
               </div>
               
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Reward Detail</label>
                 <input type="text" value={cfg.config.rewardContent} onChange={e => setCfg({...cfg, config: {...cfg.config, rewardContent: e.target.value}})}
                    placeholder={cfg.config.rewardType === 'text' ? "e.g. Pizza Party" : "e.g. 500"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
               </div>
             </div>
             
             <div className="pt-2">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Goal Amendment Power</label>
               <select 
                 value={cfg.config.permission} 
                 onChange={e => setCfg({...cfg, config: {...cfg.config, permission: e.target.value}})}
                 className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
               >
                 <option value="captain_only">Captain's Decree (Captain Only)</option>
                 <option value="unanimous">Unanimous Concord (All members vote)</option>
               </select>
             </div>
          </div>
        </div>
        
        <div className="mt-10 relative z-10 flex gap-4 xl:w-1/2 xl:ml-auto">
          <button 
             onClick={onClose} 
             className="w-1/3 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors tracking-widest text-sm"
          >
            CANCEL
          </button>
          <button 
             onClick={handleSubmit} 
             disabled={!cfg.name.trim() || isSubmitting} 
             className={cn(
               "w-2/3 py-3.5 font-bold rounded-xl transition-all tracking-widest text-sm shadow-lg flex items-center justify-center gap-2",
               cfg.name.trim() && !isSubmitting ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 text-white" : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
             )}
          >
            {isSubmitting ? 'FORGING...' : 'ESTABLISH'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

const TeamMemberProfileModal = ({ member, onClose, isCurrentUserCaptain, isTargetSelf, onTransferCaptain, onKickMember, onReclaimCaptain, currentUserName }: { member: TeamMember, onClose: () => void, isCurrentUserCaptain?: boolean, isTargetSelf?: boolean, onTransferCaptain?: (targetId: string) => void, onKickMember?: (targetId: string) => void, onReclaimCaptain?: (targetId: string) => void, currentUserName?: string }) => {
  if (!member) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative overflow-hidden group">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-20"><X size={20}/></button>
        
        <div className="flex flex-col items-center relative z-10 text-center">
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-4xl mb-4 overflow-hidden relative">
            {renderAvatar(member.avatar, 40)}
          </div>
          
          <h2 className="text-2xl font-black text-white italic tracking-tight flex items-center justify-center gap-2">
            {member.name} {member.isCaptain && <span title="Captain"><Crown size={20} className="text-amber-500" /></span>}
          </h2>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center font-mono">
            <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Lv. {member.level || 1}
            </div>
            {member.uniqueId && (
              <div className="text-[11px] font-bold text-slate-400 bg-slate-500/10 px-3 py-1 rounded-full border border-slate-500/20 pr-1">
                #{member.uniqueId.startsWith('SD-') ? member.uniqueId.replace('SD-', 'ID-') : member.uniqueId}
              </div>
            )}
            <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 pr-1">
              {member.title || "Wandering Scholar"}
            </div>
          </div>
          
          <div className="my-6 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          
          <p className="text-sm text-slate-300 min-h-[60px] italic">
            {member.bio ? `"${member.bio}"` : '"This scholar walks the path of focus in silence."'}
          </p>
          
          <div className="w-full grid grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Focus</span>
              <span className="text-lg font-black text-white tabular-nums">{member.totalFocusTime} <span className="text-xs text-slate-500">min</span></span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Joined</span>
              <span className="text-sm font-bold text-white tabular-nums leading-loose">{new Date(member.joinedAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          {isCurrentUserCaptain && !isTargetSelf && (
            <div className="w-full flex gap-2 mt-6">
              {onTransferCaptain && (
                <button 
                  onClick={() => onTransferCaptain(member.userId)} 
                  className="flex-1 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl font-bold font-sans text-[10px] tracking-widest uppercase transition-colors"
                >
                  Transfer Captain
                </button>
              )}
              {onKickMember && (
                <button 
                  onClick={() => onKickMember(member.userId)} 
                  className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl font-bold font-sans text-[10px] tracking-widest uppercase transition-colors"
                >
                  Banish
                </button>
              )}
            </div>
          )}
          {!isCurrentUserCaptain && !isTargetSelf && member.isCaptain && member.name === (currentUserName || 'Scholar') && onReclaimCaptain && (
             <div className="w-full mt-6 flex flex-col gap-2">
               <button 
                 onClick={() => onReclaimCaptain(member.userId)}
                 className="w-full py-3 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500 hover:text-white text-cyan-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
               >
                 Reclaim Captain Account
               </button>
               <span className="text-[10px] text-slate-500 leading-tight">If you lost your old cache but your name matches the captain perfectly, you can reclaim it.</span>
             </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const GoalDetailsModal = ({ team, onClose }: any) => {
  const target = team.config.targetValue;
  const { cycleProgress: totalProgress, memberProgress } = getTeamCycleState(team);
  const isCompleted = target > 0 && totalProgress >= target;
  const sortedMembers = [...team.members].sort((a,b) => (memberProgress[b.userId] || 0) - (memberProgress[a.userId] || 0));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full relative overflow-hidden shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-20"><X size={24}/></button>

        {isCompleted && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 blur-[100px] rounded-full" />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center">
          <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl", isCompleted ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50" : "bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500/50")}>
            <Target size={40} />
          </div>
          
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
             {{'daily_time': 'Daily Goal', 'weekly_time': 'Weekly Goal', 'monthly_time': 'Monthly Goal', 'yearly_time': 'Yearly Goal', 'total_time': 'Total Goal'}[team.config.targetType as string] || 'Total Goal'}
          </h2>
          <p className="text-sm text-slate-400 mb-8">{isCompleted ? 'The guild has triumphed over its target.' : 'Every minute of focus brings the guild closer.'}</p>

          <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 text-center relative overflow-hidden">
            <div className="flex justify-center items-end gap-2 mb-4">
              <span className={cn("text-6xl font-black tabular-nums tracking-tighter leading-none", isCompleted ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-white")}>
                {totalProgress}
              </span>
              <span className="text-xl font-bold text-slate-500 mb-2">/ {target} <span className="text-sm uppercase">min</span></span>
            </div>
            <div className="w-full h-5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div 
                className={cn("h-full transition-all duration-1000 ease-out relative", isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-purple-500")}
                style={{ width: `${Math.min(100, (totalProgress / Math.max(1, target)) * 100)}%` }}
              >
                 <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_ease-in-out_infinite]" />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
               <span>0%</span>
               <span>{Math.round(Math.min(100, (totalProgress / Math.max(1, target)) * 100))}%</span>
            </div>
          </div>

          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Top Contributors</span>
          </div>

          <div className="w-full space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2 mb-6">
            {sortedMembers.map((m: any, idx: number) => (
               <div key={m.userId} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-xl border border-slate-800/50">
                  <div className="w-6 text-center font-black text-slate-600 italic">#{idx + 1}</div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                    {renderAvatar(m.avatar, 14)}
                  </div>
                  <div className="flex-1 font-bold text-slate-300 text-sm truncate">{m.name}</div>
                  <div className="font-bold text-indigo-400 tabular-nums">{memberProgress[m.userId] || 0} <span className="text-[10px] text-slate-500">m</span></div>
               </div>
            ))}
          </div>
          
          {team.config.rewardContent && (
             <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-4">
               <div className="text-amber-500 mt-1"><Crown size={24} /></div>
               <div className="flex-1 text-left">
                 <div className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest mb-1">Guild Reward Unlocked</div>
                 <div className="text-sm font-bold text-amber-400">{team.config.rewardContent}</div>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const SettingsModal = ({ team, onClose, onSave, isCaptain, onLeave }: any) => {
  const [cfg, setCfg] = useState({ 
    name: team.name || '', 
    description: team.description || '', 
    avatar: team.avatar || '',
    ...team.config 
  });
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(team.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
       <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full relative my-auto">
         <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-800/50 p-2 rounded-full transition-colors z-20"><X size={20}/></button>
         
         <div className="flex items-center gap-4 mb-8">
           <div className="w-14 h-14 bg-slate-800 text-slate-300 flex items-center justify-center rounded-2xl border-2 border-slate-700 shrink-0">
             <Settings size={28} />
           </div>
           <div>
             <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Guild Settings</h3>
             <p className="text-sm text-slate-400 font-medium tracking-tight mt-1">Manage configuration, policy, and goals.</p>
           </div>
         </div>
         
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10">
           {/* Left Column: Identity & Access */}
           <div className="space-y-6">
             <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
               <Landmark size={16} className="text-indigo-400" /> Identity & Access
             </h4>
             
             <div className="space-y-4">
               {isCaptain && (
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Guild Icon</label>
                   <div className="flex flex-wrap gap-2">
                     {GUILD_ICONS.map(iconConfig => (
                       <button 
                         key={iconConfig.id}
                         onClick={() => setCfg({...cfg, avatar: iconConfig.id})}
                         className={cn(
                           "w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all bg-slate-950 border",
                           cfg.avatar === iconConfig.id 
                             ? "border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] bg-indigo-500/10 scale-110 z-10" 
                             : "border-slate-800 hover:border-slate-600 hover:scale-105"
                         )}
                       >
                         {renderGuildIcon(iconConfig.id, 20)}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
               {/* Guild Secret Key Section */}
               <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2">
                 <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-sans">Guild Secret ID / Invite Key</label>
                 <div className="flex items-center gap-2">
                   <span className="font-mono text-xs text-slate-300 select-all break-all bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800 flex-1">{team.id}</span>
                   <button 
                     onClick={handleCopy}
                     className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 border border-indigo-500/20 font-sans"
                   >
                     {copied ? "Copied!" : "Copy"}
                   </button>
                 </div>
                 <p className="text-[9px] text-slate-500">Share this unique ID with other scholars to invite them to this guild.</p>
               </div>

               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Guild Name</label>
                 <input type="text" value={cfg.name} onChange={e => setCfg({...cfg, name: e.target.value})}
                    disabled={!isCaptain}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none disabled:opacity-50" />
               </div>

               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Guild Description</label>
                 <textarea value={cfg.description} onChange={e => setCfg({...cfg, description: e.target.value})}
                    disabled={!isCaptain}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none min-h-[80px] resize-none disabled:opacity-50" />
               </div>

               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Joining Policy</label>
                 <select 
                   value={cfg.joinRule || 'direct'} 
                   onChange={e => setCfg({...cfg, joinRule: e.target.value})}
                   disabled={!isCaptain}
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                 >
                   <option value="direct">Direct Join (Open to anyone with the key)</option>
                   <option value="approval">Captain Approval Required</option>
                 </select>
               </div>
             </div>
           </div>

           {/* Right Column: Goals & Authority */}
           <div className="space-y-6">
             <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
               <Target size={16} className="text-emerald-400" /> Goal Configuration
             </h4>
             
             <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Goal Setting Authority</label>
                 <select 
                   value={cfg.permission} 
                   onChange={e => setCfg({...cfg, permission: e.target.value})}
                   disabled={!isCaptain}
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                 >
                   <option value="captain_only">Captain Only</option>
                   <option value="unanimous">Unanimous Vote Required</option>
                 </select>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Target Horizon</label>
                   <select 
                     value={cfg.targetType} 
                     onChange={e => setCfg({...cfg, targetType: e.target.value})}
                     disabled={!isCaptain && team.config.permission !== 'unanimous'}
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                   >
                     <option value="total_time">Guild Total Focus</option>
                     <option value="daily_time">Guild Daily Progress</option>
                     <option value="weekly_time">Guild Weekly Challenge</option>
                     <option value="monthly_time">Guild Monthly Marathon</option>
                     <option value="yearly_time">Guild Yearly Epic Goal</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Value (Minutes)</label>
                   <input type="number" value={cfg.targetValue} onChange={e => setCfg({...cfg, targetValue: parseInt(e.target.value) || 0})}
                      disabled={!isCaptain && team.config.permission !== 'unanimous'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none tabular-nums disabled:opacity-50" />
                 </div>
               </div>

               {cfg.targetType !== 'total_time' && (
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block flex items-center gap-2"><Clock size={12} className="text-indigo-400" /> Goal Refresh Schedule</label>
                   <select 
                     value={cfg.resetTime || '00:00'} 
                     onChange={e => setCfg({...cfg, resetTime: e.target.value})}
                     disabled={!isCaptain && team.config.permission !== 'unanimous'}
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                   >
                     <option value="00:00">Midnight (00:00) / End of Day</option>
                     <option value="03:00">Late Night (03:00 AM)</option>
                     <option value="04:00">Early Morning (04:00 AM)</option>
                     <option value="05:00">Dawn (05:00 AM)</option>
                     <option value="06:00">Morning (06:00 AM)</option>
                   </select>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Reward Type</label>
                   <select 
                     value={cfg.rewardType || 'text'} 
                     onChange={e => setCfg({...cfg, rewardType: e.target.value})}
                     disabled={!isCaptain && team.config.permission !== 'unanimous'}
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                   >
                     <option value="text">Text Only / Honor</option>
                     <option value="coins">Gold Coins</option>
                     <option value="xp">Experience (XP)</option>
                     <option value="item">Custom Item Data</option>
                   </select>
                 </div>

                 <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1 block">Reward Detail</label>
                   <input type="text" value={cfg.rewardContent} onChange={e => setCfg({...cfg, rewardContent: e.target.value})}
                      disabled={!isCaptain && team.config.permission !== 'unanimous'}
                      placeholder={cfg.rewardType === 'text' ? "e.g. Pizza Party" : "e.g. 500"}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50" />
                 </div>
               </div>
             </div>
           </div>
         </div>
         
         <div className="mt-10 flex flex-col xl:flex-row gap-4 items-center justify-between border-t border-slate-800 pt-6">
           <button 
             onClick={() => onLeave(isCaptain)}
             className="w-full xl:w-auto py-3 px-6 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl transition-colors border border-rose-500/20 flex items-center justify-center gap-2 font-sans tracking-widest uppercase"
           >
             <LogIn size={14} className="rotate-180" />
             {isCaptain ? "Disband Guild" : "Leave Guild"}
           </button>

           <div className="flex gap-4 w-full xl:w-auto">
             <button onClick={onClose} className="w-1/3 xl:w-auto xl:px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm tracking-widest overflow-hidden">
               {(!isCaptain && team.config.permission !== 'unanimous') ? "CLOSE" : "CANCEL"}
             </button>
             {(isCaptain || team.config.permission === 'unanimous') && (
               <button onClick={() => onSave(cfg)} className={cn(
                 "w-2/3 xl:w-auto xl:px-8 py-3 text-white font-bold rounded-xl transition-colors font-sans text-sm tracking-widest whitespace-nowrap shadow-lg",
                 isCaptain ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
               )}>
                 {isCaptain ? "SAVE ALL CHANGES" : "PROPOSE CHANGES"}
               </button>
             )}
           </div>
         </div>
       </div>
    </div>,
    document.body
  )
}

const JoinTeamModal = ({ onClose, onJoin }: any) => {
  const [inviteId, setInviteId] = useState('');

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border-2 border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] rounded-3xl p-8 max-w-sm w-full relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-2 rounded-full z-20">
          <X size={20}/>
        </button>
        
        <div className="flex flex-col items-center mb-6 relative z-10 text-center">
          <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 flex items-center justify-center rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/20 mb-4">
            <LogIn size={28} />
          </div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Join Guild</h3>
          <p className="text-xs text-slate-400 font-medium tracking-tight mt-1">Enter a Guild ID to join your fellowship.</p>
        </div>
         
        <div className="relative z-10">
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest pl-1 mb-1 block">Guild ID</label>
          <input 
             type="text" 
             value={inviteId} 
             onChange={e => setInviteId(e.target.value)}
             placeholder="e.g. 1234-abcd..."
             className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 hover:border-slate-600 rounded-xl px-4 py-3 text-sm text-center font-mono text-white transition-colors outline-none" 
             onKeyDown={(e) => {
                if(e.key === 'Enter' && inviteId.trim()) onJoin(inviteId.trim());
             }}
          />
        </div>
        
        <div className="mt-8 relative z-10 flex gap-3">
          <button 
             onClick={onClose} 
             className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors tracking-widest text-sm"
          >
            CANCEL
          </button>
          <button 
             onClick={() => onJoin(inviteId.trim())} 
             disabled={!inviteId.trim()} 
             className={cn(
               "w-1/2 py-3 font-bold rounded-xl transition-all tracking-widest text-sm shadow-lg",
               inviteId.trim() ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 text-white" : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
             )}
          >
            JOIN
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

const PlazaModal = ({ onClose }: { onClose: () => void }) => {
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full relative overflow-hidden shadow-2xl shadow-black/80"
      >
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-indigo-400">
          <Landmark size={80} />
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center relative z-10 py-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Landmark size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sanctum Plaza</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The Sanctum Plaza is currently under spiritual construction. A wider realm of shared guilds and achievements is on its way.
          </p>
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};


const DetailedGoalModal = ({ team, onClose }: { team: Team, onClose: () => void }) => {
  const { cycleProgress: totalProgress, memberProgress } = getTeamCycleState(team);
  const sortedMembers = [...team.members].sort((a,b) => (memberProgress[b.userId] || 0) - (memberProgress[a.userId] || 0));
  const target = team.config.targetValue;
  const isCompleted = target > 0 && totalProgress >= target;
  
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 max-w-2xl w-full relative overflow-hidden my-auto"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-slate-800/50 p-2 rounded-full z-20">
          <X size={20}/>
        </button>

        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center mb-8">
           <div className="w-16 h-16 bg-slate-950 text-indigo-500 flex items-center justify-center rounded-2xl border border-slate-800 shadow-sm mb-4">
             <Target size={32} />
           </div>
           <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2 pr-1.5">Guild Horizon</h2>
           <p className="text-sm text-slate-500 font-medium max-w-sm mb-4">
             The collective target for {(team.name).toUpperCase()}
           </p>
           {team.config.targetType !== 'total_time' && (
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800 shadow-sm">
               <Clock size={12} className="text-indigo-400" />
               <span className="text-[10px] sm:text-xs font-bold text-slate-400 font-mono tracking-widest whitespace-nowrap">
                 CYCLE: {(() => {
                   const now = new Date();
                   const resetHour = parseInt(team.config.resetTime?.split(':')[0] || '0');
                   let start = new Date(now);
                   start.setHours(resetHour, 0, 0, 0);
                   if (now.getHours() < resetHour) start.setDate(start.getDate() - 1);
                   let end = new Date(start);
                   
                   if (team.config.targetType === 'weekly_time') {
                     const day = start.getDay();
                     start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                     end = new Date(start);
                     end.setDate(end.getDate() + 7);
                   } else if (team.config.targetType === 'monthly_time') {
                     start.setDate(1);
                     end = new Date(start);
                     end.setMonth(end.getMonth() + 1);
                   } else if (team.config.targetType === 'yearly_time') {
                     start.setMonth(0, 1);
                     end = new Date(start);
                     end.setFullYear(end.getFullYear() + 1);
                   } else {
                     end.setDate(end.getDate() + 1);
                   }
                   
                   const pad = (n: number) => n.toString().padStart(2, '0');
                   return `${pad(start.getMonth()+1)}/${pad(start.getDate())} ${pad(start.getHours())}:00 — ${pad(end.getMonth()+1)}/${pad(end.getDate())} ${pad(end.getHours())}:00`;
                 })()}
               </span>
             </div>
           )}
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
            {isCompleted && (
               <div className="absolute inset-0 bg-indigo-500/5 mix-blend-screen pointer-events-none" />
            )}
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Progress Target</div>
            
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" className="stroke-slate-800" strokeWidth="10" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" 
                  className="stroke-indigo-500 transition-all duration-1000 ease-out drop-shadow-sm"
                  strokeWidth="10" 
                  strokeLinecap="round"
                  strokeDasharray="282.7" 
                  strokeDashoffset={282.7 - Math.min(282.7, (totalProgress / Math.max(1, target)) * 282.7)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                 <span className={cn("text-5xl font-black tracking-tighter leading-none mb-1", isCompleted ? "text-indigo-500" : "text-white")}>{Math.round(Math.min(100, (totalProgress / Math.max(1, target)) * 100))}%</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed</span>
              </div>
            </div>
            
            <div className="flex gap-8 w-full justify-center">
               <div className="text-center">
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Current</div>
                 <div className="text-xl font-black text-white tabular-nums">{totalProgress} <span className="text-[10px] text-slate-500">min</span></div>
               </div>
               <div className="w-px h-8 bg-slate-800 self-center" />
               <div className="text-center">
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Target</div>
                 <div className="text-xl font-black text-white tabular-nums">{target} <span className="text-[10px] text-slate-500">min</span></div>
               </div>
            </div>
            
            {isCompleted && (
              <div className="mt-6 absolute bottom-0 left-0 w-full bg-indigo-500 text-white-pure font-black italic tracking-widest uppercase text-xs py-2 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                 <Check size={16} /> Target Conquered
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center h-[180px] justify-center relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent transition-opacity transition-opacity pointer-events-none" />
               <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(99,102,241,0.15)] border border-indigo-500/20 relative z-10 shrink-0">
                 <Crown size={24} />
               </div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10 shrink-0">Guild Vault Reward</div>
               <div className="text-sm font-bold text-indigo-300 w-full px-2 relative z-10 leading-relaxed break-words line-clamp-3">
                 {team.config.rewardContent || "No specific reward assigned."}
               </div>
            </div>
            
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 flex-1 flex flex-col">
               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Top Contributors</div>
               <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                 {sortedMembers.slice(0, 3).map((m, idx) => (
                    <div key={m.userId} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
                       <div className="flex items-center gap-2">
                         <div className={cn(
                           "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0",
                           idx === 0 ? "bg-indigo-500 border-indigo-400 text-white-pure border" : 
                           "bg-slate-800 text-slate-500 border border-slate-700"
                         )}>
                           #{idx + 1}
                         </div>
                         <div className="text-xs font-bold text-white clamp-1 truncate max-w-[80px]">{m.name}</div>
                       </div>
                       <div className="text-xs font-black text-indigo-500 tabular-nums shrink-0">{memberProgress[m.userId] || 0} <span className="text-[9px] text-slate-500">m</span></div>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

      </motion.div>
    </div>,
    document.body
  );
};