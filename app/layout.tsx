import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ADA Scholar — AI Academic Planner',
  description: 'ADA University student planner. Upload your syllabus and let AI extract all your deadlines automatically.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster
            theme="system"
            toastOptions={{
              classNames: {
                toast: 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 shadow-lg',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
