import { idempotencyKey } from '../utils/id.js'

const EVENTS_URI = 'content://com.android.calendar/events'
const REMINDERS_URI = 'content://com.android.calendar/reminders'
const CALENDARS_URI = 'content://com.android.calendar/calendars'

function isAndroidRuntime() { return typeof plus !== 'undefined' && !!plus.android }
function nativeUri(value) { const Uri = plus.android.importClass('android.net.Uri'); return Uri.parse(value) }
function put(values, key, value) {
  // String overload is stable across Android WebView/UTS bridges; CalendarProvider coerces numeric columns.
  plus.android.invoke(values, 'put', key, String(value))
}

export async function requestCalendarPermission() {
  try {
    if (!isAndroidRuntime() || !plus.android.requestPermissions) return true
    return await new Promise(resolve => plus.android.requestPermissions(['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR'], result => resolve(!(result?.deniedPresent?.length || result?.deniedAlways?.length)), () => resolve(false)))
  } catch (error) { return false }
}

export async function listCalendars() {
  if (!isAndroidRuntime()) return [{ id: 'default', name: '我的日历', writable: true }]
  try {
    const resolver = plus.android.runtimeMainActivity().getContentResolver()
    const cursor = plus.android.invoke(resolver, 'query', nativeUri(CALENDARS_URI), null, null, null, null)
    const calendars = []
    if (cursor) {
      const idIndex = plus.android.invoke(cursor, 'getColumnIndex', '_id')
      const nameIndex = plus.android.invoke(cursor, 'getColumnIndex', 'calendar_displayName')
      const accessIndex = plus.android.invoke(cursor, 'getColumnIndex', 'calendar_access_level')
      while (plus.android.invoke(cursor, 'moveToNext')) {
        const id = plus.android.invoke(cursor, 'getLong', idIndex)
        const name = plus.android.invoke(cursor, 'getString', nameIndex) || '系统日历'
        const access = accessIndex >= 0 ? plus.android.invoke(cursor, 'getInt', accessIndex) : 700
        if (access >= 500) calendars.push({ id: String(id), name, writable: true })
      }
      plus.android.invoke(cursor, 'close')
    }
    return calendars.length ? calendars : [{ id: 'default', name: '我的日历', writable: true }]
  } catch (error) { return [{ id: 'default', name: '我的日历', writable: true }] }
}

async function resolveCalendarId(calendarId) {
  if (calendarId && /^\d+$/.test(String(calendarId))) return Number(calendarId)
  const calendars = await listCalendars()
  const first = calendars.find(item => item.writable && /^\d+$/.test(String(item.id)))
  if (!first) throw Object.assign(new Error('没有可写入的系统日历'), { code: 'CALENDAR_WRITE_FAILED', retryable: false })
  return Number(first.id)
}

export async function createEvent(event, { calendarId = 'default', requestId = '' } = {}) {
  const key = await idempotencyKey(requestId, event.localId || event.id, calendarId)
  if (!isAndroidRuntime()) return { idempotencyKey: key, calendarId, systemEventId: `preview_${key.slice(0, 12)}`, writeTime: new Date().toISOString() }
  try {
    const resolver = plus.android.runtimeMainActivity().getContentResolver()
    const ContentValues = plus.android.importClass('android.content.ContentValues')
    const actualCalendarId = await resolveCalendarId(calendarId)
    const values = new ContentValues()
    const start = event.allDay ? new Date(`${event.date}T00:00:00`).getTime() : new Date(`${event.date}T${event.startTime || '09:00'}:00`).getTime()
    const end = event.allDay ? start + 24 * 60 * 60 * 1000 : new Date(`${event.date}T${event.endTime || '10:00'}:00`).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Invalid event time')
    put(values, 'calendar_id', actualCalendarId); put(values, 'title', String(event.title || '未命名事项')); put(values, 'dtstart', start); put(values, 'dtend', end); put(values, 'allDay', event.allDay ? 1 : 0); put(values, 'eventTimezone', event.timezone || 'Asia/Shanghai'); put(values, 'hasAlarm', event.reminder === '不提醒' ? 0 : 1)
    if (event.location) put(values, 'eventLocation', String(event.location))
    if (event.notes) put(values, 'description', String(event.notes))
    const uri = plus.android.invoke(resolver, 'insert', nativeUri(EVENTS_URI), values)
    if (!uri) throw new Error('CalendarProvider returned null URI')
    const systemEventId = String(plus.android.invoke(uri, 'getLastPathSegment') || '')
    if (!systemEventId) throw new Error('CalendarProvider returned empty event id')
    if (event.reminder !== '不提醒') {
      const reminderValues = new ContentValues(); put(reminderValues, 'event_id', Number(systemEventId)); put(reminderValues, 'minutes', 0); put(reminderValues, 'method', 1)
      plus.android.invoke(resolver, 'insert', nativeUri(REMINDERS_URI), reminderValues)
    }
    return { idempotencyKey: key, calendarId: String(actualCalendarId), systemEventId, writeTime: new Date().toISOString() }
  } catch (error) { throw Object.assign(new Error(`日历写入失败：${error?.message || String(error)}`), { code: 'CALENDAR_WRITE_FAILED', retryable: true, cause: error }) }
}

export function openSystemCalendar() { try { if (!isAndroidRuntime() || !plus.runtime?.openURL) return false; plus.runtime.openURL('content://com.android.calendar/time/'); return true } catch (error) { return false } }
