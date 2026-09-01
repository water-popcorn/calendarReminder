import { createEvent, listCalendars, requestCalendarPermission } from '../native/calendar.js'

export async function createCalendarEvents(events, options = {}) {
  if (!(await requestCalendarPermission())) throw Object.assign(new Error('日历权限被拒绝'), { code: 'CALENDAR_PERMISSION_DENIED' })
  const mappings = []; const failures = []
  for (const event of events) {
    try { mappings.push({ event, mapping: await createEvent(event, options) }) } catch (error) { failures.push({ event, error }) }
  }
  return { mappings, failures }
}

export { listCalendars, requestCalendarPermission }
