import { request } from './http.js'
import { storage, STORAGE_KEYS } from './storage.js'

export const getRequest = id => request(`/requests/${encodeURIComponent(id)}`)
export function saveLocalRequest(requestData) { const requests = storage.read('calendar_requests', []) || []; const next = [requestData, ...requests.filter(item => item.requestId !== requestData.requestId)]; storage.write('calendar_requests', next.slice(0, 100)); return requestData }
export function getLocalRequest(id) { return (storage.read('calendar_requests', []) || []).find(item => item.requestId === id) || null }
