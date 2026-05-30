'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, User, Linkedin, BookOpen, GraduationCap, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const BADGES = ['🎓', '🚀', '⭐', '⚡', '🔥', '💎', '👑', '🏆', '📚', '💻']

const CURRENT_YEAR = new Date().getFullYear()
const GRAD_YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - 2 + i)

const inputCls = "w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"

export default function AccountPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('🎓')
  const [photoUrl, setPhotoUrl] = useState('')
  const [usePhoto, setUsePhoto] = useState(false)
  const [major, setMajor] = useState('')
  const [graduatingYear, setGraduatingYear] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setEmail(user.email ?? '')

      const res = await fetch('/api/account')
      if (res.ok) {
        const d = await res.json()
        setDisplayName(d.display_name ?? '')
        setAvatarEmoji(d.avatar_emoji ?? '🎓')
        setPhotoUrl(d.photo_url ?? '')
        setMajor(d.major ?? '')
        setGraduatingYear(d.graduating_year ? String(d.graduating_year) : '')
        setLinkedinUrl(d.linkedin_url ?? '')
        if (d.photo_url) setUsePhoto(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          avatar_emoji: avatarEmoji,
          photo_url: usePhoto ? photoUrl : null,
          major,
          graduating_year: graduatingYear ? parseInt(graduatingYear) : null,
          linkedin_url: linkedinUrl,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
      </div>
    )
  }

  const avatarDisplay = usePhoto && photoUrl ? (
    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" onError={() => setUsePhoto(false)} />
  ) : (
    <span className="text-3xl">{avatarEmoji}</span>
  )

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">Account</h1>
          <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">Your profile and academic details</p>
        </div>

        <div className="space-y-6">
          {/* Avatar + name */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" /> Profile
            </h2>

            {/* Avatar preview */}
            <div className="flex items-start gap-5 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-100 dark:border-indigo-500/20">
                {avatarDisplay}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {displayName || email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{email}</p>
                {major && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{major}{graduatingYear ? ` · Class of ${graduatingYear}` : ''}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Display name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={email.split('@')[0]}
                  className={inputCls}
                />
              </div>

              {/* Avatar selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-zinc-400">Avatar</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-zinc-500">Photo URL</span>
                    <button
                      type="button"
                      onClick={() => setUsePhoto(p => !p)}
                      className={cn(
                        'relative inline-flex h-5 w-9 rounded-full transition-colors',
                        usePhoto ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-zinc-700'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                        usePhoto && 'translate-x-4'
                      )} />
                    </button>
                  </div>
                </div>
                {usePhoto ? (
                  <input
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className={inputCls}
                  />
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {BADGES.map(badge => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => setAvatarEmoji(badge)}
                        className={cn(
                          'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all border-2',
                          avatarEmoji === badge
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 scale-110'
                            : 'border-transparent bg-gray-50 dark:bg-zinc-800 hover:scale-105'
                        )}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Academic details */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" /> Academic Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Major / Program</label>
                <input
                  value={major}
                  onChange={e => setMajor(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">Graduating year</label>
                <select
                  value={graduatingYear}
                  onChange={e => setGraduatingYear(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select year</option>
                  {GRAD_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">University</label>
                <input
                  value="ADA University"
                  disabled
                  className={cn(inputCls, 'opacity-50 cursor-not-allowed')}
                />
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
              <Linkedin className="w-4 h-4 text-indigo-500" /> Networking
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">LinkedIn profile URL</label>
              <div className="flex gap-2">
                <input
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className={inputCls}
                />
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
                Visible to members of your study groups
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white shadow-sm shadow-indigo-500/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
