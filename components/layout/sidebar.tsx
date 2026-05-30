'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Brain, Calendar, GraduationCap, LayoutDashboard, LogOut, Moon, Sun, TrendingUp, User, Users } from 'lucide-react'
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

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [unread, setUnread] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

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

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 border-r border-white/5 bg-gray-900">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">ADA Scholar</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
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
                active ? 'text-white' : 'text-white/50 hover:text-white/80'
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              {!active && isHovered && (
                <motion.div
                  layoutId="sidebar-hover-bg"
                  className="absolute inset-0 rounded-lg bg-white/5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              )}
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className={cn('w-4 h-4 shrink-0 relative z-10', active ? 'text-indigo-400' : '')} />
              <span className="relative z-10">{label}</span>
              {href === '/groups' && unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative z-10 ml-auto bg-indigo-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none"
                >
                  {unread > 99 ? '99+' : unread}
                </motion.span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5 space-y-0.5">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        )}
        {/* Account link */}
        <Link
          href="/account"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/account' ? 'text-white bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          )}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">{userEmail?.split('@')[0] ?? 'Account'}</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
