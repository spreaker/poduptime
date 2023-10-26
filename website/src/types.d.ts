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
