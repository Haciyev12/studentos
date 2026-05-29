import Link from 'next/link'
import { ArrowRight, BookOpen, Calendar, CheckCircle2, Sparkles, Upload } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4 sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">ADA Scholar</span>
            </div>
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
          Built for ADA University students
        </div>
        <h1 className="text-5xl md:text-[4.5rem] font-bold tracking-tight leading-[1.08] mb-6">
          <span className="text-zinc-100">Never miss a deadline</span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            at ADA University
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Upload your course syllabus PDFs. AI reads them and automatically builds your semester
          calendar — every quiz, assignment, and exam in one place.
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
        <p className="mt-4 text-xs text-zinc-600">
          Free for all ADA University students
        </p>
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
                'Drop any syllabus PDF from your ADA courses. Works with every department and format.',
            },
            {
              icon: Sparkles,
              step: '02',
              title: 'AI extracts everything',
              description:
                'AI reads your syllabus and pulls out every deadline, quiz, midterm, final, and grading weight automatically.',
            },
            {
              icon: Calendar,
              step: '03',
              title: 'Your semester, organised',
              description:
                'All deadlines appear on a colour-coded calendar. Edit anything, add manually, mark as done.',
            },
          ].map(({ icon: Icon, step, title, description }) => (
            <div
              key={step}
              className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
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

      {/* Feature list */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 md:p-12">
          <h2 className="text-lg font-bold mb-6 tracking-tight">Everything you need for a stress-free semester</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-3">
            {[
              'Auto-extract deadlines from any syllabus PDF',
              'Colour-coded calendar by course',
              'Edit or add deadlines manually',
              'Track assignment weights and GPA impact',
              'Dashboard with upcoming deadlines',
              'Works on all ADA University course formats',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 py-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-sm text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-3 tracking-tight">Ready for a better semester?</h2>
        <p className="text-zinc-400 mb-8 text-sm">
          Free for ADA University students. Takes 2 minutes to set up.
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
        ADA Scholar &mdash; Made for ADA University students
      </footer>
    </main>
  )
}
