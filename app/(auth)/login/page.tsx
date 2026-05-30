'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        toast.error('Please confirm your email first — check your inbox.')
      } else if (error.message.toLowerCase().includes('invalid login credentials')) {
        toast.error('Wrong email or password.')
      } else {
        toast.error(error.message)
      }
      return
    }
    toast.success('Signed in!')
    window.location.href = '/dashboard'
  }

  return (
    <div className="w-full max-w-sm animate-slide-up">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500">Sign in to your ADA Scholar account</p>
      </div>

      {callbackError === 'confirmation_failed' && (
        <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>The confirmation link expired or was already used. Try signing in or register again.</span>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@ada.edu.az"
              autoComplete="email"
              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-medium text-white shadow-sm shadow-indigo-500/20"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" data-no-transition />}
            Sign in
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-gray-500 dark:text-zinc-500">
        No account?{' '}
        <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">
          Create one
        </Link>
      </p>
    </div>
  )
}
