import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { PageTransition } from '@/components/layout/page-transition'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
