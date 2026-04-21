import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, RefreshCw, LogOut, Loader2, Send, Wand2, CheckCircle,
  Tag, Settings,
  Inbox, Edit3, Save, Link, Wifi
} from 'lucide-react';
import { User, Message } from './types';
import {
  syncGmail, getMessages, connectGmail, classifyMessage,
  generateDraft, updateDraft, sendDraft, logout
} from './api/client';
import { usePolling } from './hooks/usePolling';

interface Props {
  user: User;
  onLogout: () => void;
}

const PERSONAS = [
  { id: 'formal',    label: 'Formal Pro',      color: 'blue' },
  { id: 'support',   label: 'Friendly Support', color: 'emerald' },
  { id: 'closer',    label: 'Sales Closer',     color: 'violet' },
  { id: 'tech',      label: 'Tech Support',     color: 'cyan' },
  { id: 'executive', label: 'Executive',         color: 'amber' },
];

const URGENCY_COLORS: Record<string, string> = {
  high:   'text-rose-400 bg-rose-400/10 border-rose-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  low:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

const CATEGORY_COLORS: Record<string, string> = {
  sales:   'text-violet-400 bg-violet-400/10',
  support: 'text-blue-400 bg-blue-400/10',
  billing: 'text-amber-400 bg-amber-400/10',
  spam:    'text-slate-400 bg-slate-400/10',
  general: 'text-slate-300 bg-slate-700/50',
};

export default function MainDashboard({ user, onLogout }: Props) {
  const [messages, setMessages]             = useState<Message[]>([]);
  const [selected, setSelected]             = useState<Message | null>(null);
  const [syncing, setSyncing]               = useState(false);
  const [classifying, setClassifying]       = useState<string | null>(null);
  const [drafting, setDrafting]             = useState<string | null>(null);
  const [sending, setSending]               = useState<string | null>(null);
  const [editingDraft, setEditingDraft]     = useState<string>('');
  const [isEditing, setIsEditing]           = useState(false);
  const [selectedPersona, setPersona]       = useState('formal');
  const [tab, setTab]                       = useState<'inbox' | 'settings'>('inbox');
  const [notification, setNotif]            = useState<string | null>(null);
  const [gmailConnecting, setGmailConnect]  = useState(false);

  const notify = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await getMessages(50, 0);
      const msgs: Message[] = res.data.data.messages;
      setMessages(msgs);
      if (selected) {
        const updated = msgs.find(m => m.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch {/* silent */}
  }, [selected]);

  usePolling(fetchMessages, 15000, tab === 'inbox');

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncGmail();
      notify(`✓ Synced ${res.data.data.synced} messages`);
      await fetchMessages();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      notify(`✗ Sync failed: ${e.response?.data?.error ?? 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectGmail = async () => {
    setGmailConnect(true);
    try {
      const res = await connectGmail();
      const { url } = res.data.data;
      const popup = window.open(url, '_blank', 'width=600,height=700');
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'GMAIL_AUTH_SUCCESS') {
          notify(`✓ Gmail connected: ${e.data.email}`);
          popup?.close();
        }
      }, { once: true });
    } catch {
      notify('✗ Could not get Gmail auth URL');
    } finally {
      setGmailConnect(false);
    }
  };

  const handleClassify = async (msg: Message) => {
    setClassifying(msg.id);
    try {
      await classifyMessage(msg.id);
      await fetchMessages();
      notify('✓ Email classified');
    } catch {
      notify('✗ Classification failed');
    } finally {
      setClassifying(null);
    }
  };

  const handleDraft = async (msg: Message) => {
    setDrafting(msg.id);
    try {
      await generateDraft(msg.id, selectedPersona);
      await fetchMessages();
      notify('✓ Draft generated');
    } catch {
      notify('✗ Draft generation failed');
    } finally {
      setDrafting(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!selected?.draft_id) return;
    try {
      await updateDraft(selected.draft_id, { draft_text: editingDraft });
      await fetchMessages();
      setIsEditing(false);
      notify('✓ Draft saved');
    } catch {
      notify('✗ Save failed');
    }
  };

  const handleSend = async (msg: Message) => {
    if (!msg.draft_id) return;
    setSending(msg.id);
    try {
      await sendDraft(msg.draft_id);
      await fetchMessages();
      notify('✓ Message sent!');
    } catch {
      notify('✗ Send failed');
    } finally {
      setSending(null);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch {/* ok */}
    onLogout();
  };

  const unread = messages.filter(m => !m.draft_status || m.draft_status === 'draft').length;

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden font-sans text-white">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-white/10 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-tighter uppercase italic">ECNET</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">AI Agent v2</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'inbox', icon: Inbox, label: 'Inbox', badge: unread },
            { id: 'settings', icon: Settings, label: 'Settings', badge: 0 },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as 'inbox' | 'settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === item.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 && (
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-3">
          <button
            onClick={handleConnectGmail}
            disabled={gmailConnecting}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-400/10 transition-all"
          >
            {gmailConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link className="w-3 h-3" />}
            Connect Gmail
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-400 hover:bg-blue-400/10 transition-all"
          >
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Sync Now
          </button>
          <div className="flex items-center gap-2 px-3">
            <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-xs font-black text-slate-300">
              {user.display_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.display_name || user.email}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.organization_id}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Message List */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-slate-900/30">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Messages</h2>
            <span className="text-[10px] text-slate-500 font-bold">{messages.length} total</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
              <Wifi className="w-10 h-10" />
              <p className="text-xs font-bold">Connect Gmail & sync to start</p>
            </div>
          ) : (
            messages.map(msg => (
              <button
                key={msg.id}
                onClick={() => { setSelected(msg); setEditingDraft(msg.draft_text ?? ''); setIsEditing(false); }}
                className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-all ${
                  selected?.id === msg.id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-black text-white truncate flex-1">
                    {msg.from_name || msg.from_email}
                  </p>
                  {msg.urgency && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase ${URGENCY_COLORS[msg.urgency] ?? ''}`}>
                      {msg.urgency}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-semibold truncate mb-1">{msg.subject || '(No subject)'}</p>
                <div className="flex items-center gap-2">
                  {msg.category && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${CATEGORY_COLORS[msg.category] ?? ''}`}>
                      {msg.category}
                    </span>
                  )}
                  {msg.draft_status === 'sent' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                  {msg.draft_id && msg.draft_status !== 'sent' && <Edit3 className="w-3 h-3 text-blue-400" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-4">
            <Mail className="w-16 h-16" />
            <p className="text-sm font-bold">Select a message to view</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-slate-900/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-white truncate">{selected.subject || '(No subject)'}</h2>
                  <p className="text-sm text-slate-400 font-semibold mt-0.5">
                    From: {selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selected.received_at ? new Date(selected.received_at).toLocaleString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* AI Badges */}
                  {selected.category && (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${CATEGORY_COLORS[selected.category] ?? ''}`}>
                      {selected.category}
                    </span>
                  )}
                  {selected.urgency && (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase ${URGENCY_COLORS[selected.urgency] ?? ''}`}>
                      {selected.urgency}
                    </span>
                  )}
                  {selected.requires_human_review && (
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                      Review
                    </span>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {selected.summary && (
                <div className="mt-3 p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1">AI Summary</p>
                  <p className="text-xs text-slate-300">{selected.summary}</p>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-900/50 rounded-xl p-4 border border-white/5">
                  {selected.body_text || '(No content)'}
                </pre>
              </div>
            </div>

            {/* Action Bar */}
            <div className="border-t border-white/5 p-4 bg-slate-900/30 space-y-3">
              {/* Persona Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex-shrink-0">Persona:</span>
                {PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase transition-all ${
                      selectedPersona === p.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-white/10 text-slate-400 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* AI Action Buttons */}
              <div className="flex items-center gap-2">
                {!selected.category && (
                  <button
                    id="btn-classify"
                    onClick={() => handleClassify(selected)}
                    disabled={!!classifying}
                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 border border-violet-500/30 text-violet-400 rounded-xl text-xs font-black hover:bg-violet-600/30 transition-all disabled:opacity-50"
                  >
                    {classifying === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
                    Classify
                  </button>
                )}

                {selected.category && !selected.draft_id && (
                  <button
                    id="btn-draft"
                    onClick={() => handleDraft(selected)}
                    disabled={!!drafting}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-black hover:bg-blue-600/30 transition-all disabled:opacity-50"
                  >
                    {drafting === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    Generate Draft
                  </button>
                )}

                {selected.draft_id && selected.draft_status !== 'sent' && (
                  <>
                    {!isEditing ? (
                      <button
                        id="btn-edit-draft"
                        onClick={() => { setEditingDraft(selected.draft_text ?? ''); setIsEditing(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-700/50 border border-white/10 text-slate-300 rounded-xl text-xs font-black hover:bg-slate-700 transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Draft
                      </button>
                    ) : (
                      <button
                        id="btn-save-draft"
                        onClick={handleSaveDraft}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black hover:bg-emerald-600/30 transition-all"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                    )}

                    <button
                      id="btn-send"
                      onClick={() => handleSend(selected)}
                      disabled={!!sending}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-500 transition-all disabled:opacity-50 ml-auto"
                    >
                      {sending === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Send Reply
                    </button>
                  </>
                )}

                {selected.draft_status === 'sent' && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-black">Reply Sent</span>
                  </div>
                )}
              </div>

              {/* Draft Preview / Edit */}
              {selected.draft_text && (
                <div className="mt-2">
                  {isEditing ? (
                    <textarea
                      value={editingDraft}
                      onChange={e => setEditingDraft(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-4 text-sm text-slate-200 font-mono resize-none focus:outline-none focus:border-blue-500/50"
                    />
                  ) : (
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2">Draft Reply</p>
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {selected.draft_text}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
