import execa from 'execa'
import { existsSync } from 'fs'

// ============================================================================
// TYPES
// ============================================================================

export interface GitStats {
  period: {
    start: Date
    end: Date
    hours: number
    days: number
    minutes: number
  }
  commits: {
    first: CommitInfo
    last: CommitInfo
    total: number
    perHour: number
  }
  lines: {
    added: number
    removed: number
    net: number
    perHour: number
    perCommit: number
  }
  files: {
    total: number
    byType: FileTypeStat[]
    typescript: number
    prisma: number
  }
  authors: AuthorStat[]
  distribution: TimeDistribution[]
  topCommits: TopCommit[]
  insights: Insights
}

export interface CommitInfo {
  hash: string
  date: Date
  message: string
  author: string
}

export interface FileTypeStat {
  extension: string
  count: number
}

export interface AuthorStat {
  name: string
  commits: number
  percentage: number
}

export interface TimeDistribution {
  period: string
  commits: number
  percentage: number
}

export interface TopCommit {
  hash: string
  message: string
  changes: number
}

export interface Insights {
  productivityLevel: 'exceptional' | 'very-high' | 'good'
  removalPercentage: number
  typescriptPercentage: number
  nightCommits?: { count: number; percentage: number }
  dawnCommits?: { count: number; percentage: number }
}

// ============================================================================
// VALIDATORS
// ============================================================================

export async function isGitRepository(path: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd: path })
    return true
  } catch {
    return false
  }
}

export function pathExists(path: string): boolean {
  return existsSync(path)
}

// ============================================================================
// GIT DATA COLLECTORS
// ============================================================================

export async function getCommitHistory(
  cwd: string
): Promise<{ first: CommitInfo; last: CommitInfo; total: number }> {
  // Get first commit (--reverse without --max-count to avoid getting last commit)
  const firstResult = await execa(
    'git',
    ['log', '--reverse', '--format=%H|%aI|%s|%an'],
    { cwd }
  )
  const firstParts = firstResult.stdout.split('\n')[0].split('|')

  // Get last commit
  const lastResult = await execa(
    'git',
    ['log', '--format=%H|%aI|%s|%an', '--max-count=1'],
    { cwd }
  )
  const lastParts = lastResult.stdout.split('|')

  // Get total commits
  const totalResult = await execa('git', ['rev-list', '--count', 'HEAD'], {
    cwd,
  })
  const total = parseInt(totalResult.stdout.trim(), 10)

  return {
    first: {
      hash: firstParts[0].substring(0, 7),
      date: new Date(firstParts[1]),
      message: firstParts[2],
      author: firstParts[3],
    },
    last: {
      hash: lastParts[0].substring(0, 7),
      date: new Date(lastParts[1]),
      message: lastParts[2],
      author: lastParts[3],
    },
    total,
  }
}

export async function getLineStats(
  cwd: string
): Promise<{ added: number; removed: number; net: number }> {
  const result = await execa(
    'git',
    ['log', '--shortstat', '--pretty=tformat:'],
    { cwd }
  )

  let added = 0
  let removed = 0

  const lines = result.stdout.split('\n').filter((line: string) => line.trim())
  for (const line of lines) {
    const addMatch = line.match(/(\d+) insertion/)
    const delMatch = line.match(/(\d+) deletion/)

    if (addMatch) added += parseInt(addMatch[1], 10)
    if (delMatch) removed += parseInt(delMatch[1], 10)
  }

  return {
    added,
    removed,
    net: added - removed,
  }
}

export async function getFileStats(cwd: string): Promise<{
  total: number
  byType: FileTypeStat[]
  typescript: number
  prisma: number
}> {
  // Total files
  const totalResult = await execa('git', ['ls-files'], { cwd })
  const files = totalResult.stdout.split('\n').filter((f: string) => f.trim())
  const total = files.length

  // By extension
  const extMap = new Map<string, number>()
  let typescript = 0
  let prisma = 0

  for (const file of files) {
    const parts = file.split('.')
    if (parts.length > 1) {
      const ext = parts[parts.length - 1]
      extMap.set(ext, (extMap.get(ext) || 0) + 1)

      if (ext === 'ts' || ext === 'tsx') {
        if (!file.includes('node_modules')) {
          typescript++
        }
      }
      if (ext === 'prisma') {
        if (!file.includes('node_modules') && !file.includes('.next')) {
          prisma++
        }
      }
    }
  }

  const byType = Array.from(extMap.entries())
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { total, byType, typescript, prisma }
}

export async function getAuthorStats(cwd: string): Promise<AuthorStat[]> {
  const result = await execa('git', ['log', '--pretty=format:%an'], { cwd })
  const authors = result.stdout.split('\n').filter((a: string) => a.trim())
  const total = authors.length

  const authorMap = new Map<string, number>()
  for (const author of authors) {
    authorMap.set(author, (authorMap.get(author) || 0) + 1)
  }

  return Array.from(authorMap.entries())
    .map(([name, commits]) => ({
      name,
      commits,
      percentage: Math.round((commits / total) * 100),
    }))
    .sort((a, b) => b.commits - a.commits)
}

