import { request } from './http.js'
import { storage, STORAGE_KEYS } from './storage.js'

export const register = data => request('/auth/register', { method: 'POST', data, auth: false })
export const verifyEmail = data => request('/auth/verify-email', { method: 'POST', data, auth: false })
export const login = async data => { const session = await request('/auth/login', { method: 'POST', data, auth: false }); storage.write(STORAGE_KEYS.session, session); return session }
export const refresh = refreshToken => request('/auth/refresh', { method: 'POST', data: { refreshToken }, auth: false })
export const logout = async () => { try { await request('/auth/logout', { method: 'POST' }) } finally { storage.remove(STORAGE_KEYS.session) } }
