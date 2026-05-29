import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseDate(dateStr: string): Date {
  // If already a full ISO timestamp, parse directly. If date-only (YYYY-MM-DD), treat as local midnight.
  return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
}

export function formatDeadlineDate(dateStr: string): string {
  const date = parseDate(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d')
}

export function formatRelativeDate(dateStr: string): string {
  const date = parseDate(dateStr)
  if (isToday(date)) return 'Today'
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
  const due = parseDate(dateStr)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
