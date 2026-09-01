export function isoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateToken(token, now = new Date()) {
  if (!token) return null
  const date = new Date(now)
  if (token === '今天') return isoDate(date)
  if (token === '明天') date.setDate(date.getDate() + 1)
  else if (token === '后天') date.setDate(date.getDate() + 2)
  else {
    const match = token.match(/(\d{1,2})[月\/-](\d{1,2})/)
    if (!match) return null
    date.setMonth(Number(match[1]) - 1)
    date.setDate(Number(match[2]))
  }
  return isoDate(date)
}

export function addHours(time, hours) {
  const [hour, minute] = String(time).split(':').map(Number)
  const total = hour * 60 + minute + hours * 60
  const normalized = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

export function normalizeText(text) {
  return String(text || '').replace(/[\u200b\r]+/g, '').replace(/[，、]/g, ',').replace(/\s+/g, ' ').trim()
}
