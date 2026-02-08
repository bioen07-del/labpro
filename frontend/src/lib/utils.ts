// Utility functions for LabPro

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

// shadcn/ui classNames utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(date: string | Date): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy', { locale: ru })
}

// Format datetime for display
export function formatDateTime(date: string | Date): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy HH:mm', { locale: ru })
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ru })
}

// Format number with spaces
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '-'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Format currency (for cells count)
export function formatCellsCount(cells: number | undefined | null): string {
  if (!cells) return '-'
  if (cells >= 1_000_000_000) {
    return `${(cells / 1_000_000_000).toFixed(1)} млрд`
  } else if (cells >= 1_000_000) {
    return `${(cells / 1_000_000).toFixed(1)} млн`
  } else if (cells >= 1_000) {
    return `${(cells / 1_000).toFixed(1)} тыс`
  }
  return cells.toString()
}

// Get status color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Culture/Lot status
    ACTIVE: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    DISPOSE: 'bg-red-100 text-red-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    
    // Bank status
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    ISSUED: 'bg-purple-100 text-purple-800',
    
    // Order status
    NEW: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    
    // Container status
    IN_BANK: 'bg-purple-100 text-purple-800',
    
    // Batch status
    EXPIRED: 'bg-red-100 text-red-800',
    
    // Task status
    PENDING: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Get status label (Russian)
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Culture/Lot status
    ACTIVE: 'Активна',
    ARCHIVED: 'Архив',
    DISPOSE: 'Утилизирована',
    CLOSED: 'Закрыта',
    
    // Bank status
    QUARANTINE: 'Карантин',
    APPROVED: 'Одобрено',
    RESERVED: 'Зарезервировано',
    ISSUED: 'Выдано',
    
    // Order status
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершена',
    CANCELLED: 'Отменена',
    
    // Container status
    IN_BANK: 'В банке',
    
    // Batch status
    EXPIRED: 'Просрочена',
    
    // Task status
    PENDING: 'Ожидает',
  }
  return labels[status] || status
}

// Get operation type label
export function getOperationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SEED: 'Посев',
    FEED: 'Кормление',
    FEEDING: 'Кормление',
    PASSAGE: 'Пассирование',
    FREEZE: 'Заморозка',
    THAW: 'Размораживание',
    OBSERVE: 'Наблюдение',
    DISPOSE: 'Утилизация',
    QC: 'Контроль качества',
    QCREG: 'Регистрация QC',
  }
  return labels[type] || type
}

// Get task type label
export function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INSPECT: 'Инспекция',
    FEED: 'Кормление',
    QC_DUE: 'QC контроль',
    FEFO: 'FEFO',
    ORDER_DUE: 'Дедлайн заявки',
    MAINTENANCE: 'Обслуживание',
  }
  return labels[type] || type
}

// Get bank type label
export function getBankTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MCB: 'Мастер-клеточный банк (MCB)',
    WCB: 'Рабочий-клеточный банк (WCB)',
    RWB: 'Резервный-клеточный банк (RWB)',
  }
  return labels[type] || type
}

// Generate QR code placeholder
export function generateQRData(entityType: string, id: string): string {
  return `LABPRO:${entityType.toUpperCase()}:${id}`
}

// Calculate days until expiration
export function daysUntilExpiration(expirationDate: string): number | null {
  if (!expirationDate) return null
  const expDate = parseISO(expirationDate)
  const today = new Date()
  const diffTime = expDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Get expiration warning level
export function getExpirationWarningLevel(days: number | null): 'critical' | 'warning' | 'normal' | null {
  if (days === null) return null
  if (days < 0) return 'critical'
  if (days <= 7) return 'critical'
  if (days <= 30) return 'warning'
  return 'normal'
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Get initials from name
export function getInitials(name: string): string {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
