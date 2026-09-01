const memory = new Map()

function read(key, fallback = null) {
  try {
    const value = uni.getStorageSync(key)
    return value === '' || value === undefined ? fallback : value
  } catch (error) {
    return memory.has(key) ? memory.get(key) : fallback
  }
}

function write(key, value) {
  memory.set(key, value)
  try { uni.setStorageSync(key, value) } catch (error) { /* H5 preview or restricted storage */ }
}

function remove(key) {
  memory.delete(key)
  try { uni.removeStorageSync(key) } catch (error) {}
}

export const storage = { read, write, remove }
export const STORAGE_KEYS = { settings: 'calendar_settings', history: 'calendar_history', outbox: 'calendar_outbox', session: 'calendar_session' }
