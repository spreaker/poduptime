import { Detail, Instant, ServiceInstant } from '../types'
import { API_BASE_URL } from './Constants'

export async function fetchInstantData(region: string): Promise<Instant[]> {
	return await fetch(`${API_BASE_URL}/api/instant-${region}.json`)
		.then((response) => response.json() as Promise<Instant[]>)
		.then((data) => {
			return data
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
		.then((response) => response.json() as Promise<ServiceInstant[]>)
		.then((data) => {
			return data
		})
		.catch(() => {
			return []
		})
}

export async function fetchDetailedData(endpoint: string, region: string): Promise<Detail[]> {
	return await fetch(`${API_BASE_URL}/api/detailed-${endpoint}-${region}.json`)
		.then((response) => response.json() as Promise<Detail[]>)
		.then((data) => {
			return data
		})
		.catch(() => {
			return []
		})
}

export async function fetchDetailedAndServiceInstantsData(
	endpoint: string,
	region: string
): Promise<{
	detailed: Detail[]
	instants: ServiceInstant[]
}> {
	const [detailed, instants] = await Promise.all([
		fetchDetailedData(endpoint, region),
		fetchServiceInstantsData(endpoint, region)
	])
	return { detailed, instants }
}
