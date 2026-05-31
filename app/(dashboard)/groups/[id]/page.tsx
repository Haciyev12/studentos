'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MessageSquare, CheckSquare, FileText, Trophy, Target, Send, Pin, Bell, Plus, Check, Trash2, ChevronDown, Loader2, Users, Hash, Copy, CheckCheck, AlertCircle, PartyPopper, X, Linkedin, GraduationCap, ImagePlus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Member = { id: string; user_id: string; display_name?: string; avatar_emoji?: string; role: string }
type Message = { id: string; user_id: string; sender_name: string; sender_emoji: string; content: string; message_type: string; deadline_title?: string; is_pinned: boolean; created_at: string }
type GroupDeadline = { id: string; deadline_id: string; added_by: string; deadlines: { id: string; title: string; type: string; due_date: string; user_id: string } }
type Completion = { deadline_id: string; user_id: string; user_name: string }
type Note = { id: string; title: string; topic?: string; creator_name: string; last_editor_name?: string; version: number; updated_at: string }
type Quiz = { id: string; title: string; description?: string; creator_name: string; created_at: string }
type GpaGoal = { id: string; target_gpa: number; semester?: string; anonymous_mode: boolean }
type MemberTarget = { user_id: string; user_name?: string; target_gpa?: number; current_gpa?: number; achieved: boolean }

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'deadlines', label: 'Deadlines', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'quiz', label: 'Quiz', icon: Trophy },
  { id: 'gpa', label: 'GPA Goal', icon: Target },
] as const
type Tab = typeof TABS[number]['id']

