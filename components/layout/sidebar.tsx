'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Brain, Calendar, GraduationCap, LayoutDashboard, LogOut, Moon, Sun, TrendingUp, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'Courses', icon: GraduationCap },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/gpa', label: 'GPA Tracker', icon: TrendingUp },
  { href: '/study-plan', label: 'Study Plan', icon: Brain },
  { href: '/groups', label: 'Study Groups', icon: Users },
]

type Profile = { display_name?: string; avatar_emoji?: string; photo_url?: string }

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [unread, setUnread] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>({})

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch('/api/account').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setProfile(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    async function fetchUnread() {
      const r = await fetch('/api/groups/unread-count')
      const d = await r.json()
      setUnread(d.total ?? 0)
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const displayName = profile.display_name || userEmail?.split('@')[0] || 'Account'

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 bg-[#0b0c14] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">ADA Scholar</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isHovered = hovered === href

          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => setHovered(href)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'text-white' : 'text-white/45 hover:text-white/80'
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-lg bg-indigo-500/20"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              {!active && isHovered && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-white/[0.05]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              )}
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-indigo-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className={cn('w-4 h-4 shrink-0 relative z-10', active ? 'text-indigo-400' : '')} />
              <span className="relative z-10">{label}</span>
              {href === '/groups' && unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative z-10 ml-auto bg-indigo-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none shadow shadow-indigo-500/40"
                >
                  {unread > 99 ? '99+' : unread}
                </motion.span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 p-3 border-t border-white/[0.06] space-y-1">
        {/* User card */}
        <Link
          href="/account"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group',
            pathname === '/account'
              ? 'bg-indigo-500/20 ring-1 ring-indigo-500/20'
              : 'hover:bg-white/[0.05]'
          )}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-indigo-500/20 flex items-center justify-center ring-2 ring-white/10">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-base leading-none">{profile.avatar_emoji ?? '🎓'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/90 truncate leading-tight">{displayName}</p>
            <p className="text-[10px] text-white/35 truncate leading-tight mt-0.5">{userEmail}</p>
          </div>
          <span className={cn('text-[10px] font-medium shrink-0 transition-colors',
            pathname === '/account' ? 'text-indigo-400' : 'text-white/25 group-hover:text-white/50')}>
            Edit
          </span>
        </Link>

        {/* Theme + Sign out row */}
        <div className="flex items-center gap-1 pt-0.5">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
            >
              {theme === 'dark'
                ? <><Sun className="w-3.5 h-3.5 shrink-0" />Light</>
                : <><Moon className="w-3.5 h-3.5 shrink-0" />Dark</>
              }
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
