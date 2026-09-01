import { reactive } from 'vue'
import { createEvent, requestCalendarPermission } from '../native/calendar.js'
import { enqueue } from '../services/sync.js'
import { storage, STORAGE_KEYS } from '../services/storage.js'

export const draftStore = reactive({ requestId: '', events: [], status: 'DRAFT', mappings: {} })
export function setDraft(requestId, events) { draftStore.requestId = requestId; draftStore.events = events; draftStore.status = 'PARSED'; return draftStore }
export function updateEvent(localId, patch) { const event = draftStore.events.find(item => item.localId === localId || item.id === localId); if (event) Object.assign(event, patch, { userEdited: true }); return event }
export function saveDraft() { draftStore.status = 'DRAFT'; const item = { id: draftStore.requestId, title: draftStore.events[0]?.title || '未命名事项', status: 'DRAFT', events: draftStore.events, eventCount: draftStore.events.length, createdLabel: '刚刚' }; const history = storage.read(STORAGE_KEYS.history, []) || []; storage.write(STORAGE_KEYS.history, [item, ...history]); enqueue({ entityType: 'request', entityId: item.id, payload: item }); return item }
export async function createCalendarEvents(calendarId = 'default') { draftStore.status = 'CREATING'; const allowed = await requestCalendarPermission(); if (!allowed) throw Object.assign(new Error('日历权限被拒绝'), { code: 'CALENDAR_PERMISSION_DENIED' }); for (const event of draftStore.events.filter(item => item.selected !== false)) { const mapping = await createEvent(event, { calendarId, requestId: draftStore.requestId }); draftStore.mappings[event.localId || event.id] = mapping; event.status = 'CREATED' } draftStore.status = 'CREATED'; return draftStore.mappings }
