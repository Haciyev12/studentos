'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Search, Users, X, LogIn, Hash, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Group = {
  id: string
  name: string
  course_name?: string
  section?: string
  invite_code: string
  created_at: string
}

type MembershipRow = {
  group_id: string
  role: string
  course_groups: Group
}

export default function GroupsPage() {
  const [memberships, setMemberships] = useState<MembershipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Group[]>([])
  const [searching, setSearching] = useState(false)

  // Create form
  const [createName, setCreateName] = useState('')
  const [createCourse, setCreateCourse] = useState('')
  const [createSection, setCreateSection] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Join form
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinMsg, setJoinMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/groups')
    const d = await r.json()
    setMemberships(d.groups ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!searchQ.trim() || searchQ.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const r = await fetch(`/api/groups/search?q=${encodeURIComponent(searchQ)}`)
      const d = await r.json()
      setSearchResults(d.groups ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) return
    setCreating(true)
    const r = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: createName, course_name: createCourse, section: createSection, description: createDesc }) })
    if (r.ok) { await load(); setShowCreate(false); setCreateName(''); setCreateCourse(''); setCreateSection(''); setCreateDesc('') }
    setCreating(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    setJoinMsg('')
    const r = await fetch('/api/groups/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invite_code: joinCode }) })
    const d = await r.json()
    if (r.ok) { await load(); setJoinMsg(d.already_member ? 'Already a member!' : `Joined "${d.group.name}"!`); setJoinCode('') }
    else setJoinMsg(d.error ?? 'Invalid code')
    setJoining(false)
  }

  async function joinFromSearch(groupId: string) {
    const r = await fetch('/api/groups/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invite_code: searchResults.find(g => g.id === groupId)?.invite_code }) })
    if (r.ok) { await load(); setSearchQ(''); setSearchResults([]) }
  }

  const myGroupIds = new Set(memberships.map(m => m.group_id))

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Study Groups</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Collaborate with your classmates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowJoin(true); setShowCreate(false) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <LogIn className="w-4 h-4" /> Join
          </button>
          <button onClick={() => { setShowCreate(true); setShowJoin(false) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search groups by course name…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {searching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      {/* Search results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-6 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 px-4 py-2 border-b border-gray-100 dark:border-zinc-800">Search results</p>
            {searchResults.map(g => (
              <div key={g.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{g.name}</p>
                  {g.course_name && <p className="text-xs text-gray-500 dark:text-zinc-400">{g.course_name}{g.section ? ` · ${g.section}` : ''}</p>}
                </div>
                {myGroupIds.has(g.id) ? (
                  <Link href={`/groups/${g.id}`} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Open →</Link>
                ) : (
                  <button onClick={() => joinFromSearch(g.id)} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors">Join</button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="mb-6 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100">Create new group</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input value={createName} onChange={e => setCreateName(e.target.value)} required placeholder="Group name *" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="grid grid-cols-2 gap-3">
                <input value={createCourse} onChange={e => setCreateCourse(e.target.value)} placeholder="Course (e.g. CSCI 101)" className="px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={createSection} onChange={e => setCreateSection(e.target.value)} placeholder="Section (optional)" className="px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              <button type="submit" disabled={creating} className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Group
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join modal */}
      <AnimatePresence>
        {showJoin && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="mb-6 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100">Join by invite code</h3>
              <button onClick={() => { setShowJoin(false); setJoinMsg('') }}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="6-character code" maxLength={6}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500 uppercase" />
              <button type="submit" disabled={joining} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Join
              </button>
            </form>
            {joinMsg && <p className={`text-sm mt-2 ${joinMsg.includes('!') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{joinMsg}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : memberships.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-indigo-500" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 mb-1">No groups yet</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">Create a group or join one with an invite code</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">Create group</button>
            <button onClick={() => setShowJoin(true)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">Join with code</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {memberships.map((m, i) => {
            const g = m.course_groups
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/groups/${g.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">{g.name}</p>
                      {m.role === 'admin' && <span className="text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">Admin</span>}
                    </div>
                    {g.course_name && <p className="text-xs text-gray-500 dark:text-zinc-400">{g.course_name}{g.section ? ` · ${g.section}` : ''}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500">
                      <Hash className="w-3 h-3" />{g.invite_code}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
