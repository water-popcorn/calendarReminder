import { request } from './http.js'
import { storage, STORAGE_KEYS } from './storage.js'
import { createRequestId } from '../utils/id.js'

export function getOutbox() { return storage.read(STORAGE_KEYS.outbox, []) || [] }
export function enqueue(change) { const outbox = getOutbox(); const entry = { id: change.id || createRequestId('change'), entityType: change.entityType || 'request', entityId: change.entityId || change.id, operation: change.operation || 'upsert', payload: change.payload, baseVersion: change.baseVersion || 0, retryCount: 0, nextRetryAt: Date.now(), lastError: null }; storage.write(STORAGE_KEYS.outbox, [...outbox, entry]); return entry }
export async function flushOutbox() { const pending = getOutbox(); const remaining = []; for (const item of pending) { try { await request('/sync/push', { method: 'POST', data: item, idempotencyKey: item.id }); } catch (error) { remaining.push({ ...item, retryCount: item.retryCount + 1, lastError: error.code || 'SERVER_UNREACHABLE', nextRetryAt: Date.now() + Math.min(16 * 60 * 1000, 2 ** item.retryCount * 60 * 1000) }) } } storage.write(STORAGE_KEYS.outbox, remaining); return remaining }
