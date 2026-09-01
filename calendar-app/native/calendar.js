import { idempotencyKey } from '../utils/id.js'

export async function requestCalendarPermission() {
  try {
    if (typeof plus !== 'undefined' && plus.android?.requestPermissions) {
      return await new Promise(resolve => plus.android.requestPermissions(['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR'], result => resolve(!(result?.deniedPresent?.length || result?.deniedAlways?.length)), () => resolve(false)))
    }
    return true
  } catch (error) { return false }
}

export async function listCalendars() { return [{ id: 'default', name: '我的日历', writable: true }] }

export async function createEvent(event, { calendarId = 'default', requestId = '' } = {}) {
  const key = await idempotencyKey(requestId, event.localId || event.id, calendarId)
  try {
    if (typeof plus !== 'undefined' && plus.android) {
      const activity = plus.android.runtimeMainActivity()
      const ContentValues = plus.android.importClass('android.content.ContentValues')
      const Events = plus.android.importClass('android.provider.CalendarContract$Events')
      const Reminders = plus.android.importClass('android.provider.CalendarContract$Reminders')
      const values = new ContentValues()
      const start = new Date(`${event.date}T${event.startTime || '09:00'}:00`).getTime()
      const end = new Date(`${event.date}T${event.endTime || '10:00'}:00`).getTime()
      values.put('calendar_id', Number(calendarId) || 1)
      values.put('title', String(event.title || '未命名事项'))
      values.put('dtstart', Number(start)); values.put('dtend', Number(end))
      values.put('allDay', event.allDay ? 1 : 0); values.put('eventTimezone', event.timezone || 'Asia/Shanghai')
      if (event.location) values.put('eventLocation', String(event.location))
      if (event.notes) values.put('description', String(event.notes))
      values.put('hasAlarm', event.reminder === '不提醒' ? 0 : 1)
      const uri = activity.getContentResolver().insert(Events.CONTENT_URI, values)
      const systemEventId = uri ? String(uri.getLastPathSegment()) : ''
      if (!systemEventId) throw new Error('Calendar provider returned empty id')
      if (event.reminder !== '不提醒') {
        const reminderValues = new ContentValues(); reminderValues.put('event_id', Number(systemEventId)); reminderValues.put('minutes', 0); reminderValues.put('method', 1)
        activity.getContentResolver().insert(Reminders.CONTENT_URI, reminderValues)
      }
      return { idempotencyKey: key, calendarId, systemEventId, writeTime: new Date().toISOString() }
    }
    return { idempotencyKey: key, calendarId, systemEventId: `preview_${key.slice(0, 12)}`, writeTime: new Date().toISOString() }
  } catch (error) {
    throw Object.assign(new Error('日历写入失败'), { code: 'CALENDAR_WRITE_FAILED', retryable: true })
  }
}

export function openSystemCalendar() { try { if (typeof plus !== 'undefined' && plus.runtime?.openURL) plus.runtime.openURL('content://com.android.calendar/time/'); else return false; return true } catch (error) { return false } }
