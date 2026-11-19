import { vi } from 'vitest'

// Mock date-fns formatDistanceToNow
export const formatDistanceToNow = vi.fn((date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'há alguns segundos'
  if (minutes < 60) return `há ${minutes} minutos`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} horas`
  const days = Math.floor(hours / 24)
  return `há ${days} dias`
})

// Mock locale
export const ptBR = {}
