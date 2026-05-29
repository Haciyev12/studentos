'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    // If Supabase auto-confirmed the user (email confirmation disabled),
    // a session is returned immediately — go straight to dashboard.
    if (authData.session) {
      toast.success('Account created!')
      router.push('/dashboard')
      router.refresh()
      return
    }

    setSentTo(data.email)
    setEmailSent(true)
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-sm text-center animate-slide-up">
        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Mail className="w-7 h-7 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Check your email</h1>
        <p className="text-sm text-zinc-400 mb-1">
          We sent a confirmation link to
        </p>
        <p className="text-sm font-medium text-zinc-200 mb-6">{sentTo}</p>
        <p className="text-xs text-zinc-500 mb-6">
          Click the link in the email to activate your account, then come back to sign in.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Go to sign in
          </Link>
          <p className="text-xs text-zinc-600 mt-2">
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm animate-slide-up">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Create your account</h1>
        <p className="text-sm text-zinc-500">Start organising your academic life</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full name</label>
          <input
            {...register('fullName')}
            type="text"
            placeholder="Alex Johnson"
            autoComplete="name"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@university.edu"
            autoComplete="email"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
          <input
            {...register('password')}
            type="password"
            placeholder="8+ characters"
            autoComplete="new-password"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
