import { Detail, Instant, Issue, ServiceInstant } from '../types'
import { HOSTING, PREFIXES, SERVICE_TYPES } from './Constants'

const STATUS_BADGE_CLASSES = {
  UP: ['text-lime-300', 'border-lime-600', 'hover:border-lime-300'],
  DOWN: ['text-red-300', 'border-red-600', 'hover:border-red-300'],
  PARTIAL: ['text-yellow-300', 'border-yellow-600', 'hover:border-yellow-300'],
  UNKNOWN: ['text-gray-300', 'border-gray-600', 'hover:border-gray-300'],
  LOADING: ['text-gray-300', 'border-gray-600', 'hover:border-gray-300']
}

const STATUS_BADGE_LABELS = {
  UP: 'UP',
  DOWN: 'DOWN',
  PARTIAL: 'PARTIAL',
  UNKNOWN: 'UNKNOWN',
  LOADING: '...'
}

const DETAIL_CELL_CLASSES = {
  UP: ['bg-lime-500', 'hover:bg-lime-300'],
  DOWN: ['bg-red-500', 'hover:bg-red-300'],
  PARTIAL: ['bg-yellow-500', 'hover:bg-yellow-300'],
  UNKNOWN: ['bg-gray-500', 'hover:bg-gray-300'],
  LOADING: ['bg-gray-500', 'hover:bg-gray-300']
}

const getStatus = (available: number | null | undefined) => {
  if (typeof available === 'undefined') return 'LOADING'
  if (available === 0) return 'DOWN'
  if (available === 1) return 'UP'
  if (available === null) return 'UNKNOWN'
  return 'PARTIAL'
}

const getAvailabilityPercentage = (available: number | null | undefined) => {
  if (typeof available === 'undefined') return '...'
  if (available === null) return 'Unknown Availability'
  if (available === 0) return '0% Availability'
  if (available === 1) return '100% Availability'
  return `${(available * 100).toFixed(3)}% Availability`
}

function updateBadge(
  element: HTMLElement | undefined | null,
  available: number | null | undefined
) {
  if (!element) return
  element.classList.remove(
    ...STATUS_BADGE_CLASSES.UNKNOWN,
    ...STATUS_BADGE_CLASSES.UP,
    ...STATUS_BADGE_CLASSES.DOWN,
    ...STATUS_BADGE_CLASSES.PARTIAL,
    ...STATUS_BADGE_CLASSES.LOADING
  )
  element.classList.add(...STATUS_BADGE_CLASSES[getStatus(available)])
  element.innerText = STATUS_BADGE_LABELS[getStatus(available)]
}

export function updateStatusBadge(instant: Instant) {
  updateBadge(document.getElementById(`status-badge-${instant.endpoint}`), instant.available)
}

export function updateServiceStatusBadges(endpoint: string, data: ServiceInstant[]) {
  if (data.length === 0) {
    SERVICE_TYPES.forEach((type) => {
      updateBadge(document.getElementById(`status-badge-${endpoint}-${type}`), undefined)
    })
  }
  data.forEach((instant) => {
    updateBadge(
      document.getElementById(`status-badge-${endpoint}-${instant.type}`),
      instant.available
    )
  })
}

export function updateStatusBadges(data: Instant[]) {
  if (data.length === 0) {
    ;[...HOSTING, ...PREFIXES].forEach((item) => {
      updateStatusBadge({ endpoint: item.id, available: undefined })
    })
  }
  data.forEach((instant) => {
    updateStatusBadge(instant)
  })
}

export function updateDailyGrid(data: Detail[]) {
  if (data.length === 0) {
    for (let i = 0; i < 30; i++) {
      const cell = document.getElementById(`daily-cell-${i}`)
      const cellText = document.getElementById(`daily-cell-text-${i}`)
      if (cell && cellText) {
        cell.classList.remove(
          ...DETAIL_CELL_CLASSES['UNKNOWN'],
          ...DETAIL_CELL_CLASSES['UP'],
          ...DETAIL_CELL_CLASSES['DOWN'],
          ...DETAIL_CELL_CLASSES['PARTIAL'],
          ...DETAIL_CELL_CLASSES['LOADING']
        )
        cell.classList.add(...DETAIL_CELL_CLASSES['LOADING'])
        cellText.innerText = `...`
      }
    }
  }
  data.forEach((item, i) => {
    const cell = document.getElementById(`daily-cell-${i}`)
    const cellText = document.getElementById(`daily-cell-text-${i}`)
    if (cell && cellText) {
      cell.classList.remove(...DETAIL_CELL_CLASSES['LOADING'])
      cell.classList.add(...DETAIL_CELL_CLASSES[getStatus(item.available)])
      cellText.innerText = `${new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }).format(new Date(item.timestamp))} ${getAvailabilityPercentage(item.available)}`
    }
  })
}

export function updateDetailedGrid(data: Detail[]) {
  if (data.length === 0) {
    for (let i = 0; i < 1440; i++) {
      const col = i % 60
      const row = Math.floor(i / 60)
      const cell = document.getElementById(`detail-cell-${row}-${col}`)
      const cellText = document.getElementById(`detail-cell-text-${row}-${col}`)
      if (cell && cellText) {
        cell.classList.remove(
          ...DETAIL_CELL_CLASSES['UNKNOWN'],
          ...DETAIL_CELL_CLASSES['UP'],
          ...DETAIL_CELL_CLASSES['DOWN'],
          ...DETAIL_CELL_CLASSES['PARTIAL'],
          ...DETAIL_CELL_CLASSES['LOADING']
        )
        cell.classList.add(...DETAIL_CELL_CLASSES['LOADING'])
        cellText.innerText = `...`
      }
    }
  }
  data.forEach((item, i) => {
    const col = i % 60
    const row = Math.floor(i / 60)
    const cell = document.getElementById(`detail-cell-${row}-${col}`)
    const cellText = document.getElementById(`detail-cell-text-${row}-${col}`)
    if (cell && cellText) {
      cell.classList.remove(...DETAIL_CELL_CLASSES['LOADING'])
      cell.classList.add(...DETAIL_CELL_CLASSES[getStatus(item.available)])
      const time = new Date(item.timestamp)
      cellText.innerHTML = `${new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }).format(time)}&nbsp;-&nbsp;${new Intl.DateTimeFormat('default', {
        hour: 'numeric',
        minute: 'numeric',
        timeZone: 'UTC'
      }).format(time)}`
    }
  })
}

function renderIssue(issue: Issue) {
  return `
		<li class="pt-1">
			<div
				onclick="document.getElementById('${`issue-detail-${issue.id}`}').classList.toggle('hidden')"
				class="underline cursor-pointer text-sm"
			>
				${new Intl.DateTimeFormat('default', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          minute: 'numeric',
          hour: 'numeric',
          timeZone: 'UTC'
        }).format(new Date(issue.timestamp))} | ${issue.type} | ${issue.region}
			</div>
			<pre id="issue-detail-${issue.id}" class="text-xs hidden pt-1 overflow-x-scroll">${JSON.stringify(
        issue,
        null,
        2
      )}</pre>
		</li>`
}

export function updateRecentIssues(issues: Issue[] | null) {
  const element = document.getElementById('recent-issues')
  if (!element) return
  // Loading
  if (!issues) {
    element.innerHTML = `<div class="text-sm">...</div>`
    return
  }
  // No issues
  if (issues.length === 0) {
    element.innerHTML = `<div class="text-sm">No recent issues</div>`
    return
  }
  // Issues
  element.innerHTML = `
	<ul class="list-disc list-outside pl-4">
		${issues.map(renderIssue).join('')}
	</ul>
	`
}
