import { createRequestId } from '../utils/id.js'
import { storage, STORAGE_KEYS } from './storage.js'

const RETRYABLE = new Set(['SERVER_UNREACHABLE', 'MODEL_UNAVAILABLE', 'MODEL_INVALID_JSON', 'CALENDAR_WRITE_FAILED'])
const API_PREFIX = '/api/v1'

export function isPrivateNetworkUrl(value) {
  try {
    const host = new URL(value).hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
    if (/^10\./.test(host) || /^192\.168\./.test(host)) return true
    const match = host.match(/^172\.(\d{1,2})\./)
    return !!(match && Number(match[1]) >= 16 && Number(match[1]) <= 31)
  } catch (error) { return false }
}

export class ApiError extends Error {
  constructor(code, message, retryable = false, status) { super(message); this.name = 'ApiError'; this.code = code; this.retryable = retryable; this.status = status }
}

function baseUrl() {
  const settings = storage.read(STORAGE_KEYS.settings, {}) || {}
  return settings.serverUrl || 'http://127.0.0.1:21512'
}

function uniRequest(options) {
  return new Promise((resolve, reject) => uni.request({ ...options, success: resolve, fail: reject }))
}

export async function request(path, options = {}) {
  const session = storage.read(STORAGE_KEYS.session, {}) || {}
  const requestId = options.idempotencyKey || createRequestId()
  const headers = { 'Content-Type': 'application/json', 'X-Request-Id': requestId, 'X-Timestamp': String(Date.now()), 'X-Nonce': createRequestId('nonce'), ...(options.header || {}) }
  if (session.accessToken && options.auth !== false) headers.Authorization = `Bearer ${session.accessToken}`
  if (session.deviceId) headers['X-Device-Id'] = session.deviceId
  const maxAttempts = options.retry === false ? 1 : 2
  let attempt = 0
  while (attempt < maxAttempts) {
    attempt += 1
    try {
      const response = await uniRequest({ ...options, url: `${baseUrl()}${API_PREFIX}${path}`, header: headers, timeout: options.timeout || 30000 })
      if (response.statusCode === 401 && options.auth !== false && session.refreshToken && !options._refreshAttempted) {
        try {
          const refreshed = await request('/auth/refresh', { method: 'POST', data: { refreshToken: session.refreshToken }, auth: false, retry: false, _refreshAttempted: true })
          storage.write(STORAGE_KEYS.session, { ...session, ...refreshed })
          return request(path, { ...options, _refreshAttempted: true })
        } catch (refreshError) {
          storage.remove(STORAGE_KEYS.session)
          throw new ApiError('AUTH_INVALID', '登录状态已失效，请重新登录', false, 401)
        }
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        const body = response.data || {}
        throw new ApiError(body.code || 'SERVER_UNREACHABLE', body.message || '电脑服务暂不可用', RETRYABLE.has(body.code), response.statusCode)
      }
      return response.data?.data ?? response.data
    } catch (error) {
      if (error instanceof ApiError && !error.retryable) throw error
      if (attempt >= maxAttempts) throw error instanceof ApiError ? error : new ApiError('SERVER_UNREACHABLE', '无法连接电脑服务', true)
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** (attempt - 1)))
    }
  }
}
