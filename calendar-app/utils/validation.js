const IANA_TIMEZONE = /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/

export function validateEvent(event) {
  const errors = []
  if (!event || typeof event !== 'object') return ['EVENT_INVALID']
  if (!event.title || String(event.title).length > 200) errors.push('TITLE_INVALID')
  if (typeof event.confidence !== 'number' || event.confidence < 0 || event.confidence > 1) errors.push('CONFIDENCE_INVALID')
  if (event.timezone && !IANA_TIMEZONE.test(event.timezone)) errors.push('TIMEZONE_INVALID')
  if (!event.allDay && event.startTime && event.endTime && new Date(event.endTime).getTime() <= new Date(event.startTime).getTime()) errors.push('TIME_RANGE_INVALID')
  if (event.missingFields && !Array.isArray(event.missingFields)) errors.push('MISSING_FIELDS_INVALID')
  return errors
}

export function validateParseResult(result) {
  const errors = []
  if (!result || !Array.isArray(result.events) || !Array.isArray(result.warnings)) errors.push('MODEL_INVALID_JSON')
  if (result?.events?.length > 20) errors.push('EVENT_LIMIT_EXCEEDED')
  for (const event of result?.events || []) errors.push(...validateEvent(event))
  return [...new Set(errors)]
}

export function canCreateEvent(event) {
  return validateEvent(event).length === 0 && !(event.missingFields || []).length && !!event.date
}
