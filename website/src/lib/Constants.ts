import config from '../../conf/config.js'

type Service = { type: string; url: string }
type Endpoint = { id: string; label: string; website_url: string; services: Service[] }
type Region = { id: string; label: string }

const isPrefix = function (endpoint) {
	return endpoint.services.filter((service) => service.type === 'prefix').length > 0
}

const isHosting = function (endpoint) {
	return !isPrefix(endpoint)
}

export const HOSTING: Endpoint[] = config.endpoints.filter(isHosting)
export const PREFIXES: Endpoint[] = config.endpoints.filter(isPrefix)
export const REGIONS: Region[] = config.regions
export const SERVICE_TYPES: string[] = ['enclosure', 'feed', 'prefix']

export const MONITORED = [...HOSTING, ...PREFIXES].reduce(
	(acc, cur) => {
		acc[cur.id] = cur
		return acc
	},
	{} as { [key: string]: Endpoint }
)

export const API_BASE_URL = config.base_url
