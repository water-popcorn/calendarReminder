import { reactive } from 'vue'
import { login as loginRequest, logout as logoutRequest } from '../services/auth.js'
import { storage, STORAGE_KEYS } from '../services/storage.js'

export const sessionStore = reactive({ accessToken: '', refreshToken: '', userId: '', deviceId: '', authenticated: false })
export function hydrateSession() { Object.assign(sessionStore, storage.read(STORAGE_KEYS.session, {}) || {}); sessionStore.authenticated = !!sessionStore.accessToken; return sessionStore }
export async function login(credentials) { const result = await loginRequest(credentials); Object.assign(sessionStore, result, { authenticated: true }); return sessionStore }
export async function logout() { await logoutRequest(); Object.assign(sessionStore, { accessToken: '', refreshToken: '', userId: '', deviceId: '', authenticated: false }) }
export function clearSession() { storage.remove(STORAGE_KEYS.session); Object.assign(sessionStore, { accessToken: '', refreshToken: '', userId: '', deviceId: '', authenticated: false }) }