function Avatar({ emoji, name, size = 'sm' }: { emoji?: string; name?: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-sm' : 'w-9 h-9 text-base'
  return (
    <div className={`${s} rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0`}>
      <span>{emoji ?? '🎓'}</span>
    </div>
  )
}

export default function GroupPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<Tab>('chat')
  const [group, setGroup] = useState<{ id: string; name: string; course_name?: string; section?: string; invite_code: string } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [myUserId, setMyUserId] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [showMembers, setShowMembers] = useState(true)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  useEffect(() => {
    loadGroup()
    getMyId()
  }, [params.id])

  async function getMyId() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyUserId(user.id)
  }

  async function loadGroup() {
    const r = await fetch(`/api/groups/${params.id}`)
    if (!r.ok) return
    const d = await r.json()
    setGroup(d.group)
    setMembers(d.members)
  }

  function copyCode() {
    if (!group) return
    navigator.clipboard.writeText(group.invite_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  if (!group) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/groups" className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            {group.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm leading-tight">{group.name}</h1>
            {group.course_name && <p className="text-xs text-gray-500 dark:text-zinc-400">{group.course_name}{group.section ? ` · ${group.section}` : ''}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMembers(p => !p)} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <Users className="w-3.5 h-3.5" /> {members.length}
          </button>
          <button onClick={copyCode} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors font-mono">
            {codeCopied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Hash className="w-3.5 h-3.5" />}
            {group.invite_code}
          </button>
        </div>
      </div>

      {/* Members panel */}
      <AnimatePresence>
        {showMembers && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="shrink-0 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/60 overflow-hidden">
            <div className="flex gap-2 px-6 py-3 flex-wrap">
              {members.map(m => (
                <button key={m.id} onClick={() => setProfileUserId(m.user_id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors group">
                  <span className="text-base">{m.avatar_emoji ?? '🎓'}</span>
                  <span className="text-xs text-gray-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{m.display_name ?? 'Student'}</span>
                  {m.role === 'admin' && <span className="text-[10px] text-indigo-500">admin</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member profile modal */}
      <AnimatePresence>
        {profileUserId && (
          <MemberProfileModal userId={profileUserId} members={members} onClose={() => setProfileUserId(null)} />
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="h-full">
            {tab === 'chat' && <ChatTab groupId={params.id} myUserId={myUserId} />}
            {tab === 'deadlines' && <DeadlinesTab groupId={params.id} myUserId={myUserId} members={members} />}
            {tab === 'notes' && <NotesTab groupId={params.id} />}
            {tab === 'quiz' && <QuizTab groupId={params.id} myUserId={myUserId} />}
            {tab === 'gpa' && <GpaTab groupId={params.id} myUserId={myUserId} members={members} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── MEMBER PROFILE MODAL ────────────────────────────────────────────────────

function MemberProfileModal({ userId, members, onClose }: { userId: string; members: Member[]; onClose: () => void }) {
  const member = members.find(m => m.user_id === userId)
  const [profile, setProfile] = useState<{ display_name?: string; avatar_emoji?: string; photo_url?: string; major?: string; graduating_year?: number; linkedin_url?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/account/public/${userId}`)
      .then(r => r.json())
      .then(d => setProfile(d))
  }, [userId])

  const name = profile?.display_name ?? member?.display_name ?? 'Student'
  const emoji = profile?.avatar_emoji ?? member?.avatar_emoji ?? '🎓'

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center overflow-hidden">
              {profile?.photo_url
                ? <img src={profile.photo_url} alt={name} className="w-full h-full object-cover" />
                : <span className="text-3xl">{emoji}</span>
              }
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-zinc-100">{name}</p>
              {member?.role === 'admin' && <span className="text-xs text-indigo-500">Group admin</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!profile ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : (
          <div className="space-y-3">
            {profile.major && (
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-gray-700 dark:text-zinc-300">{profile.major}</span>
                {profile.graduating_year && <span className="text-xs text-gray-400 dark:text-zinc-500">· Class of {profile.graduating_year}</span>}
              </div>
            )}
            {profile.linkedin_url ? (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">
                <Linkedin className="w-4 h-4 shrink-0" />
                <span className="truncate">LinkedIn Profile</span>
              </a>
            ) : (
              !profile.major && (
                <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-2">No profile details yet</p>
              )
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── CHAT TAB ───────────────────────────────────────────────────────────────

function ChatTab({ groupId, myUserId }: { groupId: string; myUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pinned, setPinned] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)
  const [myDeadlines, setMyDeadlines] = useState<{ id: string; title: string }[]>([])
  const [showPinned, setShowPinned] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMessages()
    markRead()
    loadMyDeadlines()

    const supabase = createClient()
    const channel = supabase.channel(`group_messages_${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          if (msg.user_id !== myUserId) markRead()
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, myUserId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadMessages() {
    const r = await fetch(`/api/groups/${groupId}/messages`)
    const d = await r.json()
    const all = d.messages ?? []
    setMessages(all)
    setPinned(all.filter((m: Message) => m.is_pinned))
  }

  async function markRead() {
    await fetch(`/api/groups/${groupId}/unread`, { method: 'POST' })
  }

  async function loadMyDeadlines() {
    const r = await fetch('/api/deadlines')
    const d = await r.json()
    setMyDeadlines((d.deadlines ?? []).slice(0, 20).map((dl: { id: string; title: string }) => ({ id: dl.id, title: dl.title })))
  }

  function handleInput(v: string) {
    setInput(v)
    if (v.endsWith('@deadline') || v.endsWith('@')) setShowDeadlinePicker(true)
    else if (!v.includes('@')) setShowDeadlinePicker(false)
  }

  async function sendMessage(deadlineId?: string, deadlineTitle?: string) {
    const content = input.trim()
    if (!content && !deadlineId) return
    setSending(true)
    setShowDeadlinePicker(false)
    await fetch(`/api/groups/${groupId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: deadlineId ? `📌 ${deadlineTitle}` : content, message_type: deadlineId ? 'deadline_ping' : 'text', deadline_id: deadlineId, deadline_title: deadlineTitle }),
    })
    setInput('')
    setSending(false)
    inputRef.current?.focus()
  }

  async function togglePin(msgId: string) {
    await fetch(`/api/groups/${groupId}/messages/${msgId}/pin`, { method: 'POST' })
    await loadMessages()
  }

  function fmt(ts: string) {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const pinnedVisible = messages.filter(m => m.is_pinned)

  return (
    <div className="flex flex-col h-full">
      {/* Pinned messages bar */}
      {pinnedVisible.length > 0 && (
        <div className="shrink-0 border-b border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20">
          <button onClick={() => setShowPinned(p => !p)} className="w-full flex items-center justify-between px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
            <span className="flex items-center gap-1.5"><Pin className="w-3 h-3" /> {pinnedVisible.length} pinned message{pinnedVisible.length > 1 ? 's' : ''}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showPinned ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showPinned && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                {pinnedVisible.map(m => (
                  <div key={m.id} className="px-4 pb-2 flex items-start gap-2">
                    <Avatar emoji={m.sender_emoji} />
                    <div>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{m.sender_name}</span>
                      <p className="text-xs text-amber-800 dark:text-amber-200">{m.content}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => {
          const isMe = m.user_id === myUserId
          const showName = !isMe && (i === 0 || messages[i - 1].user_id !== m.user_id)
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} group`}>
              {!isMe && (showName ? <Avatar emoji={m.sender_emoji} /> : <div className="w-7" />)}
              <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {showName && <span className="text-[11px] text-gray-500 dark:text-zinc-400 mb-0.5 ml-0.5">{m.sender_name}</span>}
                <div className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.message_type === 'deadline_ping'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700'
                    : isMe
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100'
                }`}>
                  {m.content}
                  <button onClick={() => togglePin(m.id)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-white dark:bg-zinc-700 rounded-full p-0.5 shadow transition-opacity">
                    <Pin className={`w-2.5 h-2.5 ${m.is_pinned ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 mx-0.5">{fmt(m.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Deadline picker */}
      <AnimatePresence>
        {showDeadlinePicker && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="shrink-0 border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-500 dark:text-zinc-400 px-3 py-1.5 font-medium">Tag a deadline</p>
            {myDeadlines.map(dl => (
              <button key={dl.id} onClick={() => sendMessage(dl.id, dl.title)}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors truncate">
                📌 {dl.title}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center gap-2">
        <input ref={inputRef} value={input} onChange={e => handleInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Message… or type @ to tag a deadline"
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── DEADLINES TAB ───────────────────────────────────────────────────────────

function DeadlinesTab({ groupId, myUserId, members }: { groupId: string; myUserId: string; members: Member[] }) {
  const [groupDeadlines, setGroupDeadlines] = useState<GroupDeadline[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [myDeadlines, setMyDeadlines] = useState<{ id: string; title: string; due_date: string; type: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [pokes, setPokes] = useState<{ id: string; from_name: string; deadline_title?: string; created_at: string }[]>([])

  useEffect(() => { load() }, [groupId])

  async function load() {
    setLoading(true)
    const [r1, r2, r3] = await Promise.all([
      fetch(`/api/groups/${groupId}/deadlines`),
      fetch('/api/deadlines'),
      fetch(`/api/groups/${groupId}/poke`),
    ])
    const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()])
    setGroupDeadlines(d1.deadlines ?? [])
    setCompletions(d1.completions ?? [])
    setMyDeadlines(d2.deadlines ?? [])
    setPokes(d3.pokes ?? [])
    setLoading(false)
  }

  async function addDeadline(deadlineId: string) {
    await fetch(`/api/groups/${groupId}/deadlines`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deadline_id: deadlineId }) })
    setShowAdd(false)
    await load()
  }

  async function removeDeadline(deadlineId: string) {
    await fetch(`/api/groups/${groupId}/deadlines`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deadline_id: deadlineId }) })
    await load()
  }

  async function toggleComplete(deadlineId: string) {
    const done = completions.some(c => c.deadline_id === deadlineId && c.user_id === myUserId)
    setCompletions(prev => done ? prev.filter(c => !(c.deadline_id === deadlineId && c.user_id === myUserId)) : [...prev, { deadline_id: deadlineId, user_id: myUserId, user_name: '' }])
    await fetch(`/api/groups/${groupId}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deadline_id: deadlineId, completed: !done }) })
    await load()
  }

  async function poke(toUserId: string, deadlineTitle: string) {
    await fetch(`/api/groups/${groupId}/poke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to_user_id: toUserId, deadline_title: deadlineTitle }) })
  }

  async function dismissPoke(pokeId: string) {
    await fetch(`/api/groups/${groupId}/poke`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poke_id: pokeId }) })
    setPokes(prev => prev.filter(p => p.id !== pokeId))
  }

  const sharedIds = new Set(groupDeadlines.map(g => g.deadline_id))
  const displayed = filter === 'mine'
    ? groupDeadlines.filter(g => g.deadlines.user_id === myUserId)
    : groupDeadlines

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Poke notifications */}
      <AnimatePresence>
        {pokes.map(p => (
          <motion.div key={p.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{p.from_name}</strong> poked you{p.deadline_title ? ` about "${p.deadline_title}"` : ''}
              </span>
            </div>
            <button onClick={() => dismissPoke(p.id)} className="text-amber-500 hover:text-amber-700 text-xs font-medium">Dismiss</button>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5">
          {(['all', 'mine'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === f ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm' : 'text-gray-500 dark:text-zinc-400'}`}>
              {f === 'all' ? 'All deadlines' : 'My deadlines'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(p => !p)} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
          <Plus className="w-3.5 h-3.5" /> Add mine
        </button>
      </div>

      {/* Add deadline picker */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 overflow-hidden">
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 px-3 py-2 border-b border-indigo-100 dark:border-indigo-800">Select a deadline to share</p>
            {myDeadlines.filter(d => !sharedIds.has(d.id)).map(d => (
              <button key={d.id} onClick={() => addDeadline(d.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900 dark:text-zinc-100">{d.title}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{d.type} · {new Date(d.due_date + 'T00:00:00').toLocaleDateString()}</p>
                </div>
                <Plus className="w-4 h-4 text-indigo-500" />
              </button>
            ))}
            {myDeadlines.filter(d => !sharedIds.has(d.id)).length === 0 && (
              <p className="text-sm text-gray-400 dark:text-zinc-500 px-3 py-3">All your deadlines are already shared.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {displayed.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-zinc-500">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No shared deadlines yet. Add yours!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(gd => {
            const dl = gd.deadlines
            const isOwner = gd.added_by === myUserId
            const myDone = completions.some(c => c.deadline_id === dl.id && c.user_id === myUserId)
            const completedBy = completions.filter(c => c.deadline_id === dl.id)
            const total = members.length
            const pct = total > 0 ? Math.round((completedBy.length / total) * 100) : 0

            return (
              <motion.div key={gd.id} layout className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleComplete(dl.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${myDone ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-zinc-600 hover:border-green-400'}`}>
                      {myDone && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm text-gray-900 dark:text-zinc-100 ${myDone ? 'line-through opacity-60' : ''}`}>{dl.title}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{dl.type} · {new Date(dl.due_date + 'T00:00:00').toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!myDone && dl.user_id !== myUserId && (
                      <button onClick={() => {
                        const owner = members.find(m => m.user_id === dl.user_id)
                        if (owner) poke(owner.user_id, dl.title)
                      }} title="Poke" className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors">
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isOwner && (
                      <button onClick={() => removeDeadline(dl.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex -space-x-1">
                      {completedBy.map((c, i) => {
                        const m = members.find(m => m.user_id === c.user_id)
                        return <span key={i} title={c.user_name} className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xs">{m?.avatar_emoji ?? '🎓'}</span>
                      })}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-zinc-400">{completedBy.length}/{total} done</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-green-500 rounded-full" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── NOTES TAB ───────────────────────────────────────────────────────────────

// ─── RICH TEXT EDITOR ────────────────────────────────────────────────────────

const HIGHLIGHTS = [
  { color: '#fef08a', label: 'Yellow' },
  { color: '#bbf7d0', label: 'Green' },
  { color: '#bfdbfe', label: 'Blue' },
  { color: '#fce7f3', label: 'Pink' },
  { color: '#fed7aa', label: 'Orange' },
]

function RichTextEditor({ initialContent, onChange }: { initialContent: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    onChange(editorRef.current?.innerHTML ?? '')
  }

  function handleInput() {
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const btnCls = 'px-2 py-1 rounded text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 flex-wrap">
        <button onMouseDown={e => { e.preventDefault(); exec('bold') }} className={btnCls} title="Bold (Ctrl+B)">
          <span className="font-bold">B</span>
        </button>
        <button onMouseDown={e => { e.preventDefault(); exec('italic') }} className={btnCls} title="Italic (Ctrl+I)">
          <span className="italic">I</span>
        </button>
        <button onMouseDown={e => { e.preventDefault(); exec('underline') }} className={btnCls} title="Underline (Ctrl+U)">
          <span className="underline">U</span>
        </button>
        <button onMouseDown={e => { e.preventDefault(); exec('strikeThrough') }} className={btnCls} title="Strikethrough">
          <span className="line-through">S</span>
        </button>
        <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600 mx-1" />
        {/* Heading sizes */}
        <button onMouseDown={e => { e.preventDefault(); exec('fontSize', '5') }} className={`${btnCls} text-xs`} title="Large text">H1</button>
        <button onMouseDown={e => { e.preventDefault(); exec('fontSize', '3') }} className={`${btnCls} text-xs`} title="Normal text">H2</button>
        <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600 mx-1" />
        {/* Highlight colors */}
        <span className="text-xs text-gray-400 dark:text-zinc-500 mr-1">Highlight:</span>
        {HIGHLIGHTS.map(h => (
          <button
            key={h.color}
            onMouseDown={e => { e.preventDefault(); exec('hiliteColor', h.color) }}
            className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-800 hover:scale-125 transition-transform shadow-sm"
            style={{ backgroundColor: h.color }}
            title={h.label}
          />
        ))}
        <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600 mx-1" />
        <button onMouseDown={e => { e.preventDefault(); exec('removeFormat') }} className={`${btnCls} text-xs text-gray-400`} title="Clear formatting">
          Clear
        </button>
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="flex-1 p-5 text-sm text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 focus:outline-none overflow-y-auto leading-relaxed"
        style={{ minHeight: 0 }}
      />
    </div>
  )
}

function NotesTab({ groupId }: { groupId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<{ id: string; title: string; content: string; topic?: string; version: number; versions: { version: number; editor_name: string; created_at: string }[] } | null>(null)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadNotes() }, [groupId])

  async function loadNotes() {
    setLoading(true)
    const r = await fetch(`/api/groups/${groupId}/notes`)
    const d = await r.json()
    setNotes(d.notes ?? [])
    setLoading(false)
  }

  async function openNote(id: string) {
    const r = await fetch(`/api/groups/${groupId}/notes/${id}`)
    const d = await r.json()
    setSelected({ ...d.note, versions: d.versions })
    setEditContent(d.note.content)
    setEditing(false)
  }

  async function saveNote() {
    if (!selected) return
    setSaving(true)
    const r = await fetch(`/api/groups/${groupId}/notes/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editContent }) })
    const d = await r.json()
    setSelected({ ...d.note, versions: selected.versions })
    setEditing(false)
    setSaving(false)
    loadNotes()
  }

  async function createNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    await fetch(`/api/groups/${groupId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, topic: newTopic }) })
    setNewTitle(''); setNewTopic(''); setShowNew(false); setCreating(false)
    await loadNotes()
  }

  async function deleteNote(id: string) {
    await fetch(`/api/groups/${groupId}/notes/${id}`, { method: 'DELETE' })
    if (selected?.id === id) setSelected(null)
    await loadNotes()
  }

  if (selected) return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-200 dark:border-zinc-800">
        <button onClick={() => setSelected(null)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back</button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 truncate">{selected.title}</h2>
          {selected.topic && <p className="text-xs text-gray-500">{selected.topic}</p>}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="text-xs text-gray-500 px-2 py-1 rounded border border-gray-200 dark:border-zinc-700">Cancel</button>
              <button onClick={saveNote} disabled={saving} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-gray-600 dark:text-zinc-300 px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800">Edit</button>
          )}
        </div>
      </div>

      {editing ? (
        <RichTextEditor initialContent={editContent} onChange={setEditContent} />
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          {selected.content ? (
            <div className="text-sm text-gray-800 dark:text-zinc-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: selected.content }} />
          ) : (
            <p className="text-sm text-gray-400 dark:text-zinc-500 italic">No content yet. Click Edit to start writing.</p>
          )}
        </div>
      )}

      {/* Version history */}
      {selected.versions.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-5 py-2">
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium mb-1">Version history</p>
          <div className="flex gap-3 overflow-x-auto">
            {selected.versions.map(v => (
              <span key={v.version} className="text-[11px] text-gray-500 dark:text-zinc-400 whitespace-nowrap">v{v.version} · {v.editor_name} · {new Date(v.created_at).toLocaleDateString()}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">Shared Notes</h2>
        <button onClick={() => setShowNew(p => !p)} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700">
          <Plus className="w-3.5 h-3.5" /> New note
        </button>
      </div>

      <AnimatePresence>
        {showNew && (
          <motion.form onSubmit={createNote} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 space-y-2 overflow-hidden">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="Note title *"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Topic / Week (optional)"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" disabled={creating} className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-1">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        : notes.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-zinc-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No shared notes yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((n, i) => (
              <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
                onClick={() => openNote(n.id)}>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-zinc-100">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {n.topic && <span className="mr-2 text-indigo-500">{n.topic}</span>}
                    v{n.version} · edited by {n.last_editor_name ?? n.creator_name}
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteNote(n.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
    </div>
  )
}

// ─── QUIZ TAB ────────────────────────────────────────────────────────────────

type QuizQuestion = { id: string; question: string; options: string[]; correct_index: number; order_index: number; image_url?: string | null }

function QuizTab({ groupId, myUserId }: { groupId: string; myUserId: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'create' | 'take' | 'result'>('list')
  const [activeQuiz, setActiveQuiz] = useState<{ quiz: Quiz; questions: QuizQuestion[]; attempts: { user_id: string; user_name: string; score: number; total: number }[]; myAttempt: { score: number; total: number } | null } | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create form
  const [cTitle, setCTitle] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cQuestions, setCQuestions] = useState([{ question: '', options: ['', '', '', ''], correct_index: 0, image_url: null as string | null }])
  const [creating, setCreating] = useState(false)

  // Photo upload
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoQIndex, setPhotoQIndex] = useState(-1)
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null)

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || photoQIndex < 0) return
    const qi = photoQIndex
    e.target.value = ''
    setUploadingPhoto(qi)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadingPhoto(null); return }
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filePath = `quiz-images/${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('quiz-images').upload(filePath, file, { contentType: file.type })
    if (error) {
      alert('Photo upload failed. Please create a "quiz-images" public bucket in Supabase Storage first.')
      setUploadingPhoto(null)
      return
    }
    const { data: urlData } = supabase.storage.from('quiz-images').getPublicUrl(filePath)
    setCQuestions(prev => prev.map((q, i) => i === qi ? { ...q, image_url: urlData.publicUrl } : q))
    setUploadingPhoto(null)
  }

  useEffect(() => { loadQuizzes() }, [groupId])

  async function loadQuizzes() {
    setLoading(true)
    const r = await fetch(`/api/groups/${groupId}/quiz`)
    const d = await r.json()
    setQuizzes(d.quizzes ?? [])
    setLoading(false)
  }

  async function openQuiz(id: string) {
    const r = await fetch(`/api/groups/${groupId}/quiz/${id}`)
    const d = await r.json()
    setActiveQuiz(d)
    setAnswers(new Array(d.questions.length).fill(-1))
    setResult(d.myAttempt)
    setView(d.myAttempt ? 'result' : 'take')
  }

  async function submitQuiz() {
    if (!activeQuiz) return
    setSubmitting(true)
    const r = await fetch(`/api/groups/${groupId}/quiz/${activeQuiz.quiz.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) })
    const d = await r.json()
    setResult(d)
    setView('result')
    setSubmitting(false)
  }

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const r = await fetch(`/api/groups/${groupId}/quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: cTitle, description: cDesc, questions: cQuestions }) })
    if (r.ok) { await loadQuizzes(); setView('list'); setCTitle(''); setCDesc(''); setCQuestions([{ question: '', options: ['', '', '', ''], correct_index: 0, image_url: null }]) }
    setCreating(false)
  }

  function addQuestion() {
    setCQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correct_index: 0, image_url: null }])
  }

  if (view === 'create') return (
    <div className="h-full overflow-y-auto p-5">
      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setView('list')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back</button>
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">Create Quiz</h2>
      </div>
      <form onSubmit={createQuiz} className="space-y-4 max-w-lg">
        <input value={cTitle} onChange={e => setCTitle(e.target.value)} required placeholder="Quiz title *"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Description (optional)" rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        {cQuestions.map((q, qi) => (
          <div key={qi} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Question {qi + 1}</p>
            <input value={q.question} onChange={e => setCQuestions(prev => prev.map((pq, i) => i === qi ? { ...pq, question: e.target.value } : pq))}
              placeholder="Question text" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {/* Photo attachment */}
            <div className="flex items-center gap-3">
              {q.image_url ? (
                <div className="relative shrink-0">
                  <img src={q.image_url} alt="Question photo" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-zinc-700" />
                  <button type="button"
                    onClick={() => setCQuestions(prev => prev.map((pq, i) => i === qi ? { ...pq, image_url: null } : pq))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button type="button"
                  onClick={() => { setPhotoQIndex(qi); photoInputRef.current?.click() }}
                  disabled={uploadingPhoto === qi}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-dashed border-gray-300 dark:border-zinc-600 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg px-3 py-2 transition-colors">
                  {uploadingPhoto === qi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                  {uploadingPhoto === qi ? 'Uploading…' : 'Add photo'}
                </button>
              )}
            </div>
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={`correct_${qi}`} checked={q.correct_index === oi} onChange={() => setCQuestions(prev => prev.map((pq, i) => i === qi ? { ...pq, correct_index: oi } : pq))} className="accent-green-600" />
                <input value={opt} onChange={e => setCQuestions(prev => prev.map((pq, i) => i === qi ? { ...pq, options: pq.options.map((o, j) => j === oi ? e.target.value : o) } : pq))}
                  placeholder={`Option ${oi + 1}`} className="flex-1 px-2 py-1.5 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none" />
              </div>
            ))}
            <p className="text-[11px] text-gray-400">Green radio = correct answer</p>
          </div>
        ))}
        <button type="button" onClick={addQuestion} className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700">
          <Plus className="w-4 h-4" /> Add question
        </button>
        <button type="submit" disabled={creating} className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} Publish Quiz
        </button>
      </form>
    </div>
  )

  if (view === 'take' && activeQuiz) return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setView('list')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back</button>
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">{activeQuiz.quiz.title}</h2>
      </div>
      <div className="space-y-5 max-w-lg">
        {activeQuiz.questions.map((q, qi) => (
          <div key={q.id} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800">
            {q.image_url && (
              <img src={q.image_url} alt="Question" className="w-full max-h-56 object-contain rounded-lg mb-3 bg-gray-50 dark:bg-zinc-800" />
            )}
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {(q.options as string[]).map((opt, oi) => (
                <button key={oi} onClick={() => setAnswers(prev => prev.map((a, i) => i === qi ? oi : a))}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${answers[qi] === oi ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200' : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 text-gray-800 dark:text-zinc-200'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={submitQuiz} disabled={submitting || answers.some(a => a === -1)}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Submit
        </button>
      </div>
    </div>
  )

  if (view === 'result' && activeQuiz && result) return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setView('list')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back</button>
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">{activeQuiz.quiz.title}</h2>
      </div>
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{result.score}/{result.total}</span>
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{Math.round((result.score / result.total) * 100)}%</p>
        <p className="text-sm text-gray-500 dark:text-zinc-400">Your score</p>
      </div>
      <h3 className="font-semibold text-sm text-gray-700 dark:text-zinc-300 mb-3">Leaderboard</h3>
      <div className="space-y-2">
        {[...activeQuiz.attempts].sort((a, b) => b.score - a.score).map((a, i) => (
          <div key={a.user_id} className={`flex items-center justify-between p-3 rounded-lg ${a.user_id === myUserId ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-zinc-800'}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
              <span className="text-sm text-gray-900 dark:text-zinc-100">{a.user_name}</span>
            </div>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{a.score}/{a.total}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">Quizzes</h2>
        <button onClick={() => setView('create')} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700">
          <Plus className="w-3.5 h-3.5" /> Create quiz
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        : quizzes.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-zinc-500">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No quizzes yet. Challenge your classmates!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quizzes.map((q, i) => (
              <motion.button key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => openQuiz(q.id)}
                className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <p className="font-medium text-sm text-gray-900 dark:text-zinc-100">{q.title}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">by {q.creator_name}</p>
              </motion.button>
            ))}
          </div>
        )}
    </div>
  )
}

// ─── GPA GOAL TAB ─────────────────────────────────────────────────────────────

function GpaTab({ groupId, myUserId, members }: { groupId: string; myUserId: string; members: Member[] }) {
  const [goal, setGoal] = useState<GpaGoal | null>(null)
  const [memberTargets, setMemberTargets] = useState<MemberTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [showSetGoal, setShowSetGoal] = useState(false)
  const [targetGpa, setTargetGpa] = useState('3.50')
  const [semester, setSemester] = useState('')
  const [anonMode, setAnonMode] = useState(true)
  const [saving, setSaving] = useState(false)
  const [myTarget, setMyTarget] = useState('')
  const [myCurrent, setMyCurrent] = useState('')
  const [savingMy, setSavingMy] = useState(false)

  useEffect(() => { load() }, [groupId])

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/groups/${groupId}/gpa-goal`)
    const d = await r.json()
    setGoal(d.goal)
    setMemberTargets(d.members ?? [])
    const me = d.members?.find((m: MemberTarget) => m.user_id === myUserId)
    if (me) { setMyTarget(String(me.target_gpa ?? '')); setMyCurrent(String(me.current_gpa ?? '')) }
    setLoading(false)
  }

  async function setGroupGoal(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/groups/${groupId}/gpa-goal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_gpa: parseFloat(targetGpa), semester, anonymous_mode: anonMode }) })
    await load()
    setShowSetGoal(false)
    setSaving(false)
  }

  async function saveMyTarget(e: React.FormEvent) {
    e.preventDefault()
    setSavingMy(true)
    await fetch(`/api/groups/${groupId}/gpa-goal/me`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_gpa: myTarget ? parseFloat(myTarget) : null, current_gpa: myCurrent ? parseFloat(myCurrent) : null }) })
    await load()
    setSavingMy(false)
  }

  const achieved = memberTargets.filter(m => m.achieved)
  const avgCurrent = memberTargets.filter(m => m.current_gpa != null).reduce((s, m) => s + (m.current_gpa ?? 0), 0) / (memberTargets.filter(m => m.current_gpa != null).length || 1)
  const pct = goal ? Math.min(100, Math.round((avgCurrent / goal.target_gpa) * 100)) : 0

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      {/* Group goal card */}
      {goal ? (
        <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wide">Group Target</p>
              <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{goal.target_gpa.toFixed(2)}</p>
              {goal.semester && <p className="text-xs text-indigo-500 dark:text-indigo-400">{goal.semester}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-zinc-400">Group avg</p>
              <p className="text-2xl font-bold text-gray-700 dark:text-zinc-200">{avgCurrent > 0 ? avgCurrent.toFixed(2) : '—'}</p>
            </div>
          </div>
          <div className="h-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden mb-2">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
          </div>
          <div className="flex items-center justify-between text-xs text-indigo-500 dark:text-indigo-400">
            <span>{pct}% of target</span>
            <span>{achieved.length} of {members.length} achieved 🎉</span>
          </div>
          {achieved.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <PartyPopper className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">{achieved.map(a => a.user_name).join(', ')} hit their target!</span>
            </div>
          )}
          <button onClick={() => setShowSetGoal(p => !p)} className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit goal</button>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 text-center">
          <Target className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Set a group GPA goal</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">Motivate your group with a collective target</p>
          <button onClick={() => setShowSetGoal(true)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">Set goal</button>
        </div>
      )}

      {/* Set goal form */}
      <AnimatePresence>
        {showSetGoal && (
          <motion.form onSubmit={setGroupGoal} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-3 overflow-hidden">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Target GPA (0–4)</label>
                <input type="number" min="0" max="4" step="0.01" value={targetGpa} onChange={e => setTargetGpa(e.target.value)} required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Semester</label>
                <input value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. Fall 2025"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={anonMode} onChange={e => setAnonMode(e.target.checked)} className="rounded accent-indigo-600" />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Anonymous mode (hide individual GPAs)</span>
            </label>
            <button type="submit" disabled={saving} className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save goal
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* My target */}
      {goal && (
        <form onSubmit={saveMyTarget} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">My targets</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">My GPA goal</label>
              <input type="number" min="0" max="4" step="0.01" value={myTarget} onChange={e => setMyTarget(e.target.value)} placeholder="3.50"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block">Current GPA</label>
              <input type="number" min="0" max="4" step="0.01" value={myCurrent} onChange={e => setMyCurrent(e.target.value)} placeholder="3.20"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <button type="submit" disabled={savingMy} className="w-full py-2 rounded-lg bg-gray-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-zinc-200 disabled:opacity-60 flex items-center justify-center gap-2">
            {savingMy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save my targets
          </button>
        </form>
      )}

      {/* Member progress */}
      {goal && memberTargets.length > 0 && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">Member progress</p>
          <div className="space-y-3">
            {memberTargets.map(mt => {
              const pct2 = mt.target_gpa ? Math.min(100, Math.round(((mt.current_gpa ?? 0) / mt.target_gpa) * 100)) : 0
              const m = members.find(mm => mm.user_id === mt.user_id)
              return (
                <div key={mt.user_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span>{m?.avatar_emoji ?? '🎓'}</span>
                      <span className="text-xs text-gray-700 dark:text-zinc-300">{goal.anonymous_mode && mt.user_id !== myUserId ? 'Member' : (mt.user_name ?? 'Student')}</span>
                      {mt.achieved && <span className="text-amber-500">🎉</span>}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                      {goal.anonymous_mode && mt.user_id !== myUserId ? '***' : (mt.current_gpa?.toFixed(2) ?? '—')} / {mt.target_gpa?.toFixed(2) ?? '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${goal.anonymous_mode && mt.user_id !== myUserId ? 0 : pct2}%` }} transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${mt.achieved ? 'bg-green-500' : 'bg-indigo-500'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
