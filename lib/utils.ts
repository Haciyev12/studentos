import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDeadlineDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return format(date, 'MMM d')
  return format(date, 'MMM d')
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return `${formatDistanceToNow(date)} ago`
  return `in ${formatDistanceToNow(date)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
