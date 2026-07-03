export type ApiResponse<Type> = {
  timestamp: string
  data: Type
}

export type Instant = {
  endpoint: string
  available: number | null | undefined
}

export type ServiceInstant = {
  type: string
  available: number | null | undefined
}

export type Detail = {
  timestamp: string
  available: number | null
}

export type CorsCheckStatus = 'IDLE' | 'PENDING' | 'CORS_OK' | 'CORS_KO'

export type CorsCheckResult = {
  type: string
  url: string
  status: CorsCheckStatus
}

export type Issue = {
  id: string
  timestamp: string
  region: string
  endpoint: string
  url: string
  type: string
  status: number
  duration: number
  headers: {
    [key: string]: string
  }
  traversal: string[]
}
