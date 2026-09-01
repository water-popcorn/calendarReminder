import { createRequestId } from '../utils/id.js'
import { addHours, isoDate, normalizeText, parseDateToken } from '../utils/time.js'
import { validateParseResult } from '../utils/validation.js'
import { request } from './http.js'

function extractEvents(text, { now = new Date(), timezone = 'Asia/Shanghai', reminder = '事件开始时', requestId = '' } = {}) {
  const source = normalizeText(text)
  const lines = source.split(/[\n。；;]+/).map(line => line.trim()).filter(Boolean).slice(0, 20)
  return (lines.length ? lines : [source]).map((line, index) => {
    const dateToken = line.match(/(今天|明天|后天|\d{1,2}[月\/-]\d{1,2}(?:日|号)?)/)?.[1]
    const timeToken = line.match(/(上午|下午|晚上|早上)?\s*(\d{1,2})(?:点|:\s?)(\d{1,2})?/) 
    const date = parseDateToken(dateToken, now) || isoDate(now)
    const hasExplicitDate = !!dateToken
    const rawHour = timeToken ? Number(timeToken[2]) : null
    const hour = rawHour === null ? null : rawHour + (/下午|晚上/.test(timeToken[1] || '') && rawHour < 12 ? 12 : 0)
    const startTime = hour === null ? null : `${String(hour).padStart(2, '0')}:${String(Number(timeToken[3] || 0)).padStart(2, '0')}`
    const location = line.match(/(?:地点|在)\s*([^，,。；;]+)/)?.[1]?.trim() || ''
    const title = line.replace(dateToken || '', '').replace(timeToken?.[0] || '', '').replace(/(?:地点|在)\s*([^，,。；;]+)/, '').trim() || '待办事项'
    const confidence = hasExplicitDate && hour !== null ? 0.93 : hasExplicitDate ? 0.76 : 0.58
    const localId = `${requestId || createRequestId('req')}_evt_${index}`
    return {
      localId,
      id: localId,
      title, date, anchorTime: startTime ? `${date}T${startTime}:00` : null,
      startTime, endTime: startTime ? addHours(startTime, 2) : null, dueTime: null,
      allDay: hour === null, timezone, location, notes: '', recurrence: null,
      confidence, missingFields: hasExplicitDate ? [] : ['日期'], userEdited: false,
      reminder, selected: true, status: 'PARSED', sourceText: line,
    }
  })
}

export function parseLocal(text, options = {}) {
  const normalizedOptions = { ...options, requestId: options.requestId || createRequestId(), now: options.now instanceof Date ? options.now : new Date(options.now || Date.now()) }
  const result = { requestId: normalizedOptions.requestId || createRequestId(), events: extractEvents(text, normalizedOptions), warnings: [], modelVersion: 'local-rule-1.0', serverTime: new Date().toISOString(), needsConfirmation: true }
  if (result.events.some(event => event.missingFields.length)) result.warnings.push('部分事项缺少完整日期，请确认后再创建。')
  const errors = validateParseResult(result)
  if (errors.length) throw Object.assign(new Error('解析结果校验失败'), { code: 'MODEL_INVALID_JSON', details: errors })
  return result
}

export async function parseText(body, { allowServer = false, signal } = {}) {
  const local = parseLocal(body.text, body)
  if (!allowServer) return local
  try {
    const server = await request('/parse', { method: 'POST', data: body, signal, idempotencyKey: body.requestId })
    const errors = validateParseResult(server)
    if (!errors.length) return { ...server, events: server.events.map((event, index) => ({ ...event, localId: event.localId || `${body.requestId}_evt_${index}`, id: event.id || event.localId || `${body.requestId}_evt_${index}`, date: event.date || event.startTime?.slice(0, 10) || null, selected: event.selected !== false, status: 'PARSED', missingFields: event.missingFields || [] })) }
  } catch (error) {
    // The local result is the supported offline fallback.
  }
  return local
}

export { extractEvents }
