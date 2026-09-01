import { request } from './http.js'

export async function checkHealth() {
  try { return await request('/health', { auth: false, timeout: 3000, retry: false }) } catch (error) { return { api: 'offline', error: error.code || 'SERVER_UNREACHABLE' } }
}
