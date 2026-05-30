'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Brain, Calendar, GraduationCap, LayoutDashboard, LogOut, TrendingUp, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useEffect, useState } from 'react'

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
  const [unread, setUnread] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)

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
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-200 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-zinc-100">ADA Scholar</span>
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
                active
                  ? 'text-indigo-700 dark:text-zinc-100'
                  : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
              )}
            >
              {/* Animated background: active item */}
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 rounded-lg bg-indigo-50 dark:bg-zinc-900"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              {/* Hover background (only for non-active) */}
              {!active && isHovered && (
                <motion.div
                  layoutId="sidebar-hover-bg"
                  className="absolute inset-0 rounded-lg bg-gray-100 dark:bg-zinc-900/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              )}
              {/* Active left border indicator */}
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className={cn('w-4 h-4 shrink-0 relative z-10', active ? 'text-indigo-600 dark:text-indigo-400' : '')} />
              <span className="relative z-10">{label}</span>
              {href === '/groups' && unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative z-10 ml-auto bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none"
                >
                  {unread > 99 ? '99+' : unread}
                </motion.span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-200 dark:border-zinc-800 space-y-0.5">
        <ThemeToggle />
        <div className="px-3 py-1.5">
          <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