export async function getCommitDistribution(
  cwd: string
): Promise<TimeDistribution[]> {
  const result = await execa('git', ['log', '--format=%ai'], { cwd })
  const timestamps = result.stdout.split('\n').filter((t: string) => t.trim())

  const periodMap = new Map<string, number>()
  const total = timestamps.length

  for (const timestamp of timestamps) {
    const date = new Date(timestamp)
    const hour = date.getHours()

    let period: string
    if (hour >= 0 && hour < 6) period = 'Late night (00h-06h)'
    else if (hour >= 6 && hour < 12) period = 'Morning (06h-12h)'
    else if (hour >= 12 && hour < 18) period = 'Afternoon (12h-18h)'
    else period = 'Evening (18h-00h)'

    periodMap.set(period, (periodMap.get(period) || 0) + 1)
  }

  return Array.from(periodMap.entries())
    .map(([period, commits]) => ({
      period,
      commits,
      percentage: Math.round((commits / total) * 100),
    }))
    .sort((a, b) => b.commits - a.commits)
}

export async function getTopCommits(cwd: string): Promise<TopCommit[]> {
  const result = await execa(
    'git',
    ['log', '--pretty=format:%h|%s', '--shortstat', '--no-merges'],
    { cwd }
  )

  const lines = result.stdout.split('\n')
  const commits: TopCommit[] = []

  let currentHash = ''
  let currentMessage = ''
  let currentChanges = 0

  for (const line of lines) {
    if (line.match(/^[a-f0-9]{7}\|/)) {
      // Save previous commit if exists
      if (currentHash) {
        commits.push({
          hash: currentHash,
          message: currentMessage,
          changes: currentChanges,
        })
      }

      // Start new commit
      const [hash, message] = line.split('|')
      currentHash = hash
      currentMessage = message
      currentChanges = 0
    } else if (line.includes('file') && line.includes('changed')) {
      // Parse changes
      const fileMatch = line.match(/(\d+) file/)
      const insertMatch = line.match(/(\d+) insertion/)
      const deleteMatch = line.match(/(\d+) deletion/)

      if (fileMatch) currentChanges += parseInt(fileMatch[1], 10)
      if (insertMatch) currentChanges += parseInt(insertMatch[1], 10)
      if (deleteMatch) currentChanges += parseInt(deleteMatch[1], 10)
    }
  }

  // Add last commit
  if (currentHash) {
    commits.push({
      hash: currentHash,
      message: currentMessage,
      changes: currentChanges,
    })
  }

  return commits
    .filter(c => c.changes > 0)
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 5)
}

// ============================================================================
// MAIN ANALYZER
// ============================================================================

export async function analyzeRepository(cwd: string): Promise<GitStats> {
  // Collect all data in parallel
  const [
    commitHistory,
    lineStats,
    fileStats,
    authors,
    distribution,
    topCommits,
  ] = await Promise.all([
    getCommitHistory(cwd),
    getLineStats(cwd),
    getFileStats(cwd),
    getAuthorStats(cwd),
    getCommitDistribution(cwd),
    getTopCommits(cwd),
  ])

  // Calculate time metrics
  const startTime = commitHistory.first.date.getTime()
  const endTime = commitHistory.last.date.getTime()
  const diffMs = endTime - startTime
  const hours = diffMs / (1000 * 60 * 60)
  const minutes = Math.floor(diffMs / (1000 * 60))
  const days = diffMs / (1000 * 60 * 60 * 24)

  // Calculate productivity
  const linesPerHour = hours > 0 ? Math.round(lineStats.added / hours) : 0
  const perHour =
    hours > 0 ? parseFloat((commitHistory.total / hours).toFixed(1)) : 0
  const linesPerCommit =
    commitHistory.total > 0
      ? Math.round(lineStats.added / commitHistory.total)
      : 0

  // Calculate insights
  const removalPercentage =
    lineStats.added > 0
      ? parseFloat(((lineStats.removed / lineStats.added) * 100).toFixed(1))
      : 0

  const typescriptPercentage =
    lineStats.net > 0
      ? Math.round((fileStats.typescript / lineStats.net) * 100)
      : 0

  let productivityLevel: 'exceptional' | 'very-high' | 'good' = 'good'
  if (linesPerHour > 1000) productivityLevel = 'exceptional'
  else if (linesPerHour > 500) productivityLevel = 'very-high'

  const nightDist = distribution.find(d => d.period.startsWith('Evening'))
  const dawnDist = distribution.find(d => d.period.startsWith('Late night'))

  return {
    period: {
      start: commitHistory.first.date,
      end: commitHistory.last.date,
      hours: parseFloat(hours.toFixed(2)),
      days: parseFloat(days.toFixed(1)),
      minutes,
    },
    commits: {
      first: commitHistory.first,
      last: commitHistory.last,
      total: commitHistory.total,
      perHour,
    },
    lines: {
      added: lineStats.added,
      removed: lineStats.removed,
      net: lineStats.net,
      perHour: linesPerHour,
      perCommit: linesPerCommit,
    },
    files: fileStats,
    authors,
    distribution,
    topCommits,
    insights: {
      productivityLevel,
      removalPercentage,
      typescriptPercentage,
      nightCommits: nightDist
        ? { count: nightDist.commits, percentage: nightDist.percentage }
        : undefined,
      dawnCommits: dawnDist
        ? { count: dawnDist.commits, percentage: dawnDist.percentage }
        : undefined,
    },
  }
}
