import Link from 'next/link'
import { ArrowRight, BookOpen, Calendar, Sparkles, Upload, CheckCircle2 } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4 sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Scholar</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-400 mb-8 font-medium">
          <Sparkles className="w-3 h-3" />
          Powered by Claude AI
        </div>
        <h1 className="text-5xl md:text-[4.5rem] font-bold tracking-tight leading-[1.08] mb-6">
          <span className="text-zinc-100">Your academic life,</span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            organized by AI
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Upload your syllabus PDFs. AI extracts every deadline, exam, and assignment automatically.
          Never miss a due date again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-all"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-xs text-zinc-500 uppercase tracking-widest text-center mb-10 font-medium">
          How it works
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Upload,
              step: '01',
              title: 'Upload your syllabus',
              description:
                'Drag and drop any syllabus PDF. Works with any university format or template.',
            },
            {
              icon: Sparkles,
              step: '02',
              title: 'AI reads everything',
              description:
                'Claude AI parses your syllabus and extracts every deadline, quiz, exam, and grading weight.',
            },
            {
              icon: Calendar,
              step: '03',
              title: 'Your calendar, populated',
              description:
                'All deadlines appear in your dashboard calendar instantly. Edit anything you want.',
            },
          ].map(({ icon: Icon, step, title, description }) => (
            <div
              key={step}
              className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-xs font-mono text-zinc-600">{step}</span>
              </div>
              <h3 className="text-sm font-semibold mb-2 text-zinc-100">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features list */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4">
            {[
              'Automatic deadline extraction from any PDF',
              'Smart calendar with color-coded courses',
              'Manual deadline editing after extraction',
              'GPA and grade weight tracking',
              'Upcoming assignments dashboard',
              'Dark mode — easy on your eyes',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-sm text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4 tracking-tight">Ready to get organised?</h2>
        <p className="text-zinc-400 mb-8 text-sm">
          Free to get started. No credit card required.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
        >
          Create your account <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        Scholar &mdash; Built for students
      </footer>
    </main>
  )
}
