import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-zinc-100">ADA Scholar</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        {children}
      </div>
    </div>
  )
}
