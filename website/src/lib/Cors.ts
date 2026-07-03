import { CorsCheckResult } from '../types'

const TIMEOUT_MS = 10000

export async function checkCors(type: string, url: string): Promise<CorsCheckResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal
    })

    // If we got here, the browser already validated CORS across any
    // redirect chain — no need to inspect Access-Control-Allow-Origin ourselves.
    return {
      type,
      url,
      status: 'CORS_OK'
    }
  } catch (e) {
    return { type, url, status: 'CORS_KO' }
  } finally {
    clearTimeout(timer)
  }
}
