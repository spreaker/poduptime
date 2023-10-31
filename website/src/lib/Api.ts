import { ApiResponse, Detail, Instant, Issue, ServiceInstant } from '../types'
import { API_BASE_URL } from './Constants'

export async function fetchInstantData(region: string): Promise<Instant[]> {
  return await fetch(`${API_BASE_URL}/api/instant-${region}.json`)
    .then((response) => response.json() as Promise<ApiResponse<Instant[]>>)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
}

export async function fetchServiceInstantsData(
  endpoint: string,
  region: string
): Promise<ServiceInstant[]> {
  return await fetch(`${API_BASE_URL}/api/instant-${endpoint}-${region}.json`)
    .then((response) => response.json() as Promise<ApiResponse<ServiceInstant[]>>)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
}

export async function fetchDetailedData(endpoint: string, region: string): Promise<Detail[]> {
  return await fetch(`${API_BASE_URL}/api/detailed-${endpoint}-${region}.json`)
    .then((response) => response.json() as Promise<ApiResponse<Detail[]>>)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
}

export async function fetchDailyData(endpoint: string, region: string): Promise<Detail[]> {
  return await fetch(`${API_BASE_URL}/api/daily-${endpoint}-${region}.json`)
    .then((response) => response.json() as Promise<ApiResponse<Detail[]>>)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
}

export async function fetchRecentIssues(endpoint: string, region: string): Promise<Issue[]> {
  return await fetch(`${API_BASE_URL}/api/recent-issues-${endpoint}-${region}.json`)
    .then((response) => response.json() as Promise<ApiResponse<Issue[]>>)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
}

export async function fetchDetailedAndServiceInstantsAndRecentIssuesData(
  endpoint: string,
  region: string
): Promise<{
  detailed: Detail[]
  instants: ServiceInstant[]
  issues: Issue[]
  daily: Detail[]
}> {
  const [detailed, instants, issues, daily] = await Promise.all([
    fetchDetailedData(endpoint, region),
    fetchServiceInstantsData(endpoint, region),
    fetchRecentIssues(endpoint, region),
    fetchDailyData(endpoint, region)
  ])
  return { detailed, instants, issues, daily }
}
